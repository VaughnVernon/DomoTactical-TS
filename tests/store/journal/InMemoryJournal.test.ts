// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol } from 'domo-actors'
import { InMemoryJournal } from '../../../src/store/journal/inmemory/InMemoryJournal'
import { Journal } from '../../../src/store/journal/Journal'
import { DomainEvent } from '../../../src/model/DomainEvent'
import { Metadata } from '../../../src/store/Metadata'

class TestEvent extends DomainEvent {
  constructor(public readonly data: string) {
    super()
  }

  override id(): string {
    return this.data
  }
}

class AccountOpened extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly owner: string
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
    public readonly amount: number
  ) {
    super()
  }

  override id(): string {
    return this.accountId
  }
}

interface AccountSnapshot {
  accountId: string
  balance: number
  version: number
}

describe('InMemoryJournal', () => {
  let journal: Journal<string>

  beforeEach(() => {
    const journalProtocol: Protocol = {
      type: () => 'Journal',
      instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
    }
    journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, 'default')
  })

  afterEach(async () => {
    await stage().close()
  })

  describe('append - single source', () => {
    it('should append a single source successfully', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      const result = await journal.append('stream-1', 1, event, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.isFailure()).toBe(false)
      expect(result.streamName).toBe('stream-1')
      expect(result.streamVersion).toBe(1)
      expect(result.source).toBe(event)
      expect(result.sources).toBeNull()
      expect(result.snapshot).toBeNull()
    })

    it('should append multiple single sources to same stream', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const event3 = new TestEvent('event-3')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)
      await journal.append('stream-1', 2, event2, metadata)
      const result = await journal.append('stream-1', 3, event3, metadata)

      expect(result.streamVersion).toBe(3)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')
      expect(stream.size()).toBe(3)
      expect(stream.streamVersion).toBe(3)
    })

    it('should append with custom metadata', async () => {
      const event = new AccountOpened('acc-1', 'Alice')
      const metadata = Metadata.withProperties(
        new Map([
          ['userId', 'user-123'],
          ['correlationId', 'corr-456']
        ])
      )

      const result = await journal.append('account-acc-1', 1, event, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamName).toBe('account-acc-1')
    })
  })

  describe('appendWith - single source with snapshot', () => {
    it('should append source with snapshot', async () => {
      const event = new AccountOpened('acc-1', 'Alice')
      const metadata = Metadata.nullMetadata()
      const snapshot: AccountSnapshot = {
        accountId: 'acc-1',
        balance: 0,
        version: 1
      }

      const result = await journal.appendWith('account-acc-1', 1, event, metadata, snapshot)

      expect(result.isSuccess()).toBe(true)
      expect(result.snapshot).toEqual(snapshot)
      expect(result.streamVersion).toBe(1)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('account-acc-1')

      expect(stream.hasSnapshot()).toBe(true)
      expect(stream.snapshot).toBeDefined()
    })

    it('should replace snapshot on subsequent appends', async () => {
      const event1 = new AccountOpened('acc-1', 'Alice')
      const event2 = new FundsDeposited('acc-1', 100)
      const metadata = Metadata.nullMetadata()

      const snapshot1: AccountSnapshot = { accountId: 'acc-1', balance: 0, version: 1 }
      const snapshot2: AccountSnapshot = { accountId: 'acc-1', balance: 100, version: 2 }

      await journal.appendWith('account-acc-1', 1, event1, metadata, snapshot1)
      await journal.appendWith('account-acc-1', 2, event2, metadata, snapshot2)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('account-acc-1')

      expect(stream.snapshot).toBeDefined()
      // Latest snapshot should be snapshot2
      const snapshotData = (stream.snapshot as any).data
      expect(snapshotData.version).toBe(2)
      expect(snapshotData.balance).toBe(100)
    })
  })

  describe('appendAll - multiple sources', () => {
    it('should append multiple sources successfully', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3'),
      ]
      const metadata = Metadata.nullMetadata()

      const result = await journal.appendAll('stream-1', 1, events, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(3)
      expect(result.source).toBeNull()
      expect(result.sources).toEqual(events)
      expect(result.snapshot).toBeNull()
    })

    it('should calculate version correctly with fromStreamVersion', async () => {
      const events1 = [new TestEvent('event-1'), new TestEvent('event-2')]
      const events2 = [new TestEvent('event-3'), new TestEvent('event-4')]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events1, metadata)
      const result = await journal.appendAll('stream-1', 3, events2, metadata)

      expect(result.streamVersion).toBe(4) // 3 + 2 - 1

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')
      expect(stream.size()).toBe(4)
      expect(stream.streamVersion).toBe(4)
    })

    it('should handle empty sources array', async () => {
      const metadata = Metadata.nullMetadata()

      const result = await journal.appendAll('stream-1', 1, [], metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(0) // fromStreamVersion + 0 - 1
    })
  })

  describe('appendAllWith - multiple sources with snapshot', () => {
    it('should append multiple sources with snapshot', async () => {
      const events = [
        new AccountOpened('acc-1', 'Alice'),
        new FundsDeposited('acc-1', 100),
        new FundsDeposited('acc-1', 50)
      ]
      const metadata = Metadata.nullMetadata()
      const snapshot: AccountSnapshot = {
        accountId: 'acc-1',
        balance: 150,
        version: 3
      }

      const result = await journal.appendAllWith('account-acc-1', 1, events, metadata, snapshot)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(3)
      expect(result.snapshot).toEqual(snapshot)
      expect(result.sources).toEqual(events)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('account-acc-1')

      expect(stream.hasSnapshot()).toBe(true)
      expect(stream.size()).toBe(3)
    })

    it('should update snapshot across multiple appendAllWith calls', async () => {
      const events1 = [new AccountOpened('acc-1', 'Alice')]
      const events2 = [new FundsDeposited('acc-1', 100), new FundsDeposited('acc-1', 50)]
      const metadata = Metadata.nullMetadata()

      const snapshot1: AccountSnapshot = { accountId: 'acc-1', balance: 0, version: 1 }
      const snapshot2: AccountSnapshot = { accountId: 'acc-1', balance: 150, version: 3 }

      await journal.appendAllWith('account-acc-1', 1, events1, metadata, snapshot1)
      await journal.appendAllWith('account-acc-1', 2, events2, metadata, snapshot2)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('account-acc-1')

      expect(stream.size()).toBe(3)
      expect(stream.streamVersion).toBe(3)

      const snapshotData = (stream.snapshot as any).data
      expect(snapshotData.balance).toBe(150)
    })
  })

  describe('streamReader', () => {
    it('should create stream reader', async () => {
      const reader = await journal.streamReader('test-reader')

      expect(reader).toBeDefined()
    })

    it('should reuse existing stream reader with same name', async () => {
      const reader1 = await journal.streamReader('test-reader')
      const reader2 = await journal.streamReader('test-reader')

      expect(reader1).toBe(reader2)
    })

    it('should create different readers with different names', async () => {
      const reader1 = await journal.streamReader('reader-1')
      const reader2 = await journal.streamReader('reader-2')

      expect(reader1).not.toBe(reader2)
    })

    it('should read stream with entries', async () => {
      const events = [new TestEvent('event-1'), new TestEvent('event-2')]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events, metadata)

      const reader = await journal.streamReader('test-reader')
      const stream = await reader.streamFor('stream-1')

      expect(stream.streamName).toBe('stream-1')
      expect(stream.streamVersion).toBe(2)
      expect(stream.size()).toBe(2)
      expect(stream.entries).toHaveLength(2)
    })

    it('should read empty stream for non-existent stream', async () => {
      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('non-existent-stream')

      expect(stream.streamName).toBe('non-existent-stream')
      expect(stream.streamVersion).toBe(0)
      expect(stream.size()).toBe(0)
      expect(stream.entries).toHaveLength(0)
      expect(stream.hasSnapshot()).toBe(false)
    })

    it('should maintain entry order across reads', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3')
      ]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events, metadata)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      expect(stream.entries[0].type).toBe('test-event')
      expect(stream.entries).toHaveLength(3)
    })
  })

  describe('multiple streams', () => {
    it('should isolate different streams', async () => {
      const events1 = [new TestEvent('stream1-event-1'), new TestEvent('stream1-event-2')]
      const events2 = [new TestEvent('stream2-event-1')]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events1, metadata)
      await journal.appendAll('stream-2', 1, events2, metadata)

      const reader = await journal.streamReader('test')
      const stream1 = await reader.streamFor('stream-1')
      const stream2 = await reader.streamFor('stream-2')

      expect(stream1.size()).toBe(2)
      expect(stream1.streamVersion).toBe(2)
      expect(stream2.size()).toBe(1)
      expect(stream2.streamVersion).toBe(1)
    })

    it('should handle multiple streams with snapshots', async () => {
      const event1 = new AccountOpened('acc-1', 'Alice')
      const event2 = new AccountOpened('acc-2', 'Bob')
      const metadata = Metadata.nullMetadata()

      const snapshot1: AccountSnapshot = { accountId: 'acc-1', balance: 0, version: 1 }
      const snapshot2: AccountSnapshot = { accountId: 'acc-2', balance: 0, version: 1 }

      await journal.appendWith('account-acc-1', 1, event1, metadata, snapshot1)
      await journal.appendWith('account-acc-2', 1, event2, metadata, snapshot2)

      const reader = await journal.streamReader('test')
      const stream1 = await reader.streamFor('account-acc-1')
      const stream2 = await reader.streamFor('account-acc-2')

      expect(stream1.hasSnapshot()).toBe(true)
      expect(stream2.hasSnapshot()).toBe(true)

      const snapshot1Data = (stream1.snapshot as any).data
      const snapshot2Data = (stream2.snapshot as any).data

      expect(snapshot1Data.accountId).toBe('acc-1')
      expect(snapshot2Data.accountId).toBe('acc-2')
    })
  })

  describe('entry metadata', () => {
    it('should preserve entry metadata', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.withProperties(
        new Map([['key', 'value']])
      )

      await journal.append('stream-1', 1, event, metadata)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      expect(stream.entries[0].metadata).toBeDefined()
      const parsedMetadata = JSON.parse(stream.entries[0].metadata)
      expect(parsedMetadata.properties.key).toBe('value')
    })
  })
})
