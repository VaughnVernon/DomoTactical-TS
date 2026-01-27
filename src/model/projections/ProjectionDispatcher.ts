// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { ActorProtocol } from 'domo-actors'
import { Projectable } from './Projectable'
import { ProjectToDescription } from './ProjectToDescription'

/**
 * Dispatches Projectables to matching Projections.
 *
 * ProjectionDispatcher extends ActorProtocol, meaning implementations must be Actors.
 *
 * The ProjectionDispatcher is the central hub in the CQRS projection pipeline:
 * 1. Receives Projectables (events/state) from a journal consumer
 * 2. Matches them to registered Projections using patterns
 * 3. Dispatches to all matching projections
 * 4. Manages confirmation and error handling
 *
 * This enables:
 * - Decoupled event producers and projection consumers
 * - Multiple projections handling the same events
 * - Pattern-based routing (wildcards, prefixes)
 * - At-least-once delivery semantics via confirmation
 *
 * Concrete implementations:
 * - TextProjectionDispatcherActor: For text/JSON-based projections (standard)
 * - BinaryProjectionDispatcherActor: For binary-based projections (future)
 *
 * @example
 * ```typescript
 * // Create supervisor
 * const supervisorProtocol: Protocol = {
 *   type: () => 'projection-supervisor',
 *   instantiator: () => ({ instantiate: () => new ProjectionSupervisor() })
 * }
 * stage().actorFor(supervisorProtocol, undefined, 'default')
 *
 * // Create dispatcher
 * const dispatcherProtocol: Protocol = {
 *   type: () => 'TextProjectionDispatcher',
 *   instantiator: () => ({
 *     instantiate: (def: Definition) => {
 *       const [confirmer] = def.parameters()
 *       return new TextProjectionDispatcherActor(confirmer)
 *     }
 *   })
 * }
 *
 * const dispatcher = stage().actorFor<ProjectionDispatcher>(
 *   dispatcherProtocol,
 *   undefined,
 *   'projection-supervisor',
 *   undefined,
 *   confirmer
 * )
 *
 * // Register projections
 * dispatcher.register(new ProjectToDescription(
 *   accountProjection,
 *   ['AccountOpened', 'FundsDeposited'],
 *   'Account summary view'
 * ))
 *
 * // Dispatch events
 * await dispatcher.dispatch(projectable)
 * ```
 */
export interface ProjectionDispatcher extends ActorProtocol {
  /**
   * Dispatch projectable to all matching projections.
   *
   * This method:
   * 1. Finds all projections matching the projectable's reasons
   * 2. Creates a ProjectionControl for confirmation tracking
   * 3. Calls projectWith() on each matching projection
   * 4. Errors are handled by Actor supervision
   *
   * @param projectable the projectable to dispatch
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * const projectable = new TextProjectable(
   *   null,
   *   [accountOpenedEntry],
   *   'AccountOpened'
   * )
   *
   * await dispatcher.dispatch(projectable)
   * ```
   */
  dispatch(projectable: Projectable): Promise<void>

  /**
   * Register a projection for automatic dispatching.
   *
   * The projection will receive Projectables whose becauseOf reasons
   * match any of the patterns in the description.
   *
   * @param description the ProjectToDescription defining matching criteria
   *
   * @example
   * ```typescript
   * dispatcher.register(new ProjectToDescription(
   *   new AccountSummaryProjection(store),
   *   ['Account*'],
   *   'All account events'
   * ))
   * ```
   */
  register(description: ProjectToDescription): void

  /**
   * Answer the count of registered projections.
   * Useful for testing and introspection.
   *
   * @returns Promise<number> the count of registered projections
   */
  projectionCount(): Promise<number>

  /**
   * Answer all registered projection descriptions.
   * Useful for testing and introspection.
   *
   * @returns Promise<ProjectToDescription[]> all registered descriptions
   */
  allDescriptions(): Promise<ProjectToDescription[]>
}
