// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { EventSourcedEntity } from './EventSourcedEntity'
import { CommandSourcedEntity } from './CommandSourcedEntity'
import { ContextProfile, SourceTypeSpec } from '../../store/ContextProfile'

/**
 * Configuration for creating a context with optional Source registration.
 *
 * @example
 * ```typescript
 * const BankEntity = eventSourcedContextFor('bank', {
 *   sources: [
 *     { type: AccountOpened },
 *     { type: FundsDeposited, transforms: { depositedAt: Source.asDate } },
 *     { type: AccountClosed, transforms: { closedAt: Source.asDate } }
 *   ]
 * })
 * ```
 */
export interface ContextSourceTypes {
  /** Source types to register for reconstruction */
  sources?: SourceTypeSpec[]
}

/**
 * Create a context-specific EventSourcedEntity base class type.
 *
 * @example
 * ```typescript
 * // Create a base class for the "bank" context
 * const BankEventSourcedEntity = eventSourcedEntityTypeFor('bank')
 *
 * // Use it as the base for your entity
 * class AccountActor extends BankEventSourcedEntity implements Account {
 *   // ...
 * }
 * ```
 *
 * This will use the journal registered at 'domo-tactical:bank.journal'
 *
 * @param contextName the name of the context
 * @returns a new EventSourcedEntity subclass with the context name configured
 */
export function eventSourcedEntityTypeFor(contextName: string): typeof EventSourcedEntity {
  // Create a class that overrides contextName
  class ContextEventSourcedEntity extends EventSourcedEntity {
    protected override contextName(): string {
      return contextName
    }
  }

  // Return it as the base type for proper inheritance
  return ContextEventSourcedEntity as typeof EventSourcedEntity
}

/**
 * Create a context-specific CommandSourcedEntity base class type.
 *
 * @example
 * ```typescript
 * // Create a base class for the "bank" context
 * const BankCommandSourcedEntity = commandSourcedEntityTypeFor('bank')
 *
 * // Use it as the base for your entity
 * class TransferCoordinator extends BankCommandSourcedEntity implements Coordinator {
 *   // ...
 * }
 * ```
 *
 * This will use the journal registered at 'domo-tactical:bank.journal'
 *
 * @param contextName the name of the context
 * @returns a new CommandSourcedEntity subclass with the context name configured
 */
export function commandSourcedEntityTypeFor(contextName: string): typeof CommandSourcedEntity {
  // Create a class that overrides contextName
  class ContextCommandSourcedEntity extends CommandSourcedEntity {
    protected override contextName(): string {
      return contextName
    }
  }

  // Return it as the base type for proper inheritance
  return ContextCommandSourcedEntity as typeof CommandSourcedEntity
}

/**
 * Create a context-specific EventSourcedEntity base class type
 * AND register Source types in a single call.
 *
 * This function combines `eventSourcedEntityTypeFor()` with automatic
 * Source registration via ContextProfile, reducing boilerplate when
 * setting up a context. Sources are registered to the context-specific
 * EntryAdapterProvider for test isolation.
 *
 * @example
 * ```typescript
 * const BankEventSourcedEntity = eventSourcedContextFor('bank', {
 *   sources: [
 *     { type: AccountOpened },
 *     { type: FundsDeposited, transforms: { depositedAt: Source.asDate } },
 *     { type: AccountClosed, transforms: { closedAt: Source.asDate } }
 *   ]
 * })
 *
 * class AccountActor extends BankEventSourcedEntity implements Account {
 *   // ... entity implementation
 *   // Uses journal at 'domo-tactical:bank.journal'
 *   // All sources are automatically reconstructed when restoring from journal
 * }
 * ```
 *
 * @param contextName the name of the context
 * @param config optional configuration including Source registrations
 * @returns a new EventSourcedEntity subclass with the context name configured
 */
export function eventSourcedContextFor(
  contextName: string,
  config?: ContextSourceTypes
): typeof EventSourcedEntity {
  if (config?.sources) {
    ContextProfile.forContext(contextName).registerSources(config.sources)
  }
  return eventSourcedEntityTypeFor(contextName)
}

/**
 * Create a context-specific CommandSourcedEntity base class type
 * AND register Source types in a single call.
 *
 * This function combines `commandSourcedEntityTypeFor()` with automatic
 * Source registration via ContextProfile, reducing boilerplate when
 * setting up a context. Sources are registered to the context-specific
 * EntryAdapterProvider for test isolation.
 *
 * @example
 * ```typescript
 * const BankCommandSourcedEntity = commandSourcedContextFor('bank', {
 *   sources: [
 *     { type: ProcessTransfer },
 *     { type: TransferCompleted, transforms: { completedAt: Source.asDate } }
 *   ]
 * })
 *
 * class TransferCoordinator extends BankCommandSourcedEntity implements Coordinator {
 *   // ... entity implementation
 * }
 * ```
 *
 * @param contextName the name of the context
 * @param config optional configuration including Source registrations
 * @returns a new CommandSourcedEntity subclass with the context name configured
 */
export function commandSourcedContextFor(
  contextName: string,
  config?: ContextSourceTypes
): typeof CommandSourcedEntity {
  if (config?.sources) {
    ContextProfile.forContext(contextName).registerSources(config.sources)
  }
  return commandSourcedEntityTypeFor(contextName)
}
