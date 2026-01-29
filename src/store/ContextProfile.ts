// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { EntryAdapterProvider } from './EntryAdapterProvider'
import { Source } from './Source'
import { DefaultTextEntryAdapter } from './DefaultTextEntryAdapter'

/**
 * Optional property transforms for converting serialized values during reconstruction.
 * Keys are property names, values are transform functions.
 *
 * @example
 * ```typescript
 * const transforms: PropertyTransforms = {
 *   depositedAt: Source.asDate,
 *   amount: (v) => Number(v)
 * }
 * ```
 */
export type PropertyTransforms = Record<string, (value: unknown) => unknown>

/**
 * Configuration for a Source type with optional property transforms.
 *
 * @example
 * ```typescript
 * // Simple - no transforms needed
 * { type: AccountOpened }
 *
 * // With Date transform
 * { type: FundsDeposited, transforms: { depositedAt: Source.asDate } }
 * ```
 */
export interface SourceTypeSpec<T extends Source<unknown> = Source<unknown>> {
  /** The Source class constructor (DomainEvent, Command, etc.) */
  type: new (...args: unknown[]) => T
  /** Optional property transforms (e.g., for Date conversion) */
  transforms?: PropertyTransforms
}

/** Global registry of context profiles */
const contextProfiles = new Map<string, ContextProfile>()

/**
 * Context-scoped registration of Source types with their own EntryAdapterProvider.
 *
 * ContextProfile solves two problems:
 * 1. **Boilerplate Reduction**: Simple fluent API for registering Source types
 * 2. **Test Isolation**: Each context has its own adapter registry, avoiding singleton issues
 *
 * @example
 * ```typescript
 * // Fluent registration API
 * ContextProfile.forContext('bank')
 *   .register(AccountOpened)
 *   .register(FundsDeposited, { depositedAt: Source.asDate })
 *   .register(AccountClosed, { closedAt: Source.asDate })
 *
 * // Or with registerAll for simple types
 * ContextProfile.forContext('bank')
 *   .registerAll(AccountOpened, FundsTransferred)
 *   .register(FundsDeposited, { depositedAt: Source.asDate })
 *
 * // Batch registration with SourceTypeSpec array
 * ContextProfile.forContext('bank').registerSources([
 *   { type: AccountOpened },
 *   { type: FundsDeposited, transforms: { depositedAt: Source.asDate } }
 * ])
 *
 * // Test isolation
 * beforeEach(() => {
 *   ContextProfile.reset()
 *   EntryAdapterProvider.reset()
 * })
 * ```
 */
export class ContextProfile {
  private readonly adapterProvider: EntryAdapterProvider

  private constructor(public readonly contextName: string) {
    this.adapterProvider = new EntryAdapterProvider()
  }

  /**
   * Get or create a ContextProfile for the given context name.
   * Returns the same instance for the same context name.
   *
   * @param contextName the name of the context (e.g., 'bank', 'inventory')
   * @returns ContextProfile for the context
   *
   * @example
   * ```typescript
   * const bankProfile = ContextProfile.forContext('bank')
   * const sameProfile = ContextProfile.forContext('bank')  // Same instance
   * ```
   */
  static forContext(contextName: string): ContextProfile {
    let profile = contextProfiles.get(contextName)
    if (!profile) {
      profile = new ContextProfile(contextName)
      contextProfiles.set(contextName, profile)
    }
    return profile
  }

  /**
   * Get an existing ContextProfile without creating one.
   *
   * @param contextName the name of the context
   * @returns ContextProfile if exists, undefined otherwise
   *
   * @example
   * ```typescript
   * const profile = ContextProfile.get('bank')
   * if (profile) {
   *   const provider = profile.entryAdapterProvider()
   * }
   * ```
   */
  static get(contextName: string): ContextProfile | undefined {
    return contextProfiles.get(contextName)
  }

  /**
   * Reset all context profiles. Use in test setup/teardown for isolation.
   *
   * @example
   * ```typescript
   * beforeEach(() => {
   *   ContextProfile.reset()
   *   EntryAdapterProvider.reset()
   * })
   * ```
   */
  static reset(): void {
    contextProfiles.clear()
  }

  /**
   * Register a Source type for reconstruction with optional transforms.
   * Returns this for fluent chaining.
   *
   * @param sourceType the Source class constructor (DomainEvent, Command, etc.)
   * @param transforms optional property transforms (e.g., for Date conversion)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * ContextProfile.forContext('bank')
   *   .register(AccountOpened)
   *   .register(FundsDeposited, { depositedAt: Source.asDate })
   *   .register(AccountClosed, { closedAt: Source.asDate })
   * ```
   */
  register<T extends Source<unknown>>(
    sourceType: new (...args: unknown[]) => T,
    transforms?: PropertyTransforms
  ): this {
    const adapter = new PrototypeRestoringAdapter(sourceType, transforms)
    this.adapterProvider.registerAdapter(sourceType, adapter)
    return this
  }

  /**
   * Register multiple Source types without transforms.
   * Returns this for fluent chaining.
   *
   * @param sourceTypes the Source class constructors to register
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * ContextProfile.forContext('bank')
   *   .registerAll(AccountOpened, AccountClosed, FundsTransferred)
   *   .register(FundsDeposited, { depositedAt: Source.asDate })
   * ```
   */
  registerAll(...sourceTypes: Array<new (...args: unknown[]) => Source<unknown>>): this {
    for (const sourceType of sourceTypes) {
      this.register(sourceType)
    }
    return this
  }

  /**
   * Register multiple Source types from a SourceTypeSpec array.
   * Returns this for fluent chaining.
   *
   * @param sources array of SourceTypeSpec objects
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * ContextProfile.forContext('bank').registerSources([
   *   { type: AccountOpened },
   *   { type: FundsDeposited, transforms: { depositedAt: Source.asDate } },
   *   { type: AccountClosed, transforms: { closedAt: Source.asDate } }
   * ])
   * ```
   */
  registerSources(sources: SourceTypeSpec[]): this {
    for (const config of sources) {
      this.register(config.type, config.transforms)
    }
    return this
  }

  /**
   * Get the EntryAdapterProvider for this context.
   * Use this to access context-specific adapters for serialization/deserialization.
   *
   * @returns EntryAdapterProvider for this context
   *
   * @example
   * ```typescript
   * const profile = ContextProfile.forContext('bank')
   * const provider = profile.entryAdapterProvider()
   * const event = provider.asSource<AccountOpened>(entry)
   * ```
   */
  entryAdapterProvider(): EntryAdapterProvider {
    return this.adapterProvider
  }
}

/**
 * Internal adapter that reconstructs Source instances using Object.create() + Object.assign().
 * This sets the correct prototype so instanceof checks and methods work correctly.
 */
class PrototypeRestoringAdapter<T extends Source<unknown>> extends DefaultTextEntryAdapter<T> {
  constructor(
    private readonly sourceType: new (...args: unknown[]) => T,
    private readonly transforms?: PropertyTransforms
  ) {
    super()
  }

  protected override upcastIfNeeded(data: Record<string, unknown>, type: string, version: number): T {
    // Apply transforms if any
    if (this.transforms) {
      for (const [prop, transform] of Object.entries(this.transforms)) {
        if (data[prop] !== undefined) {
          data[prop] = transform(data[prop])
        }
      }
    }

    // Create instance with correct prototype and assign data
    return Object.assign(Object.create(this.sourceType.prototype), data) as T
  }
}
