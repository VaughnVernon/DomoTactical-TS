// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ContextProfile } from '../../src/store/ContextProfile'
import { EntryAdapterProvider } from '../../src/store/EntryAdapterProvider'
import { Source } from '../../src/store/Source'
import { DomainEvent } from '../../src/model/DomainEvent'
import { TextEntry } from '../../src/store/journal/TextEntry'
import { Metadata } from '../../src/store/Metadata'

// Test events for different contexts
class AccountOpened extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly owner: string,
    public readonly initialBalance: number
  ) {
    super()
  }

  override id(): string {
    return this.accountId
  }
}

class FundsDeposited extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly amount: number,
    public readonly depositedAt: Date
  ) {
    super()
  }

  override id(): string {
    return this.accountId
  }
}

class AccountClosed extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly closedAt: Date
  ) {
    super()
  }

  override id(): string {
    return this.accountId
  }
}

class OrderPlaced extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly amount: number
  ) {
    super()
  }

  override id(): string {
    return this.orderId
  }
}

describe('ContextProfile', () => {
  beforeEach(() => {
    ContextProfile.reset()
    EntryAdapterProvider.reset()
  })

  afterEach(() => {
    ContextProfile.reset()
    EntryAdapterProvider.reset()
  })

  describe('forContext()', () => {
    it('should create new profile for new context', () => {
      const profile = ContextProfile.forContext('bank')

      expect(profile).toBeDefined()
      expect(profile.contextName).toBe('bank')
    })

    it('should return same instance for same context name', () => {
      const profile1 = ContextProfile.forContext('bank')
      const profile2 = ContextProfile.forContext('bank')

      expect(profile1).toBe(profile2)
    })

    it('should return different instances for different context names', () => {
      const bankProfile = ContextProfile.forContext('bank')
      const orderProfile = ContextProfile.forContext('orders')

      expect(bankProfile).not.toBe(orderProfile)
      expect(bankProfile.contextName).toBe('bank')
      expect(orderProfile.contextName).toBe('orders')
    })
  })

  describe('get()', () => {
    it('should return undefined for non-existent context', () => {
      const profile = ContextProfile.get('non-existent')

      expect(profile).toBeUndefined()
    })

    it('should return existing profile without creating one', () => {
      // First create it
      const created = ContextProfile.forContext('bank')

      // Then get it
      const retrieved = ContextProfile.get('bank')

      expect(retrieved).toBe(created)
    })
  })

  describe('reset()', () => {
    it('should clear all profiles', () => {
      ContextProfile.forContext('bank')
      ContextProfile.forContext('orders')

      ContextProfile.reset()

      expect(ContextProfile.get('bank')).toBeUndefined()
      expect(ContextProfile.get('orders')).toBeUndefined()
    })
  })

  describe('register()', () => {
    it('should return this for chaining', () => {
      const profile = ContextProfile.forContext('bank')

      const result = profile.register(AccountOpened)

      expect(result).toBe(profile)
    })

    it('should register adapter with context-specific provider', () => {
      const profile = ContextProfile.forContext('bank')
        .register(AccountOpened)

      expect(profile.entryAdapterProvider().hasAdapter(AccountOpened)).toBe(true)
    })

    it('should allow fluent chaining', () => {
      const profile = ContextProfile.forContext('bank')
        .register(AccountOpened)
        .register(FundsDeposited, { depositedAt: Source.asDate })
        .register(AccountClosed, { closedAt: Source.asDate })

      const provider = profile.entryAdapterProvider()
      expect(provider.hasAdapter(AccountOpened)).toBe(true)
      expect(provider.hasAdapter(FundsDeposited)).toBe(true)
      expect(provider.hasAdapter(AccountClosed)).toBe(true)
    })

    it('should apply transforms during deserialization', () => {
      ContextProfile.forContext('bank')
        .register(FundsDeposited, { depositedAt: Source.asDate })

      const dateStr = '2025-01-15T10:30:00.000Z'
      const entry = new TextEntry(
        'entry-1',
        'FundsDeposited',
        1,
        JSON.stringify({
          accountId: 'acc-001',
          amount: 100,
          depositedAt: dateStr,
          dateTimeSourced: Date.now(),
          sourceTypeVersion: 1
        }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const provider = ContextProfile.get('bank')!.entryAdapterProvider()
      const reconstructed = provider.asSource<FundsDeposited>(entry)

      expect(reconstructed).toBeInstanceOf(FundsDeposited)
      expect(reconstructed.depositedAt).toBeInstanceOf(Date)
      expect(reconstructed.depositedAt.toISOString()).toBe(dateStr)
    })
  })

  describe('registerAll()', () => {
    it('should register multiple types without transforms', () => {
      const profile = ContextProfile.forContext('bank')
        .registerAll(AccountOpened, AccountClosed)

      const provider = profile.entryAdapterProvider()
      expect(provider.hasAdapter(AccountOpened)).toBe(true)
      expect(provider.hasAdapter(AccountClosed)).toBe(true)
    })

    it('should return this for chaining', () => {
      const profile = ContextProfile.forContext('bank')

      const result = profile.registerAll(AccountOpened, AccountClosed)

      expect(result).toBe(profile)
    })

    it('should allow chaining with register()', () => {
      const profile = ContextProfile.forContext('bank')
        .registerAll(AccountOpened)
        .register(FundsDeposited, { depositedAt: Source.asDate })

      const provider = profile.entryAdapterProvider()
      expect(provider.hasAdapter(AccountOpened)).toBe(true)
      expect(provider.hasAdapter(FundsDeposited)).toBe(true)
    })
  })

  describe('registerSources()', () => {
    it('should register from SourceTypeSpec array', () => {
      const profile = ContextProfile.forContext('bank')
        .registerSources([
          { type: AccountOpened },
          { type: FundsDeposited, transforms: { depositedAt: Source.asDate } },
          { type: AccountClosed, transforms: { closedAt: Source.asDate } }
        ])

      const provider = profile.entryAdapterProvider()
      expect(provider.hasAdapter(AccountOpened)).toBe(true)
      expect(provider.hasAdapter(FundsDeposited)).toBe(true)
      expect(provider.hasAdapter(AccountClosed)).toBe(true)
    })

    it('should return this for chaining', () => {
      const profile = ContextProfile.forContext('bank')

      const result = profile.registerSources([{ type: AccountOpened }])

      expect(result).toBe(profile)
    })
  })

  describe('entryAdapterProvider()', () => {
    it('should return context-specific provider', () => {
      const bankProfile = ContextProfile.forContext('bank')
        .register(AccountOpened)

      const orderProfile = ContextProfile.forContext('orders')
        .register(OrderPlaced)

      // Each context has its own provider
      expect(bankProfile.entryAdapterProvider()).not.toBe(orderProfile.entryAdapterProvider())

      // Adapters are context-specific
      expect(bankProfile.entryAdapterProvider().hasAdapter(AccountOpened)).toBe(true)
      expect(bankProfile.entryAdapterProvider().hasAdapter(OrderPlaced)).toBe(false)

      expect(orderProfile.entryAdapterProvider().hasAdapter(OrderPlaced)).toBe(true)
      expect(orderProfile.entryAdapterProvider().hasAdapter(AccountOpened)).toBe(false)
    })
  })

  describe('context isolation', () => {
    it('should maintain independent registries per context', () => {
      // Register different types in different contexts
      ContextProfile.forContext('bank')
        .register(AccountOpened)
        .register(FundsDeposited, { depositedAt: Source.asDate })

      ContextProfile.forContext('orders')
        .register(OrderPlaced)

      // Verify isolation
      const bankProvider = ContextProfile.get('bank')!.entryAdapterProvider()
      const orderProvider = ContextProfile.get('orders')!.entryAdapterProvider()

      // Bank context has bank types
      expect(bankProvider.hasAdapter(AccountOpened)).toBe(true)
      expect(bankProvider.hasAdapter(FundsDeposited)).toBe(true)
      expect(bankProvider.hasAdapter(OrderPlaced)).toBe(false)

      // Order context has order types
      expect(orderProvider.hasAdapter(OrderPlaced)).toBe(true)
      expect(orderProvider.hasAdapter(AccountOpened)).toBe(false)
    })

    it('should not affect global singleton', () => {
      // Register in a context
      ContextProfile.forContext('bank')
        .register(AccountOpened)

      // Global singleton should not have this adapter
      expect(EntryAdapterProvider.instance().hasAdapter(AccountOpened)).toBe(false)
    })
  })

  describe('round-trip serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const profile = ContextProfile.forContext('bank')
        .register(AccountOpened)

      const original = new AccountOpened('acc-001', 'Alice', 1000)

      const provider = profile.entryAdapterProvider()
      const entry = provider.asEntry(original, 1, Metadata.nullMetadata())
      const reconstructed = provider.asSource<AccountOpened>(entry)

      expect(reconstructed).toBeInstanceOf(AccountOpened)
      expect(reconstructed.accountId).toBe(original.accountId)
      expect(reconstructed.owner).toBe(original.owner)
      expect(reconstructed.initialBalance).toBe(original.initialBalance)
    })

    it('should round-trip with Date transforms', () => {
      const profile = ContextProfile.forContext('bank')
        .register(FundsDeposited, { depositedAt: Source.asDate })

      const original = new FundsDeposited('acc-001', 500, new Date('2025-01-25T10:00:00.000Z'))

      const provider = profile.entryAdapterProvider()
      const entry = provider.asEntry(original, 1, Metadata.nullMetadata())
      const reconstructed = provider.asSource<FundsDeposited>(entry)

      expect(reconstructed).toBeInstanceOf(FundsDeposited)
      expect(reconstructed.accountId).toBe(original.accountId)
      expect(reconstructed.amount).toBe(original.amount)
      expect(reconstructed.depositedAt.toISOString()).toBe(original.depositedAt.toISOString())
    })
  })

  describe('test isolation workflow', () => {
    it('should allow clean test setup with reset()', () => {
      // First "test" registers some types
      ContextProfile.forContext('bank')
        .register(AccountOpened)

      expect(ContextProfile.get('bank')).toBeDefined()

      // Simulate test teardown
      ContextProfile.reset()
      EntryAdapterProvider.reset()

      // Second "test" starts fresh
      expect(ContextProfile.get('bank')).toBeUndefined()

      // Can register again without conflicts
      ContextProfile.forContext('bank')
        .register(FundsDeposited, { depositedAt: Source.asDate })

      const provider = ContextProfile.get('bank')!.entryAdapterProvider()
      expect(provider.hasAdapter(FundsDeposited)).toBe(true)
      expect(provider.hasAdapter(AccountOpened)).toBe(false)
    })
  })
})
