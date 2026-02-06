// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { State, TextState } from './State.js'
import { StateAdapter } from './StateAdapter.js'
import { DefaultTextStateAdapter } from './DefaultTextStateAdapter.js'
import { Metadata } from './Metadata.js'
import { StoreTypeMapper } from './StoreTypeMapper.js'

/**
 * Registry for StateAdapter instances.
 * Manages mapping from state types to their adapters.
 *
 * This is a singleton that holds all registered state adapters and provides
 * conversion methods for the DocumentStore to use.
 *
 * @example
 * ```typescript
 * // Get the singleton instance
 * const provider = StateAdapterProvider.instance()
 *
 * // Register a custom adapter
 * provider.registerAdapter('AccountState', new AccountStateAdapter())
 *
 * // Convert native state to raw State
 * const rawState = provider.asRawState('account-123', accountState, 1, metadata)
 *
 * // Convert raw State back to native state
 * const state = provider.fromRawState(rawState, 'AccountState')
 * ```
 */
export class StateAdapterProvider {
  private static _instance: StateAdapterProvider | null = null

  /** Map of state type name to adapter */
  private readonly adapters = new Map<string, StateAdapter<any, any>>()

  /**
   * Construct a new StateAdapterProvider.
   * Use instance() for the singleton.
   */
  constructor() {}

  /**
   * Get the singleton instance.
   * Creates the instance on first call.
   *
   * @returns StateAdapterProvider the singleton instance
   */
  static instance(): StateAdapterProvider {
    if (!StateAdapterProvider._instance) {
      StateAdapterProvider._instance = new StateAdapterProvider()
    }
    return StateAdapterProvider._instance
  }

  /**
   * Get the singleton instance.
   * @deprecated Use instance() instead
   * @returns StateAdapterProvider the singleton instance
   */
  static getInstance(): StateAdapterProvider {
    return StateAdapterProvider.instance()
  }

  /**
   * Reset the singleton instance (mainly for testing).
   * Clears all registered adapters.
   */
  static reset(): void {
    StateAdapterProvider._instance = null
  }

  /**
   * Register a custom adapter for a state type.
   *
   * Once registered, this adapter will be used for all conversions
   * involving the specified state type.
   *
   * @param stateType the state type name (e.g., 'AccountState')
   * @param adapter the adapter instance
   *
   * @example
   * ```typescript
   * provider.registerAdapter('AccountState', new AccountStateAdapter())
   * provider.registerAdapter('OrderState', new OrderStateAdapter())
   * ```
   */
  registerAdapter<S, RS extends State<any>>(
    stateType: string,
    adapter: StateAdapter<S, RS>
  ): void {
    this.adapters.set(stateType, adapter)
  }

  /**
   * Convert native state to raw State using registered or default adapter.
   *
   * This is the primary method used by DocumentStore.write() to serialize state.
   * The adapter is responsible for mapping type names to symbolic names via
   * StoreTypeMapper (see DefaultTextStateAdapter for reference implementation).
   *
   * @param id the state identity
   * @param state the native state
   * @param stateVersion the version number
   * @param metadata optional metadata
   * @returns RS the raw State instance with symbolic type name
   *
   * @example
   * ```typescript
   * const rawState = provider.asRawState('account-123', accountState, 1, metadata)
   * // rawState.type will be 'account-state' (mapped by adapter via StoreTypeMapper)
   * ```
   */
  asRawState<S, RS extends State<any>>(
    id: string,
    state: S,
    stateVersion: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): RS {
    const typeName = state?.constructor?.name || 'Object'
    const adapter = this.adapters.get(typeName)

    if (adapter) {
      return adapter.toRawState(id, state, stateVersion, metadata)
    }

    // Default: use DefaultTextStateAdapter
    const defaultAdapter = new DefaultTextStateAdapter<S>()
    return defaultAdapter.toRawState(id, state, stateVersion, metadata) as RS
  }

  /**
   * Convert raw State to native state using registered or default adapter.
   *
   * This is the primary method used by DocumentStore.read() to deserialize state.
   * The state type is mapped from symbolic name to type name using StoreTypeMapper
   * before looking up the adapter. If the State represents an old schema version,
   * the adapter's upcasting logic will be applied automatically.
   *
   * @param raw the raw State instance
   * @param stateType optional state type name (will be mapped from symbolic if needed)
   * @returns S the native state
   *
   * @example
   * ```typescript
   * const state = provider.fromRawState(rawState, 'account-state')
   * // 'account-state' is mapped to 'AccountState' for adapter lookup
   * // Returns AccountState instance, potentially upcasted from old version
   * ```
   */
  fromRawState<S, RS extends State<any>>(raw: RS, stateType?: string): S {
    const rawTypeName = stateType || raw.type || 'Object'
    // Map symbolic type back to type name for adapter lookup
    const typeName = StoreTypeMapper.instance().toTypeName(rawTypeName)
    const adapter = this.adapters.get(typeName)

    if (adapter) {
      return adapter.fromRawState(raw)
    }

    // Default: use DefaultTextStateAdapter
    const defaultAdapter = new DefaultTextStateAdapter<S>()
    return defaultAdapter.fromRawState(raw as TextState)
  }

  /**
   * Check if a custom adapter is registered for a state type.
   *
   * @param stateType the state type name
   * @returns boolean true if a custom adapter is registered
   *
   * @example
   * ```typescript
   * if (provider.hasAdapter('AccountState')) {
   *   console.log('Custom adapter registered for AccountState')
   * }
   * ```
   */
  hasAdapter(stateType: string): boolean {
    return this.adapters.has(stateType)
  }

  /**
   * Get the adapter for a state type (for testing/debugging).
   *
   * @param stateType the state type name
   * @returns StateAdapter | undefined the adapter if registered, undefined otherwise
   */
  getAdapter(stateType: string): StateAdapter<any, any> | undefined {
    return this.adapters.get(stateType)
  }
}
