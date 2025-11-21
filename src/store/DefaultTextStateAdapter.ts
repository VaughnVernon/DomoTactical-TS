// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { StateAdapter } from './StateAdapter'
import { TextState } from './State'
import { Metadata } from './Metadata'

/**
 * Default adapter for JSON/text-based State serialization.
 *
 * This adapter:
 * - Serializes native state instances to JSON strings
 * - Deserializes JSON strings back to native state instances
 * - Provides a hook for schema evolution via upcastIfNeeded
 * - Can be extended to implement custom upcasting logic
 *
 * @template S the native state type
 *
 * @example
 * ```typescript
 * // Use default adapter (no upcasting)
 * const adapter = new DefaultTextStateAdapter<AccountState>()
 * const rawState = adapter.toRawState('account-123', state, 1, metadata)
 * const state2 = adapter.fromRawState(rawState)
 *
 * // Extend for custom upcasting
 * class AccountStateAdapter extends DefaultTextStateAdapter<AccountState> {
 *   protected override upcastIfNeeded(data: any, version: number): AccountState {
 *     if (version === 1) {
 *       // Upcast v1 to v2
 *       return new AccountState(data.accountId, data.balance, 'checking')
 *     }
 *     return data as AccountState
 *   }
 * }
 * ```
 */
export class DefaultTextStateAdapter<S> implements StateAdapter<S, TextState> {
  /**
   * Construct a DefaultTextStateAdapter.
   * @param version the current type version (defaults to 1)
   */
  constructor(private readonly version: number = 1) {
    if (version <= 0) {
      throw new Error('StateAdapter type version must be greater than 0')
    }
  }

  /**
   * Answer the type version for schema evolution.
   */
  typeVersion(): number {
    return this.version
  }

  /**
   * Convert raw State to native state (deserialization + upcasting).
   *
   * @param raw the TextState instance
   * @returns S the native state
   */
  fromRawState(raw: TextState): S

  /**
   * Convert raw State to specific native state type.
   *
   * @param raw the TextState instance
   * @param stateType the target class constructor
   * @returns ST the typed native state
   */
  fromRawState<ST>(raw: TextState, stateType: new (...args: any[]) => ST): ST

  /**
   * Implementation of overloaded fromRawState methods.
   */
  fromRawState<ST>(raw: TextState, stateType?: new (...args: any[]) => ST): S | ST {
    const data = JSON.parse(raw.data)
    const upcasted = this.upcastIfNeeded(data, raw.typeVersion)

    // If a specific state type is provided, return it typed
    if (stateType) {
      return upcasted as unknown as ST
    }

    return upcasted
  }

  /**
   * Convert native state to raw State (serialization).
   *
   * @param id the state identity
   * @param state the native state
   * @param stateVersion the version number
   * @param metadata optional metadata
   * @returns TextState the raw State instance
   */
  toRawState(id: string, state: S, stateVersion: number, metadata?: Metadata): TextState

  /**
   * Convert native state to raw State without id.
   *
   * @param state the native state
   * @param stateVersion the version number
   * @param metadata optional metadata
   * @returns TextState the raw State instance
   */
  toRawState(state: S, stateVersion: number, metadata?: Metadata): TextState

  /**
   * Implementation of overloaded toRawState methods.
   */
  toRawState(
    idOrState: string | S,
    stateOrVersion: S | number,
    stateVersionOrMetadata?: number | Metadata,
    metadataOrUndefined?: Metadata
  ): TextState {
    // Check if this is the 4-arg overload (id, state, stateVersion, metadata)
    if (typeof idOrState === 'string' && typeof stateVersionOrMetadata === 'number') {
      const id = idOrState
      const state = stateOrVersion as S
      const stateVersion = stateVersionOrMetadata
      const metadata = metadataOrUndefined || Metadata.nullMetadata()

      const serialized = JSON.stringify(state)
      return new TextState(id, Object, this.version, serialized, stateVersion, metadata)
    }

    // This is the 3-arg overload (state, stateVersion, metadata)
    const state = idOrState as S
    const stateVersion = stateOrVersion as number
    const metadata =
      stateVersionOrMetadata instanceof Metadata
        ? stateVersionOrMetadata
        : Metadata.nullMetadata()

    const serialized = JSON.stringify(state)
    return new TextState('', Object, this.version, serialized, stateVersion, metadata)
  }

  /**
   * Override this method to handle schema evolution.
   *
   * This method is called during fromRawState() to allow subclasses to upcast
   * old schema versions to the current version.
   *
   * The default implementation does no upcasting and returns data as-is.
   *
   * @param data the deserialized data from JSON
   * @param version the schema version from the TextState
   * @returns S the upcasted state instance
   *
   * @example
   * ```typescript
   * protected override upcastIfNeeded(data: any, version: number): AccountState {
   *   // v2 is current - no upcasting needed
   *   if (version === 2) {
   *     return data as AccountState
   *   }
   *
   *   // Upcast v1 → v2
   *   if (version === 1) {
   *     return new AccountState(
   *       data.accountId,
   *       data.balance,
   *       'checking' // v1 didn't have accountType
   *     )
   *   }
   *
   *   throw new Error(`Unsupported AccountState version: ${version}`)
   * }
   * ```
   */
  protected upcastIfNeeded(data: any, version: number): S {
    // Default: no upcasting, return as-is
    return data as S
  }
}
