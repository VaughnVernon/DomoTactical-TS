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
 * - Type name mapping via StoreTypeMapper (e.g., 'AccountOpened' → 'account-opened')
 *
 * @template S the native Source type
 * @template E the raw Entry type
 *
 * @example
 * ```typescript
 * class AccountOpenedAdapter implements EntryAdapter<AccountOpened, TextEntry> {
 *   fromEntry(entry: TextEntry): AccountOpened {
 *     const data = JSON.parse(entry.entryData)
 *     // Map symbolic type back to type name for upcasting logic
 *     const typeName = StoreTypeMapper.instance().toTypeName(entry.type)
 *     // Upcast from v1 to v2 if needed
 *     if (entry.typeVersion === 1) {
 *       return new AccountOpened(data.accountId, data.owner, 0) // v1 had no initialBalance
 *     }
 *     return new AccountOpened(data.accountId, data.owner, data.initialBalance)
 *   }
 *
 *   toEntry(source: AccountOpened, streamVersion: number, metadata: Metadata): TextEntry {
 *     // Map type name to symbolic name for storage
 *     const symbolicType = StoreTypeMapper.instance().toSymbolicName(source.typeName())
 *     const data = JSON.stringify({ accountId: source.accountId, owner: source.owner, initialBalance: source.initialBalance })
 *     return new TextEntry(source.id(), symbolicType, 2, data, streamVersion, JSON.stringify(metadata))
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
   * The entry.type is the symbolic name (e.g., 'account-opened'). Use
   * StoreTypeMapper.instance().toTypeName() to convert back to the type name
   * if needed for upcasting logic.
   *
   * @param entry the Entry to convert from
   * @returns S the native Source instance
   *
   * @example
   * ```typescript
   * fromEntry(entry: TextEntry): AccountOpened {
   *   const data = JSON.parse(entry.entryData)
   *   // Map symbolic type back to type name if needed
   *   const typeName = StoreTypeMapper.instance().toTypeName(entry.type)
   *   // Handle schema evolution
   *   if (entry.typeVersion === 1) {
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
   * This is the primary serialization method. The adapter is responsible for
   * mapping the type name to symbolic name using StoreTypeMapper. See
   * DefaultTextEntryAdapter for the reference implementation.
   *
   * @param source the Source to convert
   * @param streamVersion the stream version (1-based index in entity's stream)
   * @param metadata optional metadata (defaults to null metadata)
   * @returns E the Entry instance with symbolic type name
   *
   * @example
   * ```typescript
   * toEntry(source: AccountOpened, streamVersion: number, metadata: Metadata): TextEntry {
   *   // Map type name to symbolic name for storage
   *   const symbolicType = StoreTypeMapper.instance().toSymbolicName(source.typeName())
   *   const data = JSON.stringify({ accountId: source.accountId, owner: source.owner })
   *   return new TextEntry(source.id(), symbolicType, 2, data, streamVersion, JSON.stringify(metadata))
   * }
   * ```
   */
  toEntry(source: S, streamVersion: number, metadata?: Metadata): E
}
