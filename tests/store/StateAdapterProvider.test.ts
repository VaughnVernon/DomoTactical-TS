// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StateAdapterProvider } from '../../src/store/StateAdapterProvider'
import { StateAdapter } from '../../src/store/StateAdapter'
import { State, TextState } from '../../src/store/State'
import { Metadata } from '../../src/store/Metadata'

// Test state class
class AccountState {
  constructor(
    public readonly accountId: string,
    public readonly balance: number,
    public readonly accountType: string = 'checking'
  ) {}
}

// Custom adapter for AccountState
class AccountStateAdapter implements StateAdapter<AccountState, TextState> {
  typeVersion(): number {
    return 2
  }

  fromRawState(raw: TextState): AccountState
  fromRawState<ST>(raw: TextState, stateType: new (...args: any[]) => ST): ST
  fromRawState(raw: TextState, stateType?: any): any {
    const data = JSON.parse(raw.data)

    // Upcast v1 to v2
    if (raw.typeVersion === 1) {
      return new AccountState(data.accountId, data.balance, 'checking')
    }

    return new AccountState(data.accountId, data.balance, data.accountType)
  }

  toRawState(id: string, state: AccountState, stateVersion: number, metadata?: Metadata): TextState
  toRawState(state: AccountState, stateVersion: number, metadata?: Metadata): TextState
  toRawState(
    idOrState: string | AccountState,
    stateOrVersion: AccountState | number,
    versionOrMetadata?: number | Metadata,
    metadata?: Metadata
  ): TextState {
    let id: string
    let state: AccountState
    let stateVersion: number
    let meta: Metadata

    if (typeof idOrState === 'string') {
      id = idOrState
      state = stateOrVersion as AccountState
      stateVersion = versionOrMetadata as number
      meta = metadata || Metadata.nullMetadata()
    } else {
      id = ''
      state = idOrState
      stateVersion = stateOrVersion as number
      meta = (versionOrMetadata as Metadata) || Metadata.nullMetadata()
    }

    const data = JSON.stringify({
      accountId: state.accountId,
      balance: state.balance,
      accountType: state.accountType
    })

    return new TextState(id || state.accountId, AccountState, this.typeVersion(), data, stateVersion, meta)
  }
}

