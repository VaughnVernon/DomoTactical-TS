// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor, stage } from 'domo-actors'
import { Projection, Projectable, ProjectionControl } from 'domo-tactical'
import { DocumentStore } from 'domo-tactical/store/document'
import { EntryAdapterProvider } from 'domo-tactical/store'

/**
 * Transaction record in the history.
 */
export interface Transaction {
  transactionId: string
  type: 'deposit' | 'withdrawal' | 'refund' | 'opening'
  amount: number
  balance: number  // Balance after this transaction
  timestamp: string
  description: string
}

/**
 * Transaction history view model stored in DocumentStore.
 * Contains all transactions for an account.
 */
export interface TransactionHistory {
  accountNumber: string
  transactions: Transaction[]
  totalDeposits: number
  totalWithdrawals: number
  totalRefunds: number
  createdAt: string
  updatedAt: string
}

/**
 * Projects account events to TransactionHistory views in DocumentStore.
 *
 * This projection maintains a complete transaction history for each account.
 * Each event adds a new transaction to the history, creating an append-only
 * audit trail.
 *
 * The DocumentStore entry IS the snapshot of the complete transaction history.
 * Each update appends to the transactions array and creates a new snapshot.
 *
 * Events handled:
 * - AccountOpened: Creates initial history with opening transaction
 * - FundsDeposited: Appends deposit transaction
 * - FundsWithdrawn: Appends withdrawal transaction
 * - FundsRefunded: Appends refund transaction
 *
 * @example
 * ```typescript
 * dispatcher.register(new ProjectToDescription(
 *   projection,
 *   ['AccountOpened', 'FundsDeposited', 'FundsWithdrawn', 'FundsRefunded'],
 *   'Transaction history projection'
 * ))
 *
 * // Query transaction history
 * const result = await documentStore.read('ACC-123', 'TransactionHistory')
 * const history = result.document as TransactionHistory
 * console.log(`Total transactions: ${history.transactions.length}`)
 * ```
 */
export class TransactionHistoryProjectionActor extends Actor implements Projection {
  private readonly adapterProvider: EntryAdapterProvider
  private readonly documentStore: DocumentStore

  constructor() {
    super()
    this.adapterProvider = EntryAdapterProvider.getInstance()

    // Retrieve DocumentStore from Stage (similar to how SourcedEntity gets Journal)
    const store = stage().registeredValue<DocumentStore>('domo-tactical:bank.documentStore')
    if (!store) {
      throw new Error('DocumentStore not registered with Stage. Call stage().registerValue("domo-tactical:bank.documentStore", documentStore) first.')
    }
    this.documentStore = store
  }

  /**
   * Project account events to transaction history.
   *
   * @param projectable the projectable containing account events
   * @param control the projection control for confirmation
   */
  async projectWith(
    projectable: Projectable,
    control: ProjectionControl
  ): Promise<void> {
    // Set execution context for supervision
    this.executionContext()
      .setValue('operation', 'projectWith')
      .setValue('projectableId', projectable.dataId())

    const entries = projectable.entries()

    for (const entry of entries) {
      // Use adapter provider to convert entry back to domain event
      const event = this.adapterProvider.asSource(entry)
      const typeName = event.typeName()

      if (typeName === 'AccountOpened') {
        await this.handleAccountOpened(event as any)
      } else if (typeName === 'FundsDeposited') {
        await this.handleFundsDeposited(event as any)
      } else if (typeName === 'FundsWithdrawn') {
        await this.handleFundsWithdrawn(event as any)
      } else if (typeName === 'FundsRefunded') {
        await this.handleFundsRefunded(event as any)
      }
    }

    // Confirm projection completed
    control.confirmProjected(projectable)
  }

