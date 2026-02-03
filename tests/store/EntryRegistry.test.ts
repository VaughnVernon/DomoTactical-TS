// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EntryRegistry } from '../../src/store/EntryRegistry'
import { EntryAdapterProvider } from '../../src/store/EntryAdapterProvider'
import { ContextProfile } from '../../src/store/ContextProfile'
import { Source } from '../../src/store/Source'
import { DomainEvent } from '../../src/model/DomainEvent'
import { Command } from '../../src/model/Command'
import { TextEntry } from '../../src/store/TextEntry'
import { Metadata } from '../../src/store/Metadata'

// Test events
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

class OrderShipped extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly shippedAt: Date,
    public readonly trackingNumber: string
  ) {
    super()
  }

  override id(): string {
    return this.orderId
  }
}

class OrderWithMultipleDates extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    super()
  }

  override id(): string {
    return this.orderId
  }
}

// Test command
class ProcessPayment extends Command {
  constructor(
    public readonly paymentId: string,
    public readonly amount: number,
    public readonly processedAt: Date
  ) {
    super()
  }

  override id(): string {
    return this.paymentId
  }
}

/**
 * Helper to get the default context's provider.
 * EntryRegistry.register() delegates to ContextProfile.forContext('default').
 */
function getDefaultProvider(): EntryAdapterProvider {
  return EntryAdapterProvider.defaultProvider()
}

