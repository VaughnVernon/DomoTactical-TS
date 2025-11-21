// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Source } from './Source'
import { EntryAdapter } from './EntryAdapter'
import { TextEntry } from './journal/TextEntry'
import { Metadata } from './Metadata'

/**
 * Default adapter for JSON/text-based Entry serialization.
 * Uses JSON.stringify/parse for Source instances.
 *
 * This adapter:
 * - Serializes Source instances to JSON strings
 * - Deserializes JSON strings back to Source instances
 * - Provides a hook for schema evolution via upcastIfNeeded
 * - Can be extended to implement custom upcasting logic
 *
 * @template S the Source type
 *
 * @example
 * ```typescript
 * // Use default adapter (no upcasting)
 * const adapter = new DefaultTextEntryAdapter<AccountOpened>()
 * const entry = adapter.toEntry(event, 1, 'entry-123', metadata)
 * const event2 = adapter.fromEntry(entry)
 *
 * // Extend for custom upcasting
 * class AccountOpenedAdapter extends DefaultTextEntryAdapter<AccountOpened> {
 *   protected override upcastIfNeeded(data: any, type: string, version: number): AccountOpened {
 *     if (version === 1) {
 *       // Upcast v1 to v2
 *       return new AccountOpened(data.accountId, data.owner, 0)
 *     }
 *     return data as AccountOpened
 *   }
 * }
 * ```
 */
export class DefaultTextEntryAdapter<S extends Source<any>>
  implements EntryAdapter<S, TextEntry>
{
  constructor() { }

  /**
   * Convert Entry to Source (deserialization + potential upcasting).
   *
   * Deserializes the JSON data from the Entry and optionally upcasts it
   * if it's an older schema version.
   *
   * @param entry the TextEntry to convert from
   * @returns S the native Source instance
   */
  fromEntry(entry: TextEntry): S {
    // Deserialize from JSON
    const data = JSON.parse(entry.entryData)

    // Potential upcast from old version to current
    return this.upcastIfNeeded(data, entry.type, entry.typeVersion)
  }

  /**
   * Convert Source to Entry with minimal metadata (2-arg overload).
   *
   * @param source the Source to convert
   * @param metadata optional metadata
   * @returns TextEntry the entry instance
   */
  toEntry(source: S, metadata?: Metadata): TextEntry

  /**
   * Convert Source to Entry with version and id (4-arg overload).
   *
   * @param source the Source to convert
   * @param version the stream version
   * @param id the entry id
   * @param metadata optional metadata
   * @returns TextEntry the entry instance
   */
  toEntry(source: S, version: number, id: string, metadata?: Metadata): TextEntry

  /**
   * Implementation of overloaded toEntry methods.
   */
  toEntry(
    source: S,
    versionOrMetadata?: number | Metadata,
    id?: string,
    metadata?: Metadata
  ): TextEntry {
    const serialized = JSON.stringify(source)

    // Check if this is the 2-arg overload (source, metadata)
    if (typeof versionOrMetadata !== 'number') {
      const actualMetadata = versionOrMetadata || Metadata.nullMetadata()
      return new TextEntry(
        source.typeName(),
        source.sourceTypeVersion,
        serialized,
        JSON.stringify({
          value: actualMetadata.value,
          operation: actualMetadata.operation,
          properties: Object.fromEntries(actualMetadata.properties)
        })
      )
    }

    // This is the 4-arg overload (source, version, id, metadata)
    const version = versionOrMetadata
    const actualMetadata = metadata || Metadata.nullMetadata()

    return new TextEntry(
      id || '',
      source.typeName(),
      source.sourceTypeVersion,
      serialized,
      version,
      JSON.stringify({
        value: actualMetadata.value,
        operation: actualMetadata.operation,
        properties: Object.fromEntries(actualMetadata.properties)
      })
    )
  }

  /**
   * Override this method to handle schema evolution.
   *
   * This method is called during fromEntry() to allow subclasses to upcast
   * old schema versions to the current version.
   *
   * The default implementation does no upcasting and returns data as-is.
   *
   * @param data the deserialized data from JSON
   * @param type the Source type name (e.g., "AccountOpened")
   * @param version the schema version from the Entry
   * @returns S the upcasted Source instance
   *
   * @example
   * ```typescript
   * protected override upcastIfNeeded(data: any, type: string, version: number): AccountOpened {
   *   // v3 is current - no upcasting needed
   *   if (version === 3) {
   *     return data as AccountOpened
   *   }
   *
   *   // Upcast v1 → v3
   *   if (version === 1) {
   *     return new AccountOpened(
   *       data.accountId,
   *       data.owner,
   *       0, // v1 didn't have initialBalance
   *       'checking' // v1 didn't have accountType
   *     )
   *   }
   *
   *   // Upcast v2 → v3
   *   if (version === 2) {
   *     return new AccountOpened(
   *       data.accountId,
   *       data.owner,
   *       data.initialBalance,
   *       'checking' // v2 didn't have accountType
   *     )
   *   }
   *
   *   throw new Error(`Unsupported AccountOpened version: ${version}`)
   * }
   * ```
   */
  protected upcastIfNeeded(data: any, type: string, version: number): S {
    // Default: no upcasting, return as-is
    return data as S
  }
}
