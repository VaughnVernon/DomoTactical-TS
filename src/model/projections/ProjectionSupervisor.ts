// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

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
