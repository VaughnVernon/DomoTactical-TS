// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Source } from './Source.js'
import { EntryAdapter } from './EntryAdapter.js'
import { TextEntry } from './TextEntry.js'
import { Metadata } from './Metadata.js'

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
 * const entry = adapter.toEntry(event, 1, metadata)
 * const event2 = adapter.fromEntry(entry)
 *
 * // Extend for custom upcasting
 * class AccountOpenedAdapter extends DefaultTextEntryAdapter<AccountOpened> {
 *   protected override upcastIfNeeded(data: any, type: string, typeVersion: number): AccountOpened {
 *     if (typeVersion === 1) {
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

    // Potential upcast from old schema version to current
    return this.upcastIfNeeded(data, entry.type, entry.typeVersion)
  }

  /**
   * Convert Source to Entry with minimal metadata (2-arg overload).
   * Uses source.id() for entry id and 0 for streamVersion.
   *
   * @param source the Source to convert
   * @param metadata optional metadata
   * @returns TextEntry the entry instance
   */
  toEntry(source: S, metadata?: Metadata): TextEntry

  /**
   * Convert Source to Entry with streamVersion (3-arg overload).
   *
   * @param source the Source to convert
   * @param streamVersion the stream version (1-based index in entity's stream)
   * @param metadata optional metadata
   * @returns TextEntry the entry instance
   */
  toEntry(source: S, streamVersion: number, metadata?: Metadata): TextEntry

  /**
   * Implementation of overloaded toEntry methods.
   *
   * Creates a TextEntry using the 6-arg constructor (without globalPosition).
   * The Journal assigns globalPosition when appending to the journal.
   */
  toEntry(
    source: S,
    streamVersionOrMetadata?: number | Metadata,
    metadata?: Metadata
  ): TextEntry {
    const serialized = JSON.stringify(source)
    const id = source.id()

    // Check if this is the 2-arg overload (source, metadata?)
    if (typeof streamVersionOrMetadata !== 'number') {
      const actualMetadata = streamVersionOrMetadata || Metadata.nullMetadata()
      // Use 6-arg form with streamVersion=0 as placeholder
      return new TextEntry(
        id,
        source.typeName(),
        source.sourceTypeVersion,
        serialized,
        0, // Placeholder streamVersion for 2-arg overload
        JSON.stringify({
          value: actualMetadata.value,
          operation: actualMetadata.operation,
          properties: Object.fromEntries(actualMetadata.properties)
        })
      )
    }

    // This is the 3-arg overload (source, streamVersion, metadata?)
    const streamVersion = streamVersionOrMetadata
    const actualMetadata = metadata || Metadata.nullMetadata()

    return new TextEntry(
      id,
      source.typeName(),
      source.sourceTypeVersion,
      serialized,
      streamVersion,
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
   * @param typeVersion the schema version from the Entry (for evolution)
   * @returns S the upcasted Source instance
   *
   * @example
   * ```typescript
   * protected override upcastIfNeeded(data: any, type: string, typeVersion: number): AccountOpened {
   *   // v3 is current - no upcasting needed
   *   if (typeVersion === 3) {
   *     return data as AccountOpened
   *   }
   *
   *   // Upcast v1 → v3
   *   if (typeVersion === 1) {
   *     return new AccountOpened(
   *       data.accountId,
   *       data.owner,
   *       0, // v1 didn't have initialBalance
   *       'checking' // v1 didn't have accountType
   *     )
   *   }
   *
   *   // Upcast v2 → v3
   *   if (typeVersion === 2) {
   *     return new AccountOpened(
   *       data.accountId,
   *       data.owner,
   *       data.initialBalance,
   *       'checking' // v2 didn't have accountType
   *     )
   *   }
   *
   *   throw new Error(`Unsupported AccountOpened typeVersion: ${typeVersion}`)
   * }
   * ```
   */
  protected upcastIfNeeded(data: any, type: string, typeVersion: number): S {
    // Default: no upcasting, return as-is
    return data as S
  }
}
