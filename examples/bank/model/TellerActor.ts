// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor, ActorProtocol, Protocol, Definition } from 'domo-actors'
import {
  AccountType,
  Bank,
  Teller,
  OpenAccountRequest,
  DepositRequest,
  WithdrawalRequest,
  TransferRequest,
  AccountSummaryRequest,
  TransactionHistoryRequest
} from './BankTypes'
import { QueryHandler } from '../queries/QueryHandler'

/**
 * Teller actor implementation (plain Actor, not event-sourced).
 *
 * Demonstrates "let it crash" philosophy and CQRS separation:
 * - Commands (writes) go through Bank actor
 * - Queries (reads) go through QueryHandler (reads from DocumentStore)
 * - Throws errors for invalid input (NaN, undefined, null, etc.)
 * - Supervisor catches errors and displays appropriate messages
 * - Actor continues processing after supervisor resumes it
 */
export class TellerActor extends Actor implements Teller {
  private queryHandler!: QueryHandler

  constructor(private bank: Bank) {
    super()
  }

  async openAccount(request: OpenAccountRequest): Promise<string> {
    const initialBalance = parseFloat(request.initialBalance)

    const accountType = request.accountType.toLowerCase()

    const type = accountType === 'savings' ? AccountType.Savings : AccountType.Checking

    const accountNumber = await this.bank.openAccount(request.owner.trim(), type, initialBalance)

    return `✅ Account opened successfully with account id: ${accountNumber}`
  }

  async deposit(request: DepositRequest): Promise<number> {
    const amount = parseFloat(request.amount)

    const balance = await this.bank.deposit(request.accountNumber, amount)

    return balance
  }

  async withdraw(request: WithdrawalRequest): Promise<number> {
    const amount = parseFloat(request.amount)

    const balance = await this.bank.withdraw(request.accountNumber, amount)

    return balance
  }

  async transfer(request: TransferRequest): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const amount = parseFloat(request.amount)

