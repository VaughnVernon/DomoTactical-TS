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
  Supervised,
  Supervisor,
  stage,
  Protocol
} from 'domo-actors'

import { ApplyFailedError } from '../../model/ApplyFailedError.js'

/**
 * The default supervisor name for journal-backed actors.
 * Use this constant when creating actors that should be supervised by DefaultJournalSupervisor.
 */
export const DEFAULT_JOURNAL_SUPERVISOR = 'default-journal-supervisor'

/**
 * Creates and registers a DefaultJournalSupervisor actor with the standard name.
 *
 * This is a convenience function that creates the supervisor with the name
 * 'default-journal-supervisor'. Use DEFAULT_JOURNAL_SUPERVISOR constant when
 * creating actors that should be supervised by this supervisor.
 *
 * @returns The supervisor actor
 *
 * @example
 * ```typescript
 * import {
 *   defaultJournalSupervisor,
 *   DEFAULT_JOURNAL_SUPERVISOR,
 *   InMemoryJournal,
 *   Journal
 * } from 'domo-tactical'
 *
 * // Create the supervisor
 * defaultJournalSupervisor()
 *
 * // Create journal under this supervisor
 * const journal = stage().actorFor<Journal<string>>(
 *   journalProtocol,
 *   undefined,
 *   DEFAULT_JOURNAL_SUPERVISOR
 * )
 * ```
 */
export function defaultJournalSupervisor(): Supervisor {
  const protocol: Protocol = {
    type: () => DEFAULT_JOURNAL_SUPERVISOR,
    instantiator: () => ({
      instantiate: () => new DefaultJournalSupervisor()
    })
  }
  return stage().actorFor<Supervisor>(protocol, undefined, 'default')
}

/**
 * Default supervisor for Journal-backed actors (SourcedEntity instances).
 *
 * Provides comprehensive error handling for event/command sourced entities:
 * - Resume for business logic errors (validation failures, business rule violations)
 * - Resume for concurrency conflicts (optimistic locking violations)
 * - Restart for state corruption or internal consistency errors
 * - Stop for unrecoverable storage failures
 *
 * This supervisor implements the "let it crash" philosophy, allowing sourced
 * entities to fail gracefully while the system continues operating. It extracts
 * context from ApplyFailedError when available to provide detailed logging.
 *
 * @example
 * ```typescript
 * // Create the supervisor
 * const journalSupervisorProtocol: Protocol = {
 *   type: () => 'journal-supervisor',
 *   instantiator: () => ({
 *     instantiate: () => new DefaultJournalSupervisor()
 *   })
 * }
 * stage().actorFor(journalSupervisorProtocol, undefined, 'default')
 *
 * // Create sourced entities under this supervisor
 * const order = stage().actorFor<Order>(orderProtocol, undefined, 'journal-supervisor')
 * ```
 */
export class DefaultJournalSupervisor extends DefaultSupervisor {
  constructor() {
    super()
  }

  async inform(error: Error, supervised: Supervised): Promise<void> {
    const actorType = supervised.actor().type()
    const executionContext = supervised.actor().lifeCycle().environment().getCurrentMessageExecutionContext()

    // Extract context from ExecutionContext
    const operation = executionContext.getValue<string>('operation') || 'unknown'
    const streamName = executionContext.getValue<string>('streamName') || 'unknown'
    const entityId = executionContext.getValue<string>('entityId') || 'unknown'

    this.logger().log('**********************************************************************')
    this.logger().log(`*** Journal Supervisor on behalf of ${actorType}`)
    this.logger().log(`*** Operation: ${operation}`)
    this.logger().log(`*** Stream: ${streamName}`)
    this.logger().log(`*** Entity ID: ${entityId}`)

    // Extract additional context from ApplyFailedError if available
    if (error instanceof ApplyFailedError) {
      const applicable = error.applicable
      const sourceCount = applicable.sources.length
      const sourceTypes = applicable.sources.map(s => s.constructor.name).join(', ')
      const hasState = applicable.state !== null

      this.logger().log(`*** Sources: ${sourceCount} (${sourceTypes})`)
      this.logger().log(`*** Has Snapshot: ${hasState}`)
      if (applicable.metadata.hasOperation()) {
        this.logger().log(`*** Metadata Operation: ${applicable.metadata.operation}`)
      }
    }

    this.logger().log(`*** Error: ${error.message}`)
    if (error.stack) {
      this.logger().log(`*** Stack: ${error.stack}`)
    }
    if (error.cause) {
      this.logger().log(`*** Cause: ${(error.cause as Error).message}`)
    }
    this.logger().log('***')
    this.logger().log('**********************************************************************')

    await super.inform(error, supervised)
  }

  protected decideDirective(
    error: Error,
    _supervised: Supervised,
    _strategy: SupervisionStrategy
  ): SupervisionDirective {
    const message = error.message.toLowerCase()
    const errorName = error.name.toLowerCase()

    // Concurrency violations - Resume, the entity can retry
    if (message.includes('concurrency') ||
        message.includes('version conflict') ||
        message.includes('optimistic lock') ||
        errorName.includes('concurrency')) {
      return SupervisionDirective.Resume
    }

    // Business logic errors - Resume, these are expected
    if (message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('not found') ||
        message.includes('not allowed') ||
        message.includes('insufficient') ||
        message.includes('already exists') ||
        message.includes('duplicate')) {
      return SupervisionDirective.Resume
    }

    // State corruption - Restart to rebuild from event stream
    if (message.includes('corrupt') ||
        message.includes('inconsistent') ||
        message.includes('internal state') ||
        message.includes('state error')) {
      return SupervisionDirective.Restart
    }

    // Storage failures - Resume and let actor retry when storage recovers
    // The storage mechanism recovery is handled externally (k8s, admins, etc.)
    // and the journal will recover gracefully once storage is available again.
    // Stopping the actor would require a service restart to recover, which is
    // not desirable when the storage issue is transient or externally managed.
    if (message.includes('storage unavailable') ||
        message.includes('connection lost') ||
        message.includes('fatal')) {
      return SupervisionDirective.Resume
    }

    // Default: Resume to allow system to continue
    return SupervisionDirective.Resume
  }
}
