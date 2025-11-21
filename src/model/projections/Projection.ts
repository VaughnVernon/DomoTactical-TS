// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Projectable } from './Projectable'
import { ProjectionControl } from './ProjectionControl'

/**
 * Protocol for all Projection implementations.
 *
 * A Projection receives Projectables (events/state) and projects them to query model views.
 * This is the core abstraction for CQRS read-side projections.
 *
 * Projections typically:
 * 1. Extract data from the Projectable
 * 2. Update a query model view (e.g., in a DocumentStore)
 * 3. Confirm projection via ProjectionControl
 *
 * Projections are typically implemented as Actors to leverage:
 * - Asynchronous processing
 * - Mailbox-based message ordering
 * - Supervision and fault tolerance
 * - Backpressure management
 *
 * @example
 * ```typescript
 * class AccountSummaryProjection implements Projection {
 *   constructor(private readonly documentStore: DocumentStore) {}
 *
 *   async projectWith(
 *     projectable: Projectable,
 *     control: ProjectionControl
 *   ): Promise<void> {
 *     try {
 *       // Extract event data
 *       const entries = projectable.entries()
 *
 *       for (const entry of entries) {
 *         // Process each event
 *         if (entry.type === 'AccountOpened') {
 *           await this.handleAccountOpened(entry)
 *         }
 *       }
 *
 *       // Confirm successful projection
 *       control.confirmProjected(projectable)
 *     } catch (error) {
 *       // Report error for retry/handling
 *       control.error(error as Error)
 *     }
 *   }
 * }
 * ```
 */
export interface Projection {
  /**
   * Project the given Projectable to a query model view.
   *
   * This method is called by the ProjectionDispatcher when a Projectable
   * matches this projection's criteria (via ProjectToDescription).
   *
   * Implementations should:
   * 1. Extract and process data from the Projectable
   * 2. Update the query model (typically via DocumentStore)
   * 3. Call control.confirmProjected() on success
   * 4. Call control.error() on failure
   *
   * The ProjectionControl manages confirmation tracking and error handling,
   * enabling retry logic and failure recovery.
   *
   * @param projectable the state/events to project
   * @param control manages confirmation and error handling
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * async projectWith(
   *   projectable: Projectable,
   *   control: ProjectionControl
   * ): Promise<void> {
   *   const event = projectable.object<AccountOpened>()
   *
   *   const summary = {
   *     accountId: event.accountId,
   *     owner: event.owner,
   *     balance: event.initialBalance
   *   }
   *
   *   await this.documentStore.write(
   *     event.accountId,
   *     'AccountSummary',
   *     summary,
   *     1
   *   )
   *
   *   control.confirmProjected(projectable)
   * }
   * ```
   */
  projectWith(projectable: Projectable, control: ProjectionControl): Promise<void>
}
