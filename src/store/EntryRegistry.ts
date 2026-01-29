// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Source } from './Source.js'
import { ContextProfile, PropertyTransforms } from './ContextProfile.js'

// Re-export PropertyTransforms for backward compatibility
export { PropertyTransforms }

/**
 * Simple registry for Source types (DomainEvent, Command, or any Source<T>).
 *
 * Registers types so they can be properly reconstructed when deserializing
 * from the journal. Uses Object.create() + Object.assign() to set the correct
 * prototype, making instanceof checks and method calls work correctly.
 *
 * This class delegates to ContextProfile.forContext('default'), providing
 * a simple global API while allowing context-specific registration via
 * ContextProfile directly.
 *
 * @example
 * ```typescript
 * // Simple registration - no transforms needed
 * EntryRegistry.register(AccountOpened)
 * EntryRegistry.register(AccountClosed)
 *
 * // With transforms for Date properties
 * EntryRegistry.register(FundsDeposited, { depositedAt: Source.asDate })
 *
 * // Multiple Date transforms
 * EntryRegistry.register(TransferCompleted, {
 *   initiatedAt: Source.asDate,
 *   completedAt: Source.asDate
 * })
 * ```
 *
 * For context-specific registration with fluent API, use ContextProfile:
 * ```typescript
 * ContextProfile.forContext('bank')
 *   .register(AccountOpened)
 *   .register(FundsDeposited, { depositedAt: Source.asDate })
 * ```
 */
export class EntryRegistry {
  /**
   * Register a Source type for reconstruction in the default context.
   *
   * @param sourceType the Source class constructor (DomainEvent, Command, etc.)
   * @param transforms optional property transforms (e.g., for Date conversion)
   *
   * @example
   * ```typescript
   * // Simple - no transforms
   * EntryRegistry.register(AccountOpened)
   *
   * // With Date transform
   * EntryRegistry.register(FundsDeposited, { depositedAt: Source.asDate })
   * ```
   */
  static register<T extends Source<unknown>>(
    sourceType: new (...args: unknown[]) => T,
    transforms?: PropertyTransforms
  ): void {
    ContextProfile.forContext('default').register(sourceType, transforms)
  }
}
