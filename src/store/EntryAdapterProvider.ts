// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Source } from './Source'
import { Entry } from './journal/Entry'
import { TextEntry } from './journal/TextEntry'
import { EntryAdapter } from './EntryAdapter'
import { DefaultTextEntryAdapter } from './DefaultTextEntryAdapter'
import { Metadata } from './Metadata'
// Note: Circular import with ContextProfile is safe because we only
// access it at runtime inside defaultProvider(), not at module load time.
import { ContextProfile } from './ContextProfile'

/**
 * Registry for EntryAdapter instances.
 * Manages mapping from Source types to their adapters.
 * Provides default fallback to DefaultTextEntryAdapter.
 *
 * Can be used as a singleton via instance() or created per-context
 * via ContextProfile. For simple registration of Source types, use
 * EntryRegistry or ContextProfile instead:
 *
 * ```typescript
 * // Global registration (uses default context)
 * EntryRegistry.register(AccountOpened)
 * EntryRegistry.register(FundsDeposited, { depositedAt: Source.asDate })
 *
 * // Context-scoped registration (recommended for test isolation)
 * ContextProfile.forContext('bank')
 *   .register(AccountOpened)
 *   .register(FundsDeposited, { depositedAt: Source.asDate })
 * ```
 *
 * @example
 * ```typescript
 * // Get the singleton instance (global fallback)
 * const provider = EntryAdapterProvider.instance()
 *
 * // Register a custom adapter (for advanced use cases)
 * provider.registerAdapter(AccountOpened, new AccountOpenedAdapter())
 *
 * // Convert Source to Entry (uses custom adapter if registered, default otherwise)
 * const entry = provider.asEntry(accountOpenedEvent, 1, metadata)
 *
 * // Convert Entry back to Source
 * const event = provider.asSource(entry)
 * ```
 */
export class EntryAdapterProvider {
  private static _instance: EntryAdapterProvider | null = null

  /** Map of Source type name to adapter */
  private readonly adapters = new Map<string, EntryAdapter<any, any>>()

  /** Default adapter for text/JSON serialization */
  private readonly defaultAdapter = new DefaultTextEntryAdapter()

  /**
   * Construct a new EntryAdapterProvider.
   * Use instance() for the singleton, or create instances via ContextProfile
   * for context-scoped registration.
   */
  constructor() {}

  /**
   * Get the singleton instance.
   * Creates the instance on first call.
   *
   * @returns EntryAdapterProvider the singleton instance
   */
  static instance(): EntryAdapterProvider {
    if (!EntryAdapterProvider._instance) {
      EntryAdapterProvider._instance = new EntryAdapterProvider()
    }
    return EntryAdapterProvider._instance
  }

  /**
   * Reset the singleton instance (mainly for testing).
   * Clears all registered adapters.
   */
  static reset(): void {
    EntryAdapterProvider._instance = null
  }

  /**
   * Get the default context's EntryAdapterProvider.
   * This is the provider used by EntryRegistry.register() and is the
   * recommended way to access registered adapters in tests.
   *
   * @returns EntryAdapterProvider for the 'default' context
   *
   * @example
   * ```typescript
   * // Register using EntryRegistry
   * EntryRegistry.register(AccountOpened)
   *
   * // Get the provider where it was registered
   * const provider = EntryAdapterProvider.defaultProvider()
   * expect(provider.hasAdapter(AccountOpened)).toBe(true)
   * ```
   */
  static defaultProvider(): EntryAdapterProvider {
    return ContextProfile.forContext('default').entryAdapterProvider()
  }

  /**
   * Register a custom adapter for a Source type.
   *
   * For most use cases, prefer using EntryRegistry.register() instead,
   * which provides a simpler API.
   *
   * @param sourceType the Source class constructor
   * @param adapter the adapter instance
   *
   * @example
   * ```typescript
   * provider.registerAdapter(AccountOpened, new AccountOpenedAdapter())
   * ```
   */
  registerAdapter<S extends Source<any>, E extends Entry<any>>(
    sourceType: new (...args: any[]) => S,
    adapter: EntryAdapter<S, E>
  ): void {
    this.adapters.set(sourceType.name, adapter)
  }

