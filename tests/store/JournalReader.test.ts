// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol } from 'domo-actors'
import { TestJournalSupervisor, TestSupervisor } from '../../src/testkit'
import { Journal } from '../../src/store/journal'
import { Metadata } from '../../src/store/Metadata'
import { DomainEvent } from '../../src/model/DomainEvent'
import { InMemoryJournal } from '../../src/store/journal/inmemory/InMemoryJournal'

/** Supervisor name for test journal supervisor */
const TEST_SUPERVISOR_NAME = 'test-journal-supervisor'

/**
 * Wait for the supervisor to have processed the expected number of error recoveries.
 */
async function waitForErrorRecovery(
  supervisor: TestSupervisor,
  expectedCount: number,
  timeoutMs: number = 5000
): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const count = await supervisor.errorRecoveryCount()
    if (count >= expectedCount) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error(`Timeout waiting for ${expectedCount} error recoveries`)
}

/**
 * Test events for journal reader tests.
 */
class TestEvent extends DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly data: string
  ) {
    super(1)
  }

  override id(): string {
    return this.eventId
  }
}


/**
 * Test suite for JournalReader interface and InMemoryJournalReader implementation.
 */
describe('JournalReader', () => {
  let journal: Journal<string>
  let metadata: Metadata
  let supervisor: TestSupervisor

  beforeEach(() => {
    // Create supervisor - the type() must match the supervisor name used when creating other actors
    // because Environment.supervisor() looks up by type in the directory
    const supervisorProtocol: Protocol = {
      type: () => TEST_SUPERVISOR_NAME,
      instantiator: () => ({ instantiate: () => new TestJournalSupervisor() })
    }
    supervisor = stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default')

    // Create journal under the test supervisor - JournalReader will inherit this supervisor
    const journalProtocol: Protocol = {
      type: () => 'Journal',
      instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
    }
    journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, TEST_SUPERVISOR_NAME)
    metadata = Metadata.nullMetadata()
  })

  afterEach(async () => {
    await stage().close()
  })

  describe('Basic reading operations', () => {
    it('should read entries sequentially', async () => {
      // Append some events to different streams
      await journal.append('stream1', 1, new TestEvent('e1', 'data1'), metadata)
      await journal.append('stream2', 1, new TestEvent('e2', 'data2'), metadata)
      await journal.append('stream1', 2, new TestEvent('e3', 'data3'), metadata)

      const reader = await journal.journalReader('test-reader')

      // Read first 2 entries
      const entries1 = await reader.readNext(2)
      expect(entries1).toHaveLength(2)
      expect(entries1[0].type).toBe('test-event')
      expect(entries1[1].type).toBe('test-event')

      // Read next entry
      const entries2 = await reader.readNext(1)
      expect(entries2).toHaveLength(1)
      expect(entries2[0].type).toBe('test-event')

      // No more entries
      const entries3 = await reader.readNext(10)
      expect(entries3).toHaveLength(0)
    })

    it('should read all entries from all streams in order', async () => {
      // Append events to multiple streams
      await journal.append('streamA', 1, new TestEvent('e1', 'A1'), metadata)
      await journal.append('streamB', 1, new TestEvent('e2', 'B1'), metadata)
      await journal.append('streamA', 2, new TestEvent('e3', 'A2'), metadata)
      await journal.append('streamC', 1, new TestEvent('e4', 'C1'), metadata)
      await journal.append('streamB', 2, new TestEvent('e5', 'B2'), metadata)

      const reader = await journal.journalReader('test-reader')

      // Read all entries
      const entries = await reader.readNext(10)
      expect(entries).toHaveLength(5)

      // Verify entries are in append order (not grouped by stream)
      const entryIds = entries.map(e => {
        const data = JSON.parse(e.entryData)
        return data.eventId
      })
      expect(entryIds).toEqual(['e1', 'e2', 'e3', 'e4', 'e5'])
    })

    it('should return empty array when reading empty journal', async () => {
      const reader = await journal.journalReader('empty-reader')

      const entries = await reader.readNext(100)
      expect(entries).toHaveLength(0)
    })

    it('should return fewer entries when fewer available', async () => {
      await journal.append('stream1', 1, new TestEvent('e1', 'data1'), metadata)
      await journal.append('stream1', 2, new TestEvent('e2', 'data2'), metadata)

      const reader = await journal.journalReader('test-reader')

      // Request 10 but only 2 available
      const entries = await reader.readNext(10)
      expect(entries).toHaveLength(2)
    })

    it('should throw error when max is zero or negative', async () => {
      const reader = await journal.journalReader('test-reader')

      try {
        await reader.readNext(0)
        expect.fail('Expected error for max = 0')
      } catch (error) {
        expect((error as Error).message).toBe('max must be greater than 0')
      }
      // Wait for supervision to complete
      await waitForErrorRecovery(supervisor, 1)

      try {
        await reader.readNext(-1)
        expect.fail('Expected error for max = -1')
      } catch (error) {
        expect((error as Error).message).toBe('max must be greater than 0')
      }
      // Wait for supervision to complete
      await waitForErrorRecovery(supervisor, 2)
    })
  })

  describe('Position tracking', () => {
    it('should track position correctly', async () => {
      await journal.append('stream1', 1, new TestEvent('e1', 'data1'), metadata)
      await journal.append('stream1', 2, new TestEvent('e2', 'data2'), metadata)
      await journal.append('stream1', 3, new TestEvent('e3', 'data3'), metadata)

      const reader = await journal.journalReader('test-reader')

      expect(await reader.position()).toBe(0)

      await reader.readNext(1)
      expect(await reader.position()).toBe(1)

      await reader.readNext(2)
      expect(await reader.position()).toBe(3)

      await reader.readNext(10)
      expect(await reader.position()).toBe(3) // No more entries, position unchanged
    })

    it('should start at position 0', async () => {
      await journal.append('stream1', 1, new TestEvent('e1', 'data1'), metadata)

      const reader = await journal.journalReader('test-reader')

      expect(await reader.position()).toBe(0)
    })
  })

  describe('Seeking', () => {
    beforeEach(async () => {
      // Create 5 entries
      for (let i = 1; i <= 5; i++) {
        await journal.append('stream1', i, new TestEvent(`e${i}`, `data${i}`), metadata)
      }
    })

    it('should seek to specific position', async () => {
      const reader = await journal.journalReader('test-reader')

      await reader.seek(2)
      expect(await reader.position()).toBe(2)

      const entries = await reader.readNext(2)
      expect(entries).toHaveLength(2)
      expect(await reader.position()).toBe(4)
    })

    it('should allow seeking to beginning', async () => {
      const reader = await journal.journalReader('test-reader')

      await reader.readNext(3)
      expect(await reader.position()).toBe(3)

      await reader.seek(0)
      expect(await reader.position()).toBe(0)

      const entries = await reader.readNext(2)
      expect(entries).toHaveLength(2)
    })

    it('should allow seeking to end', async () => {
      const reader = await journal.journalReader('test-reader')

      await reader.seek(5)
      expect(await reader.position()).toBe(5)

      const entries = await reader.readNext(10)
      expect(entries).toHaveLength(0)
    })

    it('should allow seeking beyond current journal size', async () => {
      const reader = await journal.journalReader('test-reader')

      // Seek beyond current size (5 entries)
      await reader.seek(100)
      expect(await reader.position()).toBe(100)

      const entries = await reader.readNext(10)
      expect(entries).toHaveLength(0)
    })

    it('should throw error when seeking to negative position', async () => {
      const reader = await journal.journalReader('test-reader')

      try {
        await reader.seek(-1)
        expect.fail('Expected error for negative position')
      } catch (error) {
        expect((error as Error).message).toBe('position cannot be negative')
      }

      // Wait for supervision to complete before test ends
      await waitForErrorRecovery(supervisor, 1)
    })
  })

  describe('Rewinding', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 3; i++) {
        await journal.append('stream1', i, new TestEvent(`e${i}`, `data${i}`), metadata)
      }
    })

    it('should rewind to beginning', async () => {
      const reader = await journal.journalReader('test-reader')

      await reader.readNext(3)
      expect(await reader.position()).toBe(3)

      await reader.rewind()
      expect(await reader.position()).toBe(0)

      const entries = await reader.readNext(3)
      expect(entries).toHaveLength(3)
    })

    it('should allow rewinding when already at start', async () => {
      const reader = await journal.journalReader('test-reader')

      expect(await reader.position()).toBe(0)

      await reader.rewind()
      expect(await reader.position()).toBe(0)
    })

    it('should allow re-reading after rewind', async () => {
      const reader = await journal.journalReader('test-reader')

      const entries1 = await reader.readNext(3)
      const data1 = entries1.map(e => JSON.parse(e.entryData).data)

      await reader.rewind()

      const entries2 = await reader.readNext(3)
      const data2 = entries2.map(e => JSON.parse(e.entryData).data)

      expect(data1).toEqual(data2)
    })
  })

  describe('Reader name', () => {
    it('should return the reader name', async () => {
      const reader = await journal.journalReader('my-reader')

      expect(await reader.name()).toBe('my-reader')
    })

    it('should support different reader names', async () => {
      const reader1 = await journal.journalReader('reader-1')
      const reader2 = await journal.journalReader('reader-2')

      expect(await reader1.name()).toBe('reader-1')
      expect(await reader2.name()).toBe('reader-2')
    })
  })

  describe('Multiple readers', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await journal.append('stream1', i, new TestEvent(`e${i}`, `data${i}`), metadata)
      }
    })

    it('should maintain independent positions for different readers', async () => {
      const reader1 = await journal.journalReader('reader-1')
      const reader2 = await journal.journalReader('reader-2')

      await reader1.readNext(2)
      expect(await reader1.position()).toBe(2)
      expect(await reader2.position()).toBe(0)

      await reader2.readNext(3)
      expect(await reader1.position()).toBe(2)
      expect(await reader2.position()).toBe(3)
    })

    it('should return same reader instance for same name', async () => {
      const reader1 = await journal.journalReader('my-reader')
      await reader1.readNext(2)

      const reader2 = await journal.journalReader('my-reader')
      expect(await reader2.position()).toBe(2) // Same instance, same position
    })

    it('should allow multiple readers to read simultaneously', async () => {
      const reader1 = await journal.journalReader('reader-1')
      const reader2 = await journal.journalReader('reader-2')
      const reader3 = await journal.journalReader('reader-3')

      const entries1 = await reader1.readNext(5)
      const entries2 = await reader2.readNext(5)
      const entries3 = await reader3.readNext(5)

      expect(entries1).toHaveLength(5)
      expect(entries2).toHaveLength(5)
      expect(entries3).toHaveLength(5)

      // All should read the same data
      expect(entries1[0].id).toBe(entries2[0].id)
      expect(entries2[0].id).toBe(entries3[0].id)
    })
  })

  describe('Dynamic journal updates', () => {
    it('should read newly appended entries on subsequent reads', async () => {
      await journal.append('stream1', 1, new TestEvent('e1', 'data1'), metadata)

      const reader = await journal.journalReader('test-reader')

      const entries1 = await reader.readNext(10)
      expect(entries1).toHaveLength(1)

      // Append more entries
      await journal.append('stream1', 2, new TestEvent('e2', 'data2'), metadata)
      await journal.append('stream1', 3, new TestEvent('e3', 'data3'), metadata)

      // Reader should see new entries
      const entries2 = await reader.readNext(10)
      expect(entries2).toHaveLength(2)
    })

    it('should handle reading from empty journal that gets populated', async () => {
      const reader = await journal.journalReader('test-reader')

      const entries1 = await reader.readNext(10)
      expect(entries1).toHaveLength(0)

      await journal.append('stream1', 1, new TestEvent('e1', 'data1'), metadata)

      const entries2 = await reader.readNext(10)
      expect(entries2).toHaveLength(1)
    })
  })

  describe('CQRS projection use case', () => {
    it('should simulate projection reading events in batches', async () => {
      // Simulate event sourcing scenario
      await journal.append('account-1', 1, new TestEvent('opened', 'acc1'), metadata)
      await journal.append('account-1', 2, new TestEvent('deposited', 'acc1'), metadata)
      await journal.append('account-2', 1, new TestEvent('opened', 'acc2'), metadata)
      await journal.append('account-1', 3, new TestEvent('withdrawn', 'acc1'), metadata)
      await journal.append('account-3', 1, new TestEvent('opened', 'acc3'), metadata)

      const projectionReader = await journal.journalReader('account-projection')

      // Process first batch
      const batch1 = await projectionReader.readNext(2)
      expect(batch1).toHaveLength(2)
      // Projection would update read model here

      // Process second batch
      const batch2 = await projectionReader.readNext(2)
      expect(batch2).toHaveLength(2)
      // Projection would update read model here

      // Process remaining
      const batch3 = await projectionReader.readNext(10)
      expect(batch3).toHaveLength(1)

      expect(await projectionReader.position()).toBe(5)
    })

    it('should support resuming projection from saved position', async () => {
      // Create some events
      for (let i = 1; i <= 10; i++) {
        await journal.append('stream1', i, new TestEvent(`e${i}`, `data${i}`), metadata)
      }

      const reader = await journal.journalReader('projection-reader')

      // Process first 5 events
      await reader.readNext(5)
      const savedPosition = await reader.position()
      expect(savedPosition).toBe(5)

      // Simulate restart - get reader again and seek to saved position
      const resumedReader = await journal.journalReader('projection-reader')
      // Note: In a real scenario with persistent storage, the position would be saved
      // Here we're using the same in-memory reader, so position is already preserved
      expect(await resumedReader.position()).toBe(5)

      // Continue processing
      const nextBatch = await resumedReader.readNext(5)
      expect(nextBatch).toHaveLength(5)
      expect(await resumedReader.position()).toBe(10)
    })
  })
})
