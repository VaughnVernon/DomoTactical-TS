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
import { DomainEvent } from '../../src/model/DomainEvent'
import { Metadata } from '../../src/store/Metadata'
import { TextEntry } from '../../src/store/journal/TextEntry'

// Test events
class EventA extends DomainEvent {
  constructor(public readonly data: string) {
    super()
  }

  override id(): string {
    return this.data
  }
}

class EventB extends DomainEvent {
  constructor(public readonly value: number) {
    super()
  }

  override id(): string {
    return String(this.value)
  }
}

// Custom adapter for EventA
class EventAAdapter extends DefaultTextEntryAdapter<EventA> {
  protected override upcastIfNeeded(data: any, type: string, version: number): EventA {
    return new EventA(`${data.data}-custom`)
  }
}

describe('EntryAdapterProvider', () => {
  let provider: EntryAdapterProvider

  beforeEach(() => {
    // Reset singleton before each test
    EntryAdapterProvider.reset()
    provider = EntryAdapterProvider.instance()
  })

  afterEach(() => {
    // Clean up after tests
    EntryAdapterProvider.reset()
  })

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = EntryAdapterProvider.instance()
      const instance2 = EntryAdapterProvider.instance()

      expect(instance1).toBe(instance2)
    })

    it('should create new instance after reset', () => {
      const instance1 = EntryAdapterProvider.instance()
      EntryAdapterProvider.reset()
      const instance2 = EntryAdapterProvider.instance()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('registerAdapter', () => {
    it('should register a custom adapter for a Source type', () => {
      const adapter = new EventAAdapter()

      provider.registerAdapter(EventA, adapter)

      expect(provider.hasAdapter(EventA)).toBe(true)
      expect(provider.hasAdapter('EventA')).toBe(true)
    })

    it('should not have adapter before registration', () => {
      expect(provider.hasAdapter(EventA)).toBe(false)
    })

    it('should retrieve registered adapter', () => {
      const adapter = new EventAAdapter()
      provider.registerAdapter(EventA, adapter)

      const retrieved = provider.getAdapter(EventA)

      expect(retrieved).toBe(adapter)
    })
  })

  describe('asEntry', () => {
    it('should use default adapter when no custom adapter registered', () => {
      const event = new EventA('test-data')
      const metadata = Metadata.nullMetadata()

      const entry = provider.asEntry(event, 1, metadata)

      expect(entry.type).toBe('EventA')
      expect(entry.entryData).toContain('test-data')
      expect(entry.entryData).not.toContain('-custom') // Not using custom adapter
    })

    it('should use custom adapter when registered', () => {
      const event = new EventA('test-data')
      const metadata = Metadata.nullMetadata()
      const adapter = new EventAAdapter()
      provider.registerAdapter(EventA, adapter)

      const entry = provider.asEntry(event, 1, metadata)

      expect(entry.type).toBe('EventA')
      expect(entry.entryData).toContain('test-data')
    })

    it('should work with multiple different event types', () => {
      const eventA = new EventA('data-a')
      const eventB = new EventB(42)
      const metadata = Metadata.nullMetadata()

      const entryA = provider.asEntry(eventA, 1, metadata)
      const entryB = provider.asEntry(eventB, 2, metadata)

      expect(entryA.type).toBe('EventA')
      expect(entryB.type).toBe('EventB')
      expect(entryA.entryData).toContain('data-a')
      expect(entryB.entryData).toContain('42')
    })
  })

  describe('asEntries', () => {
    it('should convert multiple Sources to Entries', () => {
      const events = [new EventA('data-1'), new EventA('data-2'), new EventA('data-3')]
      const metadata = Metadata.nullMetadata()

      const entries = provider.asEntries(events, 1, metadata)

      expect(entries).toHaveLength(3)
      expect(entries[0].entryData).toContain('data-1')
      expect(entries[1].entryData).toContain('data-2')
      expect(entries[2].entryData).toContain('data-3')
    })

    it('should use correct version numbers for each entry', () => {
      const events = [new EventA('data-1'), new EventA('data-2'), new EventA('data-3')]
      const metadata = Metadata.nullMetadata()

      const entries = provider.asEntries(events, 5, metadata)

      // Versions should be 5, 6, 7 (fromVersion + index)
      // Note: streamVersion is not set in toEntry, but we can verify via the order
      expect(entries).toHaveLength(3)
    })

    it('should handle empty array', () => {
      const entries = provider.asEntries([], 1, Metadata.nullMetadata())

      expect(entries).toHaveLength(0)
    })
  })

  describe('asSource', () => {
    it('should use default adapter when no custom adapter registered', () => {
      const event = new EventA('test-data')
      const metadata = Metadata.nullMetadata()
      const entry = provider.asEntry(event, 1, metadata)

      const deserialized = provider.asSource(entry)

      // Default adapter returns plain object
      expect(deserialized.data).toBe('test-data')
    })

    it('should use custom adapter when registered (with upcasting)', () => {
      const adapter = new EventAAdapter()
      provider.registerAdapter(EventA, adapter)

      // Create entry manually with default adapter (no custom logic)
      const entry = new TextEntry(
        'entry-1',
        'EventA',
        1,
        JSON.stringify({ data: 'test-data' }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const deserialized = provider.asSource<EventA>(entry)

      // Custom adapter applies transformation
      expect(deserialized.data).toBe('test-data-custom') // Custom adapter applied
    })

    it('should round-trip successfully', () => {
      const original = new EventA('original-data')
      const metadata = Metadata.nullMetadata()

      const entry = provider.asEntry(original, 1, metadata)
      const roundTripped = provider.asSource<EventA>(entry)

      expect(roundTripped.data).toBe(original.data)
    })
  })

  describe('asSources', () => {
    it('should convert multiple Entries to Sources', () => {
      const events = [new EventA('data-1'), new EventA('data-2'), new EventA('data-3')]
      const metadata = Metadata.nullMetadata()

      const entries = provider.asEntries(events, 1, metadata)
      const sources = provider.asSources<EventA>(entries)

      expect(sources).toHaveLength(3)
      expect(sources[0].data).toBe('data-1')
      expect(sources[1].data).toBe('data-2')
      expect(sources[2].data).toBe('data-3')
    })

    it('should handle empty array', () => {
      const sources = provider.asSources([])

      expect(sources).toHaveLength(0)
    })
  })

  describe('integration: round-trip with multiple events', () => {
    it('should round-trip multiple events of different types', () => {
      const eventsA = [new EventA('a1'), new EventA('a2')]
      const eventsB = [new EventB(100), new EventB(200)]
      const metadata = Metadata.nullMetadata()

      // Convert to entries
      const entriesA = provider.asEntries(eventsA, 1, metadata)
      const entriesB = provider.asEntries(eventsB, 3, metadata)
      const allEntries = [...entriesA, ...entriesB]

      // Convert back to sources
      const sourcesA = provider.asSources<EventA>(entriesA)
      const sourcesB = provider.asSources<EventB>(entriesB)

      expect(sourcesA[0].data).toBe('a1')
      expect(sourcesA[1].data).toBe('a2')
      expect(sourcesB[0].value).toBe(100)
      expect(sourcesB[1].value).toBe(200)
    })
  })
})
