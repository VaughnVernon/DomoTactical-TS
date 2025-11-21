// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EntryAdapterProvider } from '../../src/store/EntryAdapterProvider'
import { DefaultTextEntryAdapter } from '../../src/store/DefaultTextEntryAdapter'
import { TextEntry } from '../../src/store/journal/TextEntry'
import { Metadata } from '../../src/store/Metadata'
import { DomainEvent } from '../../src/model/DomainEvent'

/**
 * Test domain events demonstrating schema evolution.
 */

// UserRegistered event with multiple versions
class UserRegistered extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name?: string, // Added in v2
    public readonly role?: string // Added in v3
  ) {
    super(3) // Current version is 3
  }

  override id(): string {
    return this.userId
  }
}

// OrderPlaced event with multiple versions
class OrderPlaced extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    public readonly currency?: string // Added in v2
  ) {
    super(2) // Current version is 2
  }

  override id(): string {
    return this.orderId
  }
}

/**
 * Custom adapter for UserRegistered with v1 → v2 → v3 upcasting.
 */
class UserRegisteredAdapter extends DefaultTextEntryAdapter<UserRegistered> {
  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): UserRegistered {
    // v3 is current
    if (version === 3) {
      return new UserRegistered(data.userId, data.email, data.name, data.role)
    }

    // Upcast v1 → v3
    if (version === 1) {
      return new UserRegistered(
        data.userId,
        data.email,
        'Unknown', // v1 didn't have name
        'user' // v1 didn't have role
      )
    }

    // Upcast v2 → v3
    if (version === 2) {
      return new UserRegistered(
        data.userId,
        data.email,
        data.name,
        'user' // v2 didn't have role
      )
    }

    throw new Error(`Unsupported UserRegistered version: ${version}`)
  }
}

/**
 * Custom adapter for OrderPlaced with v1 → v2 upcasting.
 */
class OrderPlacedAdapter extends DefaultTextEntryAdapter<OrderPlaced> {
  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): OrderPlaced {
    // v2 is current
    if (version === 2) {
      return new OrderPlaced(data.orderId, data.customerId, data.totalAmount, data.currency)
    }

    // Upcast v1 → v2
    if (version === 1) {
      return new OrderPlaced(
        data.orderId,
        data.customerId,
        data.totalAmount,
        'USD' // v1 didn't have currency, default to USD
      )
    }

    throw new Error(`Unsupported OrderPlaced version: ${version}`)
  }
}

/**
 * Test suite demonstrating schema evolution and upcasting.
 */
