// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach } from 'vitest'
import { DefaultTextEntryAdapter } from '../../src/store/DefaultTextEntryAdapter'
import { DomainEvent } from '../../src/model/DomainEvent'
import { Metadata } from '../../src/store/Metadata'
import { TextEntry } from '../../src/store/journal/TextEntry'

// Test event for adapter tests
class TestEvent extends DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly data: string,
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }

  override id(): string {
    return this.eventId
  }
}

// Test event with version for upcasting tests
class VersionedEvent extends DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly fieldV1: string,
    public readonly fieldV2?: string // Added in v2
  ) {
    super()
  }

  override id(): string {
    return this.eventId
  }
}

// Custom adapter with upcasting
class VersionedEventAdapter extends DefaultTextEntryAdapter<VersionedEvent> {
  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): VersionedEvent {
    // v2 is current
    if (version === 2) {
      return new VersionedEvent(data.eventId, data.fieldV1, data.fieldV2)
    }

    // Upcast v1 → v2
    if (version === 1) {
      return new VersionedEvent(
        data.eventId,
        data.fieldV1,
        'default-v2-value' // v1 didn't have fieldV2
      )
    }

    throw new Error(`Unsupported version: ${version}`)
  }
}

describe('DefaultTextEntryAdapter', () => {
  let adapter: DefaultTextEntryAdapter<TestEvent>
  let metadata: Metadata

  beforeEach(() => {
    adapter = new DefaultTextEntryAdapter<TestEvent>()
    metadata = Metadata.nullMetadata()
  })

  describe('toEntry', () => {
    it('should serialize Source to TextEntry (2-arg overload)', () => {
      const event = new TestEvent('event-1', 'test data')

      const entry = adapter.toEntry(event, metadata)

      expect(entry).toBeInstanceOf(TextEntry)
      expect(entry.type).toBe('TestEvent')
      expect(entry.typeVersion).toBe(event.sourceTypeVersion)
      expect(entry.entryData).toContain('event-1')
      expect(entry.entryData).toContain('test data')
      expect(entry.metadata).toBeDefined()
    })

    it('should serialize Source to TextEntry (4-arg overload)', () => {
      const event = new TestEvent('event-1', 'test data')

      const entry = adapter.toEntry(event, 5, 'entry-123', metadata)

      expect(entry).toBeInstanceOf(TextEntry)
      expect(entry.id).toBe('entry-123')
      expect(entry.type).toBe('TestEvent')
      expect(entry.typeVersion).toBe(event.sourceTypeVersion)
      expect(entry.streamVersion).toBe(5)
      expect(entry.entryData).toContain('event-1')
      expect(entry.entryData).toContain('test data')
    })

    it('should serialize with custom metadata', () => {
      const event = new TestEvent('event-1', 'test data')
      const customMetadata = Metadata.withProperties(
        new Map([['userId', 'user-123']])
      )

      const entry = adapter.toEntry(event, 1, 'entry-1', customMetadata)

      expect(entry.metadata).toContain('userId')
      expect(entry.metadata).toContain('user-123')
    })

    it('should handle null metadata (2-arg overload)', () => {
      const event = new TestEvent('event-1', 'test data')

      const entry = adapter.toEntry(event)

      expect(entry.metadata).toBeDefined()
      expect(entry.entryData).toContain('event-1')
    })
  })

  describe('fromEntry', () => {
    it('should deserialize TextEntry to plain object (default behavior)', () => {
      const event = new TestEvent('event-1', 'test data')
      const entry = adapter.toEntry(event, 1, 'entry-1', metadata)

      const deserialized = adapter.fromEntry(entry)

      // Default adapter returns plain object from JSON.parse
      expect(deserialized.eventId).toBe('event-1')
      expect(deserialized.data).toBe('test data')
      // Note: Plain object doesn't have methods, only data
    })

    it('should round-trip successfully', () => {
      const original = new TestEvent('event-123', 'important data', new Date('2025-01-01'))
      const entry = adapter.toEntry(original, 2, 'entry-456', metadata)
      const roundTripped = adapter.fromEntry(entry)

      expect(roundTripped.eventId).toBe(original.eventId)
      expect(roundTripped.data).toBe(original.data)
      expect(new Date(roundTripped.timestamp).toISOString()).toBe(original.timestamp.toISOString())
    })
  })

  describe('upcastIfNeeded', () => {
    it('should use default implementation (no upcasting)', () => {
      const event = new TestEvent('event-1', 'test data')
      const entry = adapter.toEntry(event, 1, 'entry-1', metadata)

      const deserialized = adapter.fromEntry(entry)

      expect(deserialized.eventId).toBe('event-1')
      expect(deserialized.data).toBe('test data')
    })

    it('should upcast v1 to v2 when using custom adapter', () => {
      const versionedAdapter = new VersionedEventAdapter()

      // Create a v1 entry manually
      const v1Entry = new TextEntry(
        'entry-1',
        'VersionedEvent',
        1, // v1
        JSON.stringify({ eventId: 'event-1', fieldV1: 'value1' }),
        1,
        JSON.stringify(metadata)
      )

      const upcasted = versionedAdapter.fromEntry(v1Entry)

      expect(upcasted.eventId).toBe('event-1')
      expect(upcasted.fieldV1).toBe('value1')
      expect(upcasted.fieldV2).toBe('default-v2-value') // Upcasted
    })

    it('should not upcast v2 (current version)', () => {
      const versionedAdapter = new VersionedEventAdapter()

      // Create a v2 entry
      const v2Entry = new TextEntry(
        'entry-1',
        'VersionedEvent',
        2, // v2 (current)
        JSON.stringify({ eventId: 'event-1', fieldV1: 'value1', fieldV2: 'value2' }),
        1,
        JSON.stringify(metadata)
      )

      const result = versionedAdapter.fromEntry(v2Entry)

      expect(result.eventId).toBe('event-1')
      expect(result.fieldV1).toBe('value1')
      expect(result.fieldV2).toBe('value2') // Not upcasted
    })

    it('should throw error for unsupported version', () => {
      const versionedAdapter = new VersionedEventAdapter()

      // Create a v99 entry (unsupported)
      const unsupportedEntry = new TextEntry(
        'entry-1',
        'VersionedEvent',
        99, // Unsupported version
        JSON.stringify({ eventId: 'event-1', fieldV1: 'value1' }),
        1,
        JSON.stringify(metadata)
      )

      expect(() => versionedAdapter.fromEntry(unsupportedEntry)).toThrow(
        'Unsupported version: 99'
      )
    })
  })
})
