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

import {
  DefaultSupervisor,
  SupervisionDirective,
  SupervisionStrategy,
  Supervised
} from 'domo-actors'

/**
 * Supervisor for Projection and ProjectionDispatcher actors.
 *
 * Handles projection failures with appropriate recovery strategies:
 * - Resume for projection errors (allows projection to continue with next event)
 * - Restart for state corruption (rebuilds projection state)
 * - Stop for fatal errors
 *
 * This implements the "let it crash" philosophy where projections can fail
 * without bringing down the entire system. The supervisor decides the
 * appropriate recovery action.
 *
 * @example
 * ```typescript
 * // Create supervisor
 * const projectionSupervisorProtocol: Protocol = {
 *   type: () => 'projection-supervisor',
 *   instantiator: () => ({
 *     instantiate: () => new ProjectionSupervisor()
 *   })
 * }
 * stage().actorFor(projectionSupervisorProtocol, undefined, 'default')
 *
 * // Create projection dispatcher with this supervisor
 * const dispatcher = stage().actorFor<ProjectionDispatcher>(
 *   dispatcherProtocol,
 *   undefined,
 *   'projection-supervisor'
 * )
 * ```
 */
export class ProjectionSupervisor extends DefaultSupervisor {
  constructor() {
    super()
  }

  async inform(error: Error, supervised: Supervised): Promise<void> {
    // Access the ExecutionContext to get details about what was being projected
    const executionContext = supervised.actor().lifeCycle().environment().getCurrentMessageExecutionContext()
    const operation = executionContext.getValue<string>('operation') || 'unknown'
    const projectableId = executionContext.getValue<string>('projectableId') || 'unknown'

    this.logger().log('**********************************************************************')
    this.logger().log(`*** Projection Supervisor on behalf of ${supervised.actor().type()}`)
    this.logger().log(`*** Operation: ${operation}`)
    this.logger().log(`*** Projectable ID: ${projectableId}`)
    this.logger().log(`*** Error: ${error.message}`)
    this.logger().log(`*** Stack: ${error.stack}`)
    this.logger().log('***')
    this.logger().log('**********************************************************************')

    // Call parent to apply the directive
    await super.inform(error, supervised)
  }

  protected decideDirective(
    error: Error,
    _supervised: Supervised,
    _strategy: SupervisionStrategy
  ): SupervisionDirective {
    const message = error.message.toLowerCase()

    // Resume for business errors - let projection continue with next event
    if (message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('not found')) {
      return SupervisionDirective.Resume
    }

    // Restart for state corruption - rebuild projection state
    if (message.includes('corrupt') ||
        message.includes('inconsistent') ||
        message.includes('state')) {
      return SupervisionDirective.Restart
    }

    // Default: Resume to allow system to continue
    return SupervisionDirective.Resume
  }
}
