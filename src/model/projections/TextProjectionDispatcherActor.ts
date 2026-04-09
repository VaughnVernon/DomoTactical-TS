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

import { AbstractProjectionDispatcherActor } from './AbstractProjectionDispatcherActor.js'
import { Projectable } from './Projectable.js'
import { ProjectToDescription } from './ProjectToDescription.js'
import { ProjectionControl, BasicProjectionControl } from './ProjectionControl.js'
import { Confirmer } from './Confirmer.js'

/**
 * Text/JSON projection dispatcher Actor.
 *
 * Dispatches text-based Projectables to matching Projection Actors.
 * Handles confirmation tracking and provides ProjectionControl to projections.
 *
 * This is the primary ProjectionDispatcher implementation for CQRS systems
 * using text/JSON event serialization.
 *
 * Key differences from non-Actor BasicProjectionDispatcher:
 * - Extends Actor for message-driven dispatching
 * - Uses supervision instead of try-catch for error handling
 * - Integrates with Actor lifecycle and fault tolerance
 * - Supports Actor-based projections
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
 *       const [confirmer, descriptions] = def.parameters()
 *       return new TextProjectionDispatcherActor(confirmer, descriptions)
 *     }
 *   })
 * }
 *
 * const dispatcher = stage().actorFor<ProjectionDispatcher>(
 *   dispatcherProtocol,
 *   undefined,
 *   'projection-supervisor',
 *   undefined,
 *   confirmer,
 *   projectToDescriptions
 * )
 *
 * // Dispatch projectables
 * await dispatcher.dispatch(projectable)
 * ```
 */
export class TextProjectionDispatcherActor extends AbstractProjectionDispatcherActor {
  private readonly confirmer: Confirmer

  /**
   * Construct with confirmer and optional projection descriptions.
   *
   * @param confirmer the confirmer for tracking projectable confirmation
   * @param projectToDescriptions optional array of projection descriptions
   */
  constructor(
    confirmer: Confirmer,
    projectToDescriptions: ProjectToDescription[] = []
  ) {
    super()
    this.confirmer = confirmer

    if (projectToDescriptions.length > 0) {
      this.initializeWithDescriptions(projectToDescriptions)
    }
  }

  /**
   * Dispatch a text-based Projectable to all matching projections.
   *
   * This method:
   * 1. Marks the projectable as pending
   * 2. Finds all matching projections
   * 3. Sends projectWith message to each projection Actor
   * 4. Projections confirm via ProjectionControl
   *
   * NO try-catch - errors are handled by supervision.
   * If a projection fails, its supervisor decides the recovery action.
   *
   * @param projectable the projectable to dispatch
   */
  async dispatch(projectable: Projectable): Promise<void> {
    // Set execution context for supervisor
    this.executionContext()
      .setValue('operation', 'dispatch')
      .setValue('projectableId', projectable.dataId())

    // Mark as pending
    await this.confirmer.pending(projectable)

    // Find matching projections
    const projections = this.projectionsFor(...projectable.becauseOf())

    if (projections.length === 0) {
      // No projections matched - not an error, just return
      return
    }

    // Create projection control
    const control = this.createControl(projectable)

    // Dispatch to each projection
    // NO try-catch - supervision handles errors
    for (const projection of projections) {
      await projection.projectWith(projectable, control)
    }
  }

  /**
   * Create a ProjectionControl for a projectable.
   *
   * Override this method to provide custom control implementations.
   *
   * @param projectable the projectable being dispatched
   * @returns ProjectionControl the control instance
   */
  protected createControl(projectable: Projectable): ProjectionControl {
    return new BasicProjectionControl(this.confirmer)
  }
}