  /**
   * Handle AccountOpened event - create initial history with opening transaction.
   */
  private async handleAccountOpened(event: any): Promise<void> {
    const openingTransaction: Transaction = {
      transactionId: event.id(),
      type: 'opening',
      amount: event.initialBalance || 0,
      balance: event.initialBalance || 0,
      timestamp: event.openedAt.toISOString(),
      description: `Account opened for ${event.owner}`
    }

    const history: TransactionHistory = {
      accountNumber: event.accountNumber,
      transactions: [openingTransaction],
      totalDeposits: event.initialBalance || 0,
      totalWithdrawals: 0,
      totalRefunds: 0,
      createdAt: event.openedAt.toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Write initial history snapshot
    await this.documentStore.write(
      event.accountNumber,
      'TransactionHistory',
      history,
      1
    )
  }

  /**
   * Handle FundsDeposited event - append deposit transaction.
   */
  private async handleFundsDeposited(event: any): Promise<void> {
    // Read current history
    const readResult = await this.documentStore.read(
      event.accountNumber,
      'TransactionHistory'
    )

    if (!readResult.outcome.success || !readResult.state) {
      throw new Error(`Transaction history not found: ${event.accountNumber}`)
    }

    const history = readResult.state as TransactionHistory
    const currentVersion = readResult.stateVersion

    // Calculate new balance
    const previousBalance = history.transactions.length > 0
      ? history.transactions[history.transactions.length - 1].balance
      : 0
    const newBalance = previousBalance + event.amount

    // Create deposit transaction
    const depositTransaction: Transaction = {
      transactionId: event.transactionId || event.id(),
      type: 'deposit',
      amount: event.amount,
      balance: newBalance,
      timestamp: event.depositedAt.toISOString(),
      description: `Deposit of $${event.amount}`
    }

    // Append transaction and update totals
    const updated: TransactionHistory = {
      ...history,
      transactions: [...history.transactions, depositTransaction],
      totalDeposits: history.totalDeposits + event.amount,
      updatedAt: new Date().toISOString()
    }

    // Write updated history snapshot
    await this.documentStore.write(
      event.accountNumber,
      'TransactionHistory',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Handle FundsWithdrawn event - append withdrawal transaction.
   */
  private async handleFundsWithdrawn(event: any): Promise<void> {
    // Read current history
    const readResult = await this.documentStore.read(
      event.accountNumber,
      'TransactionHistory'
    )

    if (!readResult.outcome.success || !readResult.state) {
      throw new Error(`Transaction history not found: ${event.accountNumber}`)
    }

    const history = readResult.state as TransactionHistory
    const currentVersion = readResult.stateVersion

    // Calculate new balance
    const previousBalance = history.transactions.length > 0
      ? history.transactions[history.transactions.length - 1].balance
      : 0
    const newBalance = previousBalance - event.amount

    // Create withdrawal transaction
    const withdrawalTransaction: Transaction = {
      transactionId: event.transactionId || event.id(),
      type: 'withdrawal',
      amount: event.amount,
      balance: newBalance,
      timestamp: event.withdrawnAt.toISOString(),
      description: `Withdrawal of $${event.amount}`
    }

    // Append transaction and update totals
    const updated: TransactionHistory = {
      ...history,
      transactions: [...history.transactions, withdrawalTransaction],
      totalWithdrawals: history.totalWithdrawals + event.amount,
      updatedAt: new Date().toISOString()
    }

    // Write updated history snapshot
    await this.documentStore.write(
      event.accountNumber,
      'TransactionHistory',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Handle FundsRefunded event - append refund transaction.
   */
  private async handleFundsRefunded(event: any): Promise<void> {
    // Read current history
    const readResult = await this.documentStore.read(
      event.accountNumber,
      'TransactionHistory'
    )

    if (!readResult.outcome.success || !readResult.state) {
      throw new Error(`Transaction history not found: ${event.accountNumber}`)
    }

    const history = readResult.state as TransactionHistory
    const currentVersion = readResult.stateVersion

    // Calculate new balance
    const previousBalance = history.transactions.length > 0
      ? history.transactions[history.transactions.length - 1].balance
      : 0
    const newBalance = previousBalance + event.amount

    // Create refund transaction
    const refundTransaction: Transaction = {
      transactionId: event.id(),
      type: 'refund',
      amount: event.amount,
      balance: newBalance,
      timestamp: event.refundedAt.toISOString(),
      description: `Refund of $${event.amount} - ${event.reason}`
    }

    // Append transaction and update totals
    const updated: TransactionHistory = {
      ...history,
      transactions: [...history.transactions, refundTransaction],
      totalRefunds: history.totalRefunds + event.amount,
      updatedAt: new Date().toISOString()
    }

    // Write updated history snapshot
    await this.documentStore.write(
      event.accountNumber,
      'TransactionHistory',
      updated,
      currentVersion + 1
    )
  }
}