describe('StateAdapterProvider', () => {
  beforeEach(() => {
    StateAdapterProvider.reset()
  })

  afterEach(() => {
    StateAdapterProvider.reset()
  })

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = StateAdapterProvider.instance()
      const instance2 = StateAdapterProvider.instance()

      expect(instance1).toBe(instance2)
    })

    it('should return same instance from deprecated getInstance()', () => {
      const instance1 = StateAdapterProvider.instance()
      const instance2 = StateAdapterProvider.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should reset singleton', () => {
      const instance1 = StateAdapterProvider.instance()
      StateAdapterProvider.reset()
      const instance2 = StateAdapterProvider.instance()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('registerAdapter', () => {
    it('should register an adapter', () => {
      const provider = StateAdapterProvider.instance()
      const adapter = new AccountStateAdapter()

      provider.registerAdapter('AccountState', adapter)

      expect(provider.hasAdapter('AccountState')).toBe(true)
    })

    it('should not have unregistered adapters', () => {
      const provider = StateAdapterProvider.instance()

      expect(provider.hasAdapter('UnknownState')).toBe(false)
    })

    it('should retrieve registered adapter', () => {
      const provider = StateAdapterProvider.instance()
      const adapter = new AccountStateAdapter()

      provider.registerAdapter('AccountState', adapter)

      expect(provider.getAdapter('AccountState')).toBe(adapter)
    })

    it('should return undefined for unregistered adapter', () => {
      const provider = StateAdapterProvider.instance()

      expect(provider.getAdapter('UnknownState')).toBeUndefined()
    })
  })

  describe('asRawState', () => {
    it('should convert using registered adapter', () => {
      const provider = StateAdapterProvider.instance()
      provider.registerAdapter('AccountState', new AccountStateAdapter())

      const state = new AccountState('acc-123', 1000, 'savings')
      const rawState = provider.asRawState<AccountState, TextState>(
        'acc-123',
        state,
        1
      )

      expect(rawState).toBeInstanceOf(TextState)
      expect(rawState.id).toBe('acc-123')
      expect(rawState.typeVersion).toBe(2)
      expect(rawState.dataVersion).toBe(1)

      const data = JSON.parse(rawState.data)
      expect(data.accountId).toBe('acc-123')
      expect(data.balance).toBe(1000)
      expect(data.accountType).toBe('savings')
    })

    it('should use default adapter when no custom adapter registered', () => {
      const provider = StateAdapterProvider.instance()

      const plainState = { name: 'test', value: 42 }
      const rawState = provider.asRawState('id-1', plainState, 1)

      expect(rawState).toBeInstanceOf(TextState)
      expect(rawState.id).toBe('id-1')
      expect(rawState.dataVersion).toBe(1)
    })

    it('should include metadata in raw state', () => {
      const provider = StateAdapterProvider.instance()
      provider.registerAdapter('AccountState', new AccountStateAdapter())

      const state = new AccountState('acc-123', 500, 'checking')
      const metadata = Metadata.withOperation('CREATE')
      const rawState = provider.asRawState<AccountState, TextState>(
        'acc-123',
        state,
        1,
        metadata
      )

      expect(rawState.hasMetadata()).toBe(true)
      expect(rawState.metadata.operation).toBe('CREATE')
    })
  })

  describe('fromRawState', () => {
    it('should convert using registered adapter', () => {
      const provider = StateAdapterProvider.instance()
      provider.registerAdapter('AccountState', new AccountStateAdapter())

      const rawData = JSON.stringify({
        accountId: 'acc-456',
        balance: 2000,
        accountType: 'savings'
      })
      const rawState = new TextState('acc-456', AccountState, 2, rawData, 5)

      const state = provider.fromRawState<AccountState, TextState>(
        rawState,
        'AccountState'
      )

      expect(state.accountId).toBe('acc-456')
      expect(state.balance).toBe(2000)
      expect(state.accountType).toBe('savings')
    })

    it('should upcast old version using registered adapter', () => {
      const provider = StateAdapterProvider.instance()
      provider.registerAdapter('AccountState', new AccountStateAdapter())

      // v1 data (no accountType)
      const rawData = JSON.stringify({
        accountId: 'acc-789',
        balance: 500
      })
      const rawState = new TextState('acc-789', AccountState, 1, rawData, 1)

      const state = provider.fromRawState<AccountState, TextState>(
        rawState,
        'AccountState'
      )

      expect(state.accountId).toBe('acc-789')
      expect(state.balance).toBe(500)
      expect(state.accountType).toBe('checking') // Default from upcast
    })

    it('should use default adapter when no custom adapter registered', () => {
      const provider = StateAdapterProvider.instance()

      const rawData = JSON.stringify({ key: 'value' })
      const rawState = new TextState('id-1', Object, 1, rawData, 1)

      const state = provider.fromRawState<{ key: string }, TextState>(rawState)

      expect(state.key).toBe('value')
    })

    it('should infer type from raw state when not specified', () => {
      const provider = StateAdapterProvider.instance()
      provider.registerAdapter('AccountState', new AccountStateAdapter())

      const rawData = JSON.stringify({
        accountId: 'acc-100',
        balance: 100,
        accountType: 'checking'
      })
      const rawState = new TextState('acc-100', AccountState, 2, rawData, 1)

      const state = provider.fromRawState<AccountState, TextState>(rawState)

      expect(state.accountId).toBe('acc-100')
    })
  })

  describe('round-trip conversion', () => {
    it('should preserve data through round-trip', () => {
      const provider = StateAdapterProvider.instance()
      provider.registerAdapter('AccountState', new AccountStateAdapter())

      const original = new AccountState('acc-round', 5000, 'premium')
      const metadata = Metadata.with('test-value', 'UPDATE')

      const rawState = provider.asRawState<AccountState, TextState>(
        'acc-round',
        original,
        3,
        metadata
      )

      const restored = provider.fromRawState<AccountState, TextState>(
        rawState,
        'AccountState'
      )

      expect(restored.accountId).toBe(original.accountId)
      expect(restored.balance).toBe(original.balance)
      expect(restored.accountType).toBe(original.accountType)
    })
  })
})
