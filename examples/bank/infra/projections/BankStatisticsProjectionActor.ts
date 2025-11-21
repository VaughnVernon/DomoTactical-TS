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
 * Bank-wide statistics view model.
 * Aggregates statistics across all accounts.
 */
export interface BankStatistics {
  totalAccounts: number
  totalBalance: number
  totalDeposits: number
  totalWithdrawals: number
  totalRefunds: number
  totalTransactions: number
  accountsByType: {
    checking: number
    savings: number
  }
  accountNumbers: string[]  // List of all account numbers for querying
  createdAt: string
  updatedAt: string
}

/**
 * Projects account events to bank-wide statistics.
 *
 * This projection demonstrates aggregating across multiple entities.
 * Instead of maintaining per-account views, it maintains a single
 * bank-wide statistics document.
 *
 * The DocumentStore entry for 'bank-stats' IS the snapshot of
 * aggregated statistics across all accounts.
 *
 * Events handled:
 * - AccountOpened: Increments account count, updates balance
 * - FundsDeposited: Updates total deposits and balance
 * - FundsWithdrawn: Updates total withdrawals and balance
 * - FundsRefunded: Updates total refunds and balance
 *
 * @example
 * ```typescript
 * dispatcher.register(new ProjectToDescription(
 *   statsProjection,
 *   ['AccountOpened', 'FundsDeposited', 'FundsWithdrawn', 'FundsRefunded'],
 *   'Bank statistics projection'
 * ))
 *
 * // Query bank statistics
 * const result = await documentStore.read('bank-stats', 'BankStatistics')
 * const stats = result.document as BankStatistics
 * console.log(`Total accounts: ${stats.totalAccounts}`)
 * console.log(`Total balance: $${stats.totalBalance}`)
 * ```
 */
export class BankStatisticsProjectionActor extends Actor implements Projection {
  private readonly adapterProvider: EntryAdapterProvider
  private readonly documentStore: DocumentStore
  private readonly STATS_ID = 'bank-stats'

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
   * Project account events to bank statistics.
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
   * Handle AccountOpened event - update account count and balance.
   */
  private async handleAccountOpened(event: any): Promise<void> {
    const stats = await this.getOrCreateStatistics()
    const currentVersion = stats.version

    const accountType = event.accountType || 'checking'
    const initialBalance = event.initialBalance || 0

    const updated: BankStatistics = {
      ...stats.data,
      totalAccounts: stats.data.totalAccounts + 1,
      totalBalance: stats.data.totalBalance + initialBalance,
      // Initial balance counts as a deposit
      totalDeposits: stats.data.totalDeposits + initialBalance,
      accountsByType: {
        checking: accountType === 'checking'
          ? stats.data.accountsByType.checking + 1
          : stats.data.accountsByType.checking,
        savings: accountType === 'savings'
          ? stats.data.accountsByType.savings + 1
          : stats.data.accountsByType.savings
      },
      accountNumbers: [...stats.data.accountNumbers, event.accountNumber],
      updatedAt: new Date().toISOString()
    }

    // Write updated statistics snapshot
    await this.documentStore.write(
      this.STATS_ID,
      'BankStatistics',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Handle FundsDeposited event - update deposits and balance.
   */
  private async handleFundsDeposited(event: any): Promise<void> {
    const stats = await this.getOrCreateStatistics()
    const currentVersion = stats.version

    const updated: BankStatistics = {
      ...stats.data,
      totalBalance: stats.data.totalBalance + event.amount,
      totalDeposits: stats.data.totalDeposits + event.amount,
      totalTransactions: stats.data.totalTransactions + 1,
      updatedAt: new Date().toISOString()
    }

    // Write updated statistics snapshot
    await this.documentStore.write(
      this.STATS_ID,
      'BankStatistics',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Handle FundsWithdrawn event - update withdrawals and balance.
   */
  private async handleFundsWithdrawn(event: any): Promise<void> {
    const stats = await this.getOrCreateStatistics()
    const currentVersion = stats.version

    const updated: BankStatistics = {
      ...stats.data,
      totalBalance: stats.data.totalBalance - event.amount,
      totalWithdrawals: stats.data.totalWithdrawals + event.amount,
      totalTransactions: stats.data.totalTransactions + 1,
      updatedAt: new Date().toISOString()
    }

    // Write updated statistics snapshot
    await this.documentStore.write(
      this.STATS_ID,
      'BankStatistics',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Handle FundsRefunded event - update refunds and balance.
   */
  private async handleFundsRefunded(event: any): Promise<void> {
    const stats = await this.getOrCreateStatistics()
    const currentVersion = stats.version

    const updated: BankStatistics = {
      ...stats.data,
      totalBalance: stats.data.totalBalance + event.amount,
      totalRefunds: stats.data.totalRefunds + event.amount,
      totalTransactions: stats.data.totalTransactions + 1,
      updatedAt: new Date().toISOString()
    }

    // Write updated statistics snapshot
    await this.documentStore.write(
      this.STATS_ID,
      'BankStatistics',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Get existing statistics or create initial snapshot.
   */
  private async getOrCreateStatistics(): Promise<{
    data: BankStatistics
    version: number
  }> {
    const readResult = await this.documentStore.read(
      this.STATS_ID,
      'BankStatistics'
    )

    if (readResult.outcome.success && readResult.state) {
      return {
        data: readResult.state as BankStatistics,
        version: readResult.stateVersion
      }
    }

    // Create initial statistics snapshot
    const initial: BankStatistics = {
      totalAccounts: 0,
      totalBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalRefunds: 0,
      totalTransactions: 0,
      accountsByType: {
        checking: 0,
        savings: 0
      },
      accountNumbers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.documentStore.write(
      this.STATS_ID,
      'BankStatistics',
      initial,
      1
    )

    return {
      data: initial,
      version: 1
    }
  }
}