    return await this.bank.transfer(request.fromAccountNumber, request.toAccountNumber, amount)
  }

  async accountSummary(request: AccountSummaryRequest): Promise<string> {
    if (!request.accountNumber || request.accountNumber.trim() === '') {
      throw new Error('Account ID cannot be empty')
    }

    // Query from DocumentStore via QueryHandler (CQRS read side)
    const summary = await this.queryHandler.getAccountSummary(request.accountNumber.trim())
    if (!summary) {
      throw new Error(`Account not found: ${request.accountNumber}`)
    }

    return `
┌─────────────────────────────────────────────────────────
│ Account: ${summary.accountNumber.padEnd(24)}
├─────────────────────────────────────────────────────────
│ Owner:   ${summary.owner.padEnd(24)}
│ Type:    ${summary.accountType.padEnd(24)}
│ Balance: $${summary.balance.toFixed(2).padEnd(23)}
│ Transactions: ${summary.transactionCount.toString().padEnd(19)}
│ Last Transaction: ${new Date(summary.lastTransactionAt).toISOString().substring(0, 19).padEnd(9)}
│ Created: ${new Date(summary.createdAt).toISOString().substring(0, 19).padEnd(23)}
└─────────────────────────────────────────────────────────`
  }

  async transactionHistory(request: TransactionHistoryRequest): Promise<string> {
    if (!request.accountNumber || request.accountNumber.trim() === '') {
      throw new Error('Account ID cannot be empty')
    }

    const limit = request.limit ? parseInt(request.limit) : undefined
    if (request.limit && isNaN(limit!)) {
      throw new Error(`Invalid limit: "${request.limit}" is not a number`)
    }

    // Query from DocumentStore via QueryHandler (CQRS read side)
    const history = await this.queryHandler.getTransactionHistory(
      request.accountNumber.trim(),
      limit
    )

    if (!history || history.length === 0) {
      return 'No transactions found'
    }

    let result = `\nShowing ${history.length} transaction(s):\n\n`

    for (const tx of history) {
      result += `┌─────────────────────────────────────────────────────────\n`
      result += `│ ID:          ${tx.transactionId.padEnd(42)}\n`
      result += `│ Type:        ${tx.type.padEnd(42)}\n`
      result += `│ Amount:      $${tx.amount.toFixed(2).padEnd(41)}\n`
      result += `│ Balance:     $${tx.balance.toFixed(2).padEnd(41)}\n`
      result += `│ Timestamp:   ${new Date(tx.timestamp).toISOString().substring(0, 19).padEnd(42)}\n`
      result += `│ Description: ${tx.description.padEnd(42)}\n`
      result += `└─────────────────────────────────────────────────────────\n\n`
    }

    return result
  }

  async allAccounts(): Promise<string> {
    // Query from DocumentStore via QueryHandler (CQRS read side)
    const accounts = await this.queryHandler.getAllAccountSummaries()

    if (accounts.length === 0) {
      return 'No accounts found'
    }

    let result = `\nFound ${accounts.length} account(s):\n\n`

    for (const summary of accounts) {
      result += `┌─────────────────────────────────────────────────────────\n`
      result += `│ ${summary.accountNumber.padEnd(35)}\n`
      result += `│ Owner:   ${summary.owner.padEnd(25)}\n`
      result += `│ Type:    ${summary.accountType.padEnd(25)}\n`
      result += `│ Balance: $${summary.balance.toFixed(2).padEnd(24)}\n`
      result += `└─────────────────────────────────────────────────────────\n\n`
    }

    return result
  }

  async pendingTransfers(): Promise<string> {
    const pending = await this.bank.pendingTransfers()

    if (pending.length === 0) {
      return 'No pending transfers'
    }

    let result = `\nFound ${pending.length} pending transfer(s):\n\n`

    for (const transfer of pending) {
      result += `┌─────────────────────────────────────────────────────────\n`
      result += `│ Transaction: ${transfer.transactionId.padEnd(36)}\n`
      result += `│ From:        ${transfer.fromAccountNumber.padEnd(36)}\n`
      result += `│ To:          ${transfer.toAccountNumber.padEnd(36)}\n`
      result += `│ Amount:      $${transfer.amount.toFixed(2).padEnd(35)}\n`
      result += `│ Status:      ${transfer.status.padEnd(36)}\n`
      result += `│ Withdrawn:   ${transfer.withdrawnAt.toISOString().substring(0, 19).padEnd(36)}\n`
      result += `│ Attempts:    ${(transfer.attempts || 0).toString().padEnd(36)}\n`
      result += `└─────────────────────────────────────────────────────────\n\n`
    }

    return result
  }

  async bankStatistics(): Promise<string> {
    // Query from DocumentStore via QueryHandler (CQRS read side)
    const stats = await this.queryHandler.getBankStatistics()

    if (!stats) {
      return 'No statistics available yet'
    }

    return `
┌─────────────────────────────────────────────────────────
│ Bank Statistics
├─────────────────────────────────────────────────────────
│ Total Accounts:       ${stats.totalAccounts.toString().padEnd(25)}
│ Total Balance:        $${stats.totalBalance.toFixed(2).padEnd(24)}
│ Total Deposits:       $${stats.totalDeposits.toFixed(2).padEnd(24)}
│ Total Withdrawals:    $${stats.totalWithdrawals.toFixed(2).padEnd(24)}
│ Total Refunds:        $${stats.totalRefunds.toFixed(2).padEnd(24)}
│ Total Transactions:   ${stats.totalTransactions.toString().padEnd(25)}
├─────────────────────────────────────────────────────────
│ Accounts by Type:
│   Checking:           ${stats.accountsByType.checking.toString().padEnd(25)}
│   Savings:            ${stats.accountsByType.savings.toString().padEnd(25)}
├─────────────────────────────────────────────────────────
│ Last Updated:         ${new Date(stats.updatedAt).toISOString().substring(0, 19)}
└─────────────────────────────────────────────────────────`
  }

  async beforeStart(): Promise<void> {
    console.log(`Teller: Before Start: I am collaborating with: ${this.bank.type()}`)
    this.executionContext().collaborators([this.bank as ActorProtocol])

    // Create QueryHandler for read operations
    const queryProtocol: Protocol = {
      type: () => 'QueryHandler',
      instantiator: () => ({
        instantiate: () => new QueryHandler()
      })
    }

    this.queryHandler = this.childActorFor<QueryHandler>(
      queryProtocol,
      new Definition('QueryHandler', this.address(), []),
      'bank-supervisor'
    )
  }
}