describe('Schema Evolution with Adapters', () => {
  let provider: EntryAdapterProvider

  beforeEach(() => {
    EntryAdapterProvider.reset()
    provider = EntryAdapterProvider.getInstance()

    // Register custom adapters
    provider.registerAdapter(UserRegistered, new UserRegisteredAdapter())
    provider.registerAdapter(OrderPlaced, new OrderPlacedAdapter())
  })

  afterEach(() => {
    EntryAdapterProvider.reset()
  })

  describe('UserRegistered evolution (v1 → v2 → v3)', () => {
    it('should upcast v1 event (no name, no role)', () => {
      const v1Entry = new TextEntry(
        'e1',
        'UserRegistered',
        1, // v1
        JSON.stringify({ userId: 'user-1', email: 'alice@example.com' }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const event = provider.asSource<UserRegistered>(v1Entry)

      expect(event.userId).toBe('user-1')
      expect(event.email).toBe('alice@example.com')
      expect(event.name).toBe('Unknown') // Upcasted
      expect(event.role).toBe('user') // Upcasted
    })

    it('should upcast v2 event (has name, no role)', () => {
      const v2Entry = new TextEntry(
        'e2',
        'UserRegistered',
        2, // v2
        JSON.stringify({ userId: 'user-2', email: 'bob@example.com', name: 'Bob' }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const event = provider.asSource<UserRegistered>(v2Entry)

      expect(event.userId).toBe('user-2')
      expect(event.email).toBe('bob@example.com')
      expect(event.name).toBe('Bob') // Preserved
      expect(event.role).toBe('user') // Upcasted
    })

    it('should not upcast v3 event (current version)', () => {
      const v3Entry = new TextEntry(
        'e3',
        'UserRegistered',
        3, // v3 (current)
        JSON.stringify({
          userId: 'user-3',
          email: 'charlie@example.com',
          name: 'Charlie',
          role: 'admin'
        }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const event = provider.asSource<UserRegistered>(v3Entry)

      expect(event.userId).toBe('user-3')
      expect(event.email).toBe('charlie@example.com')
      expect(event.name).toBe('Charlie')
      expect(event.role).toBe('admin')
    })
  })

  describe('OrderPlaced evolution (v1 → v2)', () => {
    it('should upcast v1 event (no currency)', () => {
      const v1Entry = new TextEntry(
        'e10',
        'OrderPlaced',
        1, // v1
        JSON.stringify({ orderId: 'order-1', customerId: 'cust-1', totalAmount: 99.99 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const event = provider.asSource<OrderPlaced>(v1Entry)

      expect(event.orderId).toBe('order-1')
      expect(event.customerId).toBe('cust-1')
      expect(event.totalAmount).toBe(99.99)
      expect(event.currency).toBe('USD') // Upcasted with default
    })

    it('should not upcast v2 event (current version)', () => {
      const v2Entry = new TextEntry(
        'e11',
        'OrderPlaced',
        2, // v2 (current)
        JSON.stringify({
          orderId: 'order-2',
          customerId: 'cust-2',
          totalAmount: 49.99,
          currency: 'EUR'
        }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const event = provider.asSource<OrderPlaced>(v2Entry)

      expect(event.orderId).toBe('order-2')
      expect(event.customerId).toBe('cust-2')
      expect(event.totalAmount).toBe(49.99)
      expect(event.currency).toBe('EUR')
    })
  })

  describe('Mixed version stream', () => {
    it('should handle stream with events of different versions', () => {
      const entries = [
        // v1 UserRegistered
        new TextEntry(
          'e1',
          'UserRegistered',
          1,
          JSON.stringify({ userId: 'u1', email: 'a@test.com' }),
          1,
          JSON.stringify(Metadata.nullMetadata())
        ),
        // v1 OrderPlaced
        new TextEntry(
          'e2',
          'OrderPlaced',
          1,
          JSON.stringify({ orderId: 'o1', customerId: 'u1', totalAmount: 100 }),
          2,
          JSON.stringify(Metadata.nullMetadata())
        ),
        // v2 UserRegistered
        new TextEntry(
          'e3',
          'UserRegistered',
          2,
          JSON.stringify({ userId: 'u2', email: 'b@test.com', name: 'Bob' }),
          3,
          JSON.stringify(Metadata.nullMetadata())
        ),
        // v3 UserRegistered (current)
        new TextEntry(
          'e4',
          'UserRegistered',
          3,
          JSON.stringify({ userId: 'u3', email: 'c@test.com', name: 'Charlie', role: 'admin' }),
          4,
          JSON.stringify(Metadata.nullMetadata())
        ),
        // v2 OrderPlaced (current)
        new TextEntry(
          'e5',
          'OrderPlaced',
          2,
          JSON.stringify({ orderId: 'o2', customerId: 'u3', totalAmount: 200, currency: 'GBP' }),
          5,
          JSON.stringify(Metadata.nullMetadata())
        )
      ]

      const sources = provider.asSources(entries)

      expect(sources).toHaveLength(5)

      // v1 UserRegistered → v3
      const event1 = sources[0] as unknown as UserRegistered
      expect(event1.userId).toBe('u1')
      expect(event1.name).toBe('Unknown')
      expect(event1.role).toBe('user')

      // v1 OrderPlaced → v2
      const event2 = sources[1] as unknown as OrderPlaced
      expect(event2.orderId).toBe('o1')
      expect(event2.currency).toBe('USD')

      // v2 UserRegistered → v3
      const event3 = sources[2] as unknown as UserRegistered
      expect(event3.userId).toBe('u2')
      expect(event3.name).toBe('Bob')
      expect(event3.role).toBe('user')

      // v3 UserRegistered (current)
      const event4 = sources[3] as unknown as UserRegistered
      expect(event4.userId).toBe('u3')
      expect(event4.role).toBe('admin')

      // v2 OrderPlaced (current)
      const event5 = sources[4] as unknown as OrderPlaced
      expect(event5.currency).toBe('GBP')
    })
  })
})