describe('EntryRegistry', () => {
  beforeEach(() => {
    ContextProfile.reset()
    EntryAdapterProvider.reset()
  })

  afterEach(() => {
    ContextProfile.reset()
    EntryAdapterProvider.reset()
  })

  describe('register() without transforms', () => {
    it('should register a DomainEvent type', () => {
      EntryRegistry.register(OrderPlaced)

      const provider = getDefaultProvider()
      expect(provider.hasAdapter(OrderPlaced)).toBe(true)
    })

    it('should register a Command type', () => {
      EntryRegistry.register(ProcessPayment)

      const provider = getDefaultProvider()
      expect(provider.hasAdapter(ProcessPayment)).toBe(true)
    })

    it('should reconstruct event with correct prototype', () => {
      EntryRegistry.register(OrderPlaced)

      const entry = new TextEntry(
        'entry-1',
        0, // globalPosition
        'OrderPlaced',
        1,
        JSON.stringify({ orderId: 'ord-001', customerId: 'cust-001', amount: 99.99, dateTimeSourced: Date.now(), sourceTypeVersion: 1 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const provider = getDefaultProvider()
      const reconstructed = provider.asSource<OrderPlaced>(entry)

      expect(reconstructed).toBeInstanceOf(OrderPlaced)
      expect(reconstructed.constructor).toBe(OrderPlaced)
      expect(reconstructed.orderId).toBe('ord-001')
      expect(reconstructed.customerId).toBe('cust-001')
      expect(reconstructed.amount).toBe(99.99)
    })

    it('should make methods work on reconstructed instance', () => {
      EntryRegistry.register(OrderPlaced)

      const entry = new TextEntry(
        'entry-1',
        1, // globalPosition
        'OrderPlaced',
        1,
        JSON.stringify({ orderId: 'ord-002', customerId: 'cust-002', amount: 50.00, dateTimeSourced: Date.now(), sourceTypeVersion: 1 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const provider = getDefaultProvider()
      const reconstructed = provider.asSource<OrderPlaced>(entry)

      // Instance methods should work
      expect(reconstructed.id()).toBe('ord-002')
      expect(reconstructed.typeName()).toBe('OrderPlaced')
      expect(reconstructed.isNull()).toBe(false)
    })
  })

  describe('register() with transforms', () => {
    it('should apply Date transform using Source.asDate', () => {
      EntryRegistry.register(OrderShipped, { shippedAt: Source.asDate })

      const dateStr = '2025-01-15T10:30:00.000Z'
      const entry = new TextEntry(
        'entry-1',
        2, // globalPosition
        'OrderShipped',
        1,
        JSON.stringify({ orderId: 'ord-003', shippedAt: dateStr, trackingNumber: 'TRK123', dateTimeSourced: Date.now(), sourceTypeVersion: 1 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const provider = getDefaultProvider()
      const reconstructed = provider.asSource<OrderShipped>(entry)

      expect(reconstructed).toBeInstanceOf(OrderShipped)
      expect(reconstructed.shippedAt).toBeInstanceOf(Date)
      expect(reconstructed.shippedAt.toISOString()).toBe(dateStr)
      expect(reconstructed.trackingNumber).toBe('TRK123')
    })

    it('should apply multiple Date transforms', () => {
      EntryRegistry.register(OrderWithMultipleDates, {
        createdAt: Source.asDate,
        updatedAt: Source.asDate
      })

      const created = '2025-01-01T00:00:00.000Z'
      const updated = '2025-01-15T12:00:00.000Z'
      const entry = new TextEntry(
        'entry-1',
        3, // globalPosition
        'OrderWithMultipleDates',
        1,
        JSON.stringify({ orderId: 'ord-004', createdAt: created, updatedAt: updated, dateTimeSourced: Date.now(), sourceTypeVersion: 1 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const provider = getDefaultProvider()
      const reconstructed = provider.asSource<OrderWithMultipleDates>(entry)

      expect(reconstructed.createdAt).toBeInstanceOf(Date)
      expect(reconstructed.updatedAt).toBeInstanceOf(Date)
      expect(reconstructed.createdAt.toISOString()).toBe(created)
      expect(reconstructed.updatedAt.toISOString()).toBe(updated)
    })

    it('should apply custom transform function', () => {
      EntryRegistry.register(OrderPlaced, {
        amount: (v) => Math.round(Number(v) * 100) // Convert to cents
      })

      const entry = new TextEntry(
        'entry-1',
        4, // globalPosition
        'OrderPlaced',
        1,
        JSON.stringify({ orderId: 'ord-005', customerId: 'cust-005', amount: '19.99', dateTimeSourced: Date.now(), sourceTypeVersion: 1 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const provider = getDefaultProvider()
      const reconstructed = provider.asSource<OrderPlaced>(entry)

      expect(reconstructed.amount).toBe(1999) // 19.99 * 100
    })

    it('should work with Command types', () => {
      EntryRegistry.register(ProcessPayment, { processedAt: Source.asDate })

      const dateStr = '2025-01-20T15:00:00.000Z'
      const entry = new TextEntry(
        'entry-1',
        5, // globalPosition
        'ProcessPayment',
        1,
        JSON.stringify({ paymentId: 'pay-001', amount: 100.00, processedAt: dateStr, dateTimeSourced: Date.now(), sourceTypeVersion: 1 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const provider = getDefaultProvider()
      const reconstructed = provider.asSource<ProcessPayment>(entry)

      expect(reconstructed).toBeInstanceOf(ProcessPayment)
      expect(reconstructed.processedAt).toBeInstanceOf(Date)
      expect(reconstructed.processedAt.toISOString()).toBe(dateStr)
    })
  })

  describe('round-trip serialization', () => {
    it('should serialize and deserialize correctly', () => {
      EntryRegistry.register(OrderPlaced)

      const original = new OrderPlaced('ord-100', 'cust-100', 250.00)

      const provider = getDefaultProvider()
      const entry = provider.asEntry(original, 1, Metadata.nullMetadata())
      const reconstructed = provider.asSource<OrderPlaced>(entry)

      expect(reconstructed).toBeInstanceOf(OrderPlaced)
      expect(reconstructed.orderId).toBe(original.orderId)
      expect(reconstructed.customerId).toBe(original.customerId)
      expect(reconstructed.amount).toBe(original.amount)
    })

    it('should round-trip with Date transforms', () => {
      EntryRegistry.register(OrderShipped, { shippedAt: Source.asDate })

      const original = new OrderShipped('ord-101', new Date('2025-01-25T10:00:00.000Z'), 'TRK999')

      const provider = getDefaultProvider()
      const entry = provider.asEntry(original, 1, Metadata.nullMetadata())
      const reconstructed = provider.asSource<OrderShipped>(entry)

      expect(reconstructed).toBeInstanceOf(OrderShipped)
      expect(reconstructed.orderId).toBe(original.orderId)
      expect(reconstructed.shippedAt.toISOString()).toBe(original.shippedAt.toISOString())
      expect(reconstructed.trackingNumber).toBe(original.trackingNumber)
    })
  })

  describe('multiple registrations', () => {
    it('should register multiple types', () => {
      EntryRegistry.register(OrderPlaced)
      EntryRegistry.register(OrderShipped, { shippedAt: Source.asDate })
      EntryRegistry.register(ProcessPayment, { processedAt: Source.asDate })

      const provider = getDefaultProvider()
      expect(provider.hasAdapter(OrderPlaced)).toBe(true)
      expect(provider.hasAdapter(OrderShipped)).toBe(true)
      expect(provider.hasAdapter(ProcessPayment)).toBe(true)
    })
  })
})