  /**
   * Convert Source to Entry using registered or default adapter.
   *
   * This is the primary method used by Journal.append() to serialize Sources.
   *
   * @param source the Source to convert
   * @param version the stream version
   * @param metadata optional metadata
   * @returns Entry the serialized entry
   *
   * @example
   * ```typescript
   * const entry = provider.asEntry(accountOpenedEvent, 1, metadata)
   * ```
   */
  asEntry<S extends Source<any>>(
    source: S,
    version: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): Entry<any> {
    const adapter = this.adapters.get(source.constructor.name)
    if (adapter) {
      return adapter.toEntry(source, version, '', metadata)
    }
    return this.defaultAdapter.toEntry(source, version, '', metadata)
  }

  /**
   * Convert multiple Sources to Entries.
   *
   * Used by Journal.appendAll() to serialize multiple Sources at once.
   *
   * @param sources the Sources to convert
   * @param fromVersion the starting stream version
   * @param metadata optional metadata
   * @returns Entry[] array of serialized entries
   *
   * @example
   * ```typescript
   * const entries = provider.asEntries([event1, event2, event3], 1, metadata)
   * // Returns 3 entries with versions 1, 2, 3
   * ```
   */
  asEntries<S extends Source<any>>(
    sources: S[],
    fromVersion: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): Entry<any>[] {
    return sources.map((source, index) =>
      this.asEntry(source, fromVersion + index, metadata)
    )
  }

  /**
   * Convert Entry to Source using registered or default adapter.
   *
   * This is the primary method used by StreamReader to deserialize Entries.
   * If an Entry represents an old schema version, the adapter's upcasting
   * logic will be applied automatically.
   *
   * @param entry the Entry to convert
   * @returns Source the deserialized source
   *
   * @example
   * ```typescript
   * const event = provider.asSource(entry)
   * // Returns AccountOpened instance, potentially upcasted from old version
   * ```
   */
  asSource<S extends Source<any>>(entry: Entry<any>): S {
    const adapter = this.adapters.get(entry.type)
    if (adapter) {
      return adapter.fromEntry(entry) as S
    }
    return this.defaultAdapter.fromEntry(entry as TextEntry) as S
  }

  /**
   * Convert multiple Entries to Sources.
   *
   * Used when reading a stream to deserialize all entries at once.
   *
   * @param entries the Entries to convert
   * @returns Source[] array of deserialized sources
   *
   * @example
   * ```typescript
   * const events = provider.asSources(stream.entries)
   * // Returns array of Source instances (AccountOpened, FundsDeposited, etc.)
   * ```
   */
  asSources<S extends Source<any>>(entries: Entry<any>[]): S[] {
    return entries.map((entry) => this.asSource(entry))
  }

  /**
   * Check if a custom adapter is registered for a Source type.
   *
   * @param sourceType the Source class constructor or type name
   * @returns boolean true if a custom adapter is registered
   *
   * @example
   * ```typescript
   * if (provider.hasAdapter(AccountOpened)) {
   *   console.log('Custom adapter registered for AccountOpened')
   * }
   * ```
   */
  hasAdapter(sourceType: string | (new (...args: any[]) => Source<any>)): boolean {
    const typeName = typeof sourceType === 'string' ? sourceType : sourceType.name
    return this.adapters.has(typeName)
  }

  /**
   * Get the adapter for a Source type (for testing/debugging).
   *
   * @param sourceType the Source class constructor or type name
   * @returns EntryAdapter | undefined the adapter if registered, undefined otherwise
   */
  getAdapter(
    sourceType: string | (new (...args: any[]) => Source<any>)
  ): EntryAdapter<any, any> | undefined {
    const typeName = typeof sourceType === 'string' ? sourceType : sourceType.name
    return this.adapters.get(typeName)
  }
}
