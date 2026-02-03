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

/**
 * The default supervisor name for document store-backed actors.
 * Use this constant when creating actors that should be supervised by DefaultDocumentStoreSupervisor.
 */
export const DEFAULT_DOCUMENT_STORE_SUPERVISOR = 'default-document-store-supervisor'

/**
 * Creates and registers a DefaultDocumentStoreSupervisor actor with the standard name.
 *
 * This is a convenience function that creates the supervisor with the name
 * 'default-document-store-supervisor'. Use DEFAULT_DOCUMENT_STORE_SUPERVISOR constant
 * when creating actors that should be supervised by this supervisor.
 *
 * @returns The supervisor actor
 *
 * @example
 * ```typescript
 * import {
 *   defaultDocumentStoreSupervisor,
 *   DEFAULT_DOCUMENT_STORE_SUPERVISOR,
 *   InMemoryDocumentStore,
 *   DocumentStore
 * } from 'domo-tactical'
 *
 * // Create the supervisor
 * defaultDocumentStoreSupervisor()
 *
 * // Create document store under this supervisor
 * const documentStore = stage().actorFor<DocumentStore>(
 *   documentStoreProtocol,
 *   undefined,
 *   DEFAULT_DOCUMENT_STORE_SUPERVISOR
 * )
 * ```
 */
export function defaultDocumentStoreSupervisor(): Supervisor {
  const protocol: Protocol = {
    type: () => DEFAULT_DOCUMENT_STORE_SUPERVISOR,
    instantiator: () => ({
      instantiate: () => new DefaultDocumentStoreSupervisor()
    })
  }
  return stage().actorFor<Supervisor>(protocol, undefined, 'default')
}

/**
 * The default supervisor name for projection actors.
 * Use this constant when creating projection actors that should be supervised
 * by the default projection supervisor.
 */
export const DEFAULT_PROJECTION_SUPERVISOR = 'default-projection-supervisor'

/**
 * Creates and registers a projection supervisor actor with the standard name.
 *
 * This creates a DefaultDocumentStoreSupervisor with the name 'default-projection-supervisor'.
 * Use DEFAULT_PROJECTION_SUPERVISOR constant when creating projection actors.
 *
 * @returns The supervisor actor
 *
 * @example
 * ```typescript
 * import {
 *   defaultProjectionSupervisor,
 *   DEFAULT_PROJECTION_SUPERVISOR,
 *   Projection
 * } from 'domo-tactical'
 *
 * // Create the supervisor
 * defaultProjectionSupervisor()
 *
 * // Create projections under this supervisor
 * const projection = stage().actorFor<Projection>(
 *   projectionProtocol,
 *   undefined,
 *   DEFAULT_PROJECTION_SUPERVISOR
 * )
 * ```
 */
export function defaultProjectionSupervisor(): Supervisor {
  const protocol: Protocol = {
    type: () => DEFAULT_PROJECTION_SUPERVISOR,
    instantiator: () => ({
      instantiate: () => new DefaultDocumentStoreSupervisor()
    })
  }
  return stage().actorFor<Supervisor>(protocol, undefined, 'default')
}

/**
 * Default supervisor for DocumentStore-backed actors (stateful entities, projections).
 *
 * Provides comprehensive error handling for document-based storage:
 * - Resume for business logic errors (validation failures, not found)
 * - Resume for concurrency conflicts (optimistic locking violations)
 * - Restart for state corruption or serialization errors
 * - Stop for unrecoverable storage failures
 *
 * This supervisor is designed for actors that persist state directly to a
 * document store rather than using event sourcing. It handles the unique
 * concerns of document storage such as serialization errors and schema
 * mismatches.
 *
 * @example
 * ```typescript
 * // Create the supervisor
 * const documentStoreSupervisorProtocol: Protocol = {
 *   type: () => 'document-store-supervisor',
 *   instantiator: () => ({
 *     instantiate: () => new DefaultDocumentStoreSupervisor()
 *   })
 * }
 * stage().actorFor(documentStoreSupervisorProtocol, undefined, 'default')
 *
 * // Create document-backed actors under this supervisor
 * const projection = stage().actorFor<UserProjection>(
 *   projectionProtocol,
 *   undefined,
 *   'document-store-supervisor'
 * )
 * ```
 */
export class DefaultDocumentStoreSupervisor extends DefaultSupervisor {
  constructor() {
    super()
  }

  async inform(error: Error, supervised: Supervised): Promise<void> {
    const actorType = supervised.actor().type()
    const executionContext = supervised.actor().lifeCycle().environment().getCurrentMessageExecutionContext()

    // Extract context from ExecutionContext
    const operation = executionContext.getValue<string>('operation') || 'unknown'
    const documentId = executionContext.getValue<string>('documentId') || 'unknown'
    const documentType = executionContext.getValue<string>('documentType') || 'unknown'

    this.logger().log('**********************************************************************')
    this.logger().log(`*** Document Store Supervisor on behalf of ${actorType}`)
    this.logger().log(`*** Operation: ${operation}`)
    this.logger().log(`*** Document ID: ${documentId}`)
    this.logger().log(`*** Document Type: ${documentType}`)
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

    // Storage failures - Resume and let actor retry when storage recovers
    // The storage mechanism recovery is handled externally (k8s, admins, etc.)
    // and the document store will recover gracefully once storage is available again.
    // Stopping the actor would require a service restart to recover, which is
    // not desirable when the storage issue is transient or externally managed.
    if (message.includes('storage unavailable') ||
        message.includes('connection lost') ||
        message.includes('fatal')) {
      return SupervisionDirective.Resume
    }

    // Serialization/schema errors - Restart to clear corrupted state (check before validation)
    if (message.includes('serialization') ||
        message.includes('deserialization') ||
        message.includes('schema') ||
        message.includes('parse error') ||
        message.includes('json')) {
      return SupervisionDirective.Restart
    }

    // State corruption - Restart to reload from store
    if (message.includes('corrupt') ||
        message.includes('inconsistent') ||
        message.includes('internal state') ||
        message.includes('state error')) {
      return SupervisionDirective.Restart
    }

    // Concurrency violations - Resume, the actor can retry
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
        message.includes('already exists') ||
        message.includes('duplicate')) {
      return SupervisionDirective.Resume
    }

    // Default: Resume to allow system to continue
    return SupervisionDirective.Resume
  }
}
