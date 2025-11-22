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
 * Account summary view model stored in DocumentStore.
 * This is the "snapshot" of the account's current state.
 */
export interface AccountSummary {
  accountNumber: string
  owner: string
  accountType: string
  balance: number
  transactionCount: number
  lastTransactionAt: string
  createdAt: string
  updatedAt: string
}

/**
 * Projects account events to AccountSummary views in DocumentStore.
 *
 * This projection creates and maintains account summary "snapshots" by:
 * 1. Reading events from the journal (via Projectable)
 * 2. Converting entries back to domain events (using EntryAdapterProvider)
 * 3. Updating the view in DocumentStore
 *
 * The DocumentStore entries ARE the snapshots - each write creates a new snapshot
 * of the account's current projected state.
 *
 * Events handled:
 * - AccountOpened: Creates initial summary
 * - FundsDeposited: Increases balance and transaction count
 * - FundsWithdrawn: Decreases balance and transaction count
 * - FundsRefunded: Increases balance and transaction count
 *
 * @example
 * ```typescript
 * const documentStore = new InMemoryDocumentStore()
 * const projectionProtocol: Protocol = {
 *   type: () => 'AccountSummaryProjection',
 *   instantiator: () => ({
 *     instantiate: (def: Definition) => {
 *       const [store] = def.parameters()
 *       return new AccountSummaryProjectionActor(store)
 *     }
 *   })
 * }
 *
 * const projection = stage().actorFor<Projection>(
 *   projectionProtocol,
 *   undefined,
 *   'projection-supervisor',
 *   undefined,
 *   documentStore
 * )
 *
 * dispatcher.register(new ProjectToDescription(
 *   projection,
 *   ['AccountOpened', 'FundsDeposited', 'FundsWithdrawn', 'FundsRefunded'],
 *   'Account summary view projection'
 * ))
 * ```
 */
export class AccountSummaryProjectionActor extends Actor implements Projection {
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
   * Project account events to summary views.
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
      // This handles schema evolution automatically
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
   * Handle AccountOpened event - create initial summary.
   */
  private async handleAccountOpened(event: any): Promise<void> {
    const summary: AccountSummary = {
      accountNumber: event.accountNumber,
      owner: event.owner,
      accountType: event.accountType || 'checking',
      balance: event.initialBalance || 0,
      transactionCount: 1,  // Opening counts as a transaction
      lastTransactionAt: event.openedAt.toISOString(),
      createdAt: event.openedAt.toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Write to DocumentStore - this IS the snapshot
    await this.documentStore.write(
      event.accountNumber,
      'AccountSummary',
      summary,
      1
    )
  }

  /**
   * Handle FundsDeposited event - update balance and transaction count.
   */
  private async handleFundsDeposited(event: any): Promise<void> {
    // Read current summary
    const readResult = await this.documentStore.read(
      event.accountNumber,
      'AccountSummary'
    )

    if (!readResult.outcome.success || !readResult.state) {
      throw new Error(`Account summary not found: ${event.accountNumber}`)
    }

    const summary = readResult.state as AccountSummary
    const currentVersion = readResult.stateVersion

    // Update summary
    const updated: AccountSummary = {
      ...summary,
      balance: summary.balance + event.amount,
      transactionCount: summary.transactionCount + 1,
      lastTransactionAt: event.depositedAt.toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Write updated snapshot with optimistic concurrency
    await this.documentStore.write(
      event.accountNumber,
      'AccountSummary',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Handle FundsWithdrawn event - update balance and transaction count.
   */
  private async handleFundsWithdrawn(event: any): Promise<void> {
    // Read current summary
    const readResult = await this.documentStore.read(
      event.accountNumber,
      'AccountSummary'
    )

    if (!readResult.outcome.success || !readResult.state) {
      throw new Error(`Account summary not found: ${event.accountNumber}`)
    }

    const summary = readResult.state as AccountSummary
    const currentVersion = readResult.stateVersion

    // Update summary
    const updated: AccountSummary = {
      ...summary,
      balance: summary.balance - event.amount,
      transactionCount: summary.transactionCount + 1,
      lastTransactionAt: event.withdrawnAt.toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Write updated snapshot
    await this.documentStore.write(
      event.accountNumber,
      'AccountSummary',
      updated,
      currentVersion + 1
    )
  }

  /**
   * Handle FundsRefunded event - update balance and transaction count.
   */
  private async handleFundsRefunded(event: any): Promise<void> {
    // Read current summary
    const readResult = await this.documentStore.read(
      event.accountNumber,
      'AccountSummary'
    )

    if (!readResult.outcome.success || !readResult.state) {
      throw new Error(`Account summary not found: ${event.accountNumber}`)
    }

    const summary = readResult.state as AccountSummary
    const currentVersion = readResult.stateVersion

    // Update summary
    const updated: AccountSummary = {
      ...summary,
      balance: summary.balance + event.amount,
      transactionCount: summary.transactionCount + 1,
      lastTransactionAt: event.refundedAt.toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Write updated snapshot
    await this.documentStore.write(
      event.accountNumber,
      'AccountSummary',
      updated,
      currentVersion + 1
    )
  }
}
