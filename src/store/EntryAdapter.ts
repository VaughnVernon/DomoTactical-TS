// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Source } from './Source.js'
import { Entry } from './Entry.js'
import { Metadata } from './Metadata.js'

/**
 * Adapts native Source instances to raw Entry instances and vice versa.
 * Enables pluggable serialization (JSON, Protobuf, FlatBuffers, etc.)
 * and schema evolution/upcasting.
 *
 * This is the key abstraction that allows:
 * - Different serialization formats (JSON, binary, etc.)
 * - Schema evolution via upcasting old versions to current
 * - Type-safe conversion between domain objects and storage format
 *
 * @template S the native Source type
 * @template E the raw Entry type
 *
 * @example
 * ```typescript
 * class AccountOpenedAdapter implements EntryAdapter<AccountOpened, TextEntry> {
 *   fromEntry(entry: TextEntry): AccountOpened {
 *     const data = JSON.parse(entry.entryData)
 *     // Upcast from v1 to v2 if needed
 *     if (entry.typeVersion === 1) {
 *       return new AccountOpened(data.accountId, data.owner, 0) // v1 had no initialBalance
 *     }
 *     return new AccountOpened(data.accountId, data.owner, data.initialBalance)
 *   }
 *
 *   toEntry(source: AccountOpened, streamVersion: number, metadata: Metadata): TextEntry {
 *     const data = JSON.stringify({ accountId: source.accountId, owner: source.owner, initialBalance: source.initialBalance })
 *     // Uses 6-arg TextEntry constructor (without globalPosition - Journal assigns that)
 *     return new TextEntry(source.id(), 'AccountOpened', 2, data, streamVersion, JSON.stringify(metadata))
 *   }
 * }
 * ```
 */
export interface EntryAdapter<S extends Source<any>, E extends Entry<any>> {
  /**
   * Convert Entry to Source (deserialization + potential upcasting).
   *
   * This method reads the persisted Entry and converts it back to a native Source instance.
   * If the Entry represents an old version of the Source schema, this method should
   * upcast it to the current version.
   *
   * @param entry the Entry to convert from
   * @returns S the native Source instance
   *
   * @example
   * ```typescript
   * fromEntry(entry: TextEntry): AccountOpened {
   *   const data = JSON.parse(entry.entryData)
   *   // Handle schema evolution
   *   if (entry.typeVersion === 1) {
   *     // Upcast v1 to v2 by providing default for new field
   *     return new AccountOpened(data.accountId, data.owner, 0)
   *   }
   *   return new AccountOpened(data.accountId, data.owner, data.initialBalance)
   * }
   * ```
   */
  fromEntry(entry: E): S

  /**
   * Convert Source to Entry with minimal metadata (serialization).
   *
   * @param source the Source to convert
   * @param metadata optional metadata (defaults to null metadata)
   * @returns E the Entry instance
   */
  toEntry(source: S, metadata?: Metadata): E

  /**
   * Convert Source to Entry with streamVersion (full serialization).
   *
   * This is the primary serialization method used by the Journal.
   * The adapter gets the entry id from source.id().
   * The Journal assigns globalPosition when appending.
   *
   * @param source the Source to convert
   * @param streamVersion the stream version (1-based index in entity's stream)
   * @param metadata optional metadata (defaults to null metadata)
   * @returns E the Entry instance
   */
  toEntry(source: S, streamVersion: number, metadata?: Metadata): E
}
