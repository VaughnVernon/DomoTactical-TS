// Copyright © 2012-2026 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2026 Kalele, Inc. All rights reserved.
//
// See: LICENSE.md in repository root directory
//
// This file is part of DomoTactical-TS.
//
// DomoTactical-TS is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of
// the License, or (at your option) any later version.
//
// DomoTactical-TS is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with DomoTactical-TS. If not, see <https://www.gnu.org/licenses/>.

import { Actor, stage } from 'domo-actors'
import { DocumentStore } from 'domo-tactical/store/document'
import {
  AccountSummary
} from '../infra/projections/AccountSummaryProjectionActor'
import {
  TransactionHistory,
  Transaction
} from '../infra/projections/TransactionHistoryProjectionActor'
import {
  BankStatistics
} from '../infra/projections/BankStatisticsProjectionActor'

/**
 * QueryHandler provides read-only access to projection views.
 *
 * This actor implements the Query side of CQRS by reading from
 * DocumentStore where projections maintain denormalized views.
 *
 * It retrieves DocumentStore from Stage (just like projections do)
 * and provides convenient query methods for common read operations.
 */
export class QueryHandler extends Actor {
  private readonly documentStore: DocumentStore

  constructor() {
    super()

    // Retrieve DocumentStore from Stage (same as projections)
    const store = stage().registeredValue<DocumentStore>('domo-tactical:bank.documentStore')
    if (!store) {
      throw new Error('DocumentStore not registered with Stage. Call stage().registerValue("domo-tactical:bank.documentStore", documentStore) first.')
    }
    this.documentStore = store
  }

  /**
   * Query account summary for a specific account.
   *
   * @param accountNumber the account number to query
   * @returns AccountSummary or undefined if not found
   */
  async getAccountSummary(accountNumber: string): Promise<AccountSummary | undefined> {
    this.executionContext()
      .setValue('operation', 'getAccountSummary')
      .setValue('accountNumber', accountNumber)

    const result = await this.documentStore.read(accountNumber, 'AccountSummary')

    if (!result.outcome.success || !result.state) {
      return undefined
    }

    return result.state as AccountSummary
  }

  /**
   * Query transaction history for a specific account.
   *
   * @param accountNumber the account number to query
   * @param limit optional limit on number of transactions to return
   * @returns TransactionHistory or undefined if not found
   */
  async getTransactionHistory(
    accountNumber: string,
    limit?: number
  ): Promise<Transaction[] | undefined> {
    this.executionContext()
      .setValue('operation', 'getTransactionHistory')
      .setValue('accountNumber', accountNumber)
      .setValue('limit', limit || 'all')

    const result = await this.documentStore.read(accountNumber, 'TransactionHistory')

    if (!result.outcome.success || !result.state) {
      return undefined
    }

    const history = result.state as TransactionHistory

    // Apply limit if specified
    if (limit && limit > 0) {
      return history.transactions.slice(-limit).reverse()
    }

    // Return all transactions, newest first
    return [...history.transactions].reverse()
  }

  /**
   * Query bank-wide statistics.
   *
   * @returns BankStatistics or undefined if not yet created
   */
  async getBankStatistics(): Promise<BankStatistics | undefined> {
    this.executionContext()
      .setValue('operation', 'getBankStatistics')

    const result = await this.documentStore.read('bank-stats', 'BankStatistics')

    if (!result.outcome.success || !result.state) {
      return undefined
    }

    return result.state as BankStatistics
  }

  /**
   * Query all account summaries.
   *
   * Uses BankStatistics to get list of account numbers, then batch-reads
   * all AccountSummaries from DocumentStore.
   *
   * @returns Array of AccountSummary objects
   */
  async getAllAccountSummaries(): Promise<AccountSummary[]> {
    this.executionContext()
      .setValue('operation', 'getAllAccountSummaries')

    // First, get the list of account numbers from BankStatistics
    const stats = await this.getBankStatistics()
    if (!stats || stats.accountNumbers.length === 0) {
      return []
    }

    // Build DocumentBundle array for batch read
    const bundles = stats.accountNumbers.map(accountNumber => ({
      id: accountNumber,
      type: 'AccountSummary'
    }))

    // Batch read all account summaries
    const result = await this.documentStore.readAll(bundles)

    if (!result.outcome.success) {
      return []
    }

    // Extract the state from each bundle
    return result.bundles
      .filter(bundle => bundle.state !== undefined)
      .map(bundle => bundle.state as AccountSummary)
  }
}
