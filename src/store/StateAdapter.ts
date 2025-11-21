// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { State } from './State'
import { Metadata } from './Metadata'

/**
 * Adapts native state to raw State instances and vice versa.
 * Supports schema evolution and multiple serialization formats.
 *
 * This adapter pattern allows:
 * - Different serialization formats (JSON, Protobuf, etc.)
 * - Schema evolution via upcasting old state versions
 * - Type-safe conversion between domain objects and storage
 *
 * @template S the native state type
 * @template RS the raw State type
 *
 * @example
 * ```typescript
 * class AccountStateAdapter implements StateAdapter<AccountState, TextState> {
 *   typeVersion(): number {
 *     return 2 // Current schema version
 *   }
 *
 *   fromRawState(raw: TextState): AccountState {
 *     const data = JSON.parse(raw.data)
 *     // Upcast from v1 to v2 if needed
 *     if (raw.typeVersion === 1) {
 *       return new AccountState(data.accountId, data.balance, 'checking') // v1 had no accountType
 *     }
 *     return new AccountState(data.accountId, data.balance, data.accountType)
 *   }
 *
 *   toRawState(id: string, state: AccountState, stateVersion: number, metadata: Metadata): TextState {
 *     const data = JSON.stringify({ accountId: state.accountId, balance: state.balance, accountType: state.accountType })
 *     return new TextState(id, AccountState, 2, data, stateVersion, metadata)
 *   }
 * }
 * ```
 */
export interface StateAdapter<S, RS extends State<any>> {
  /**
   * Answer the type version for schema evolution.
   * This version number identifies the current schema of the state type.
   * When the schema changes, increment this number and implement upcasting in fromRawState.
   *
   * @returns number the type version (e.g., 1, 2, 3...)
   */
  typeVersion(): number

  /**
   * Convert raw State to native state (deserialization + upcasting).
   *
   * This method reads the persisted State and converts it back to a native state instance.
   * If the State represents an old version of the schema, this method should
   * upcast it to the current version.
   *
   * @param raw the raw State instance
   * @returns S the native state
   *
   * @example
   * ```typescript
   * fromRawState(raw: TextState): AccountState {
   *   const data = JSON.parse(raw.data)
   *   // Handle schema evolution
   *   if (raw.typeVersion === 1) {
   *     // Upcast v1 to v2 by providing default for new field
   *     return new AccountState(data.accountId, data.balance, 'checking')
   *   }
   *   return new AccountState(data.accountId, data.balance, data.accountType)
   * }
   * ```
   */
  fromRawState(raw: RS): S

  /**
   * Convert raw State to specific native state type.
   *
   * This overload allows specifying the target class type explicitly,
   * useful when working with polymorphic state types.
   *
   * @param raw the raw State instance
   * @param stateType the target class constructor
   * @returns ST the typed native state
   */
  fromRawState<ST>(raw: RS, stateType: new (...args: any[]) => ST): ST

  /**
   * Convert native state to raw State (serialization).
   *
   * This is the primary serialization method used by DocumentStore.
   *
   * @param id the state identity
   * @param state the native state
   * @param stateVersion the version number
   * @param metadata optional metadata (defaults to null metadata)
   * @returns RS the raw State instance
   */
  toRawState(id: string, state: S, stateVersion: number, metadata?: Metadata): RS

  /**
   * Convert native state to raw State without id.
   *
   * Useful when the id is not yet known or will be assigned later.
   *
   * @param state the native state
   * @param stateVersion the version number
   * @param metadata optional metadata (defaults to null metadata)
   * @returns RS the raw State instance
   */
  toRawState(state: S, stateVersion: number, metadata?: Metadata): RS
}
