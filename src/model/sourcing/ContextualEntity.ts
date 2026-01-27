// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { EventSourcedEntity } from './EventSourcedEntity'
import { CommandSourcedEntity } from './CommandSourcedEntity'

/**
 * Create a bounded-context-specific EventSourcedEntity base class type.
 *
 * @example
 * ```typescript
 * // Create a base class for the "bank" bounded context
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
 * @param contextName the name of the bounded context
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
 * Create a bounded-context-specific CommandSourcedEntity base class type.
 *
 * @example
 * ```typescript
 * // Create a base class for the "bank" bounded context
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
 * @param contextName the name of the bounded context
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
