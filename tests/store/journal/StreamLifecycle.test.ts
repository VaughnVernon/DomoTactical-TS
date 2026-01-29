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
import { StreamState } from '../../../src/store/journal/StreamState'
import { Result } from '../../../src/store/Result'
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

describe('Stream Lifecycle Management', () => {
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

  describe('tombstone (hard delete)', () => {
    it('should tombstone an existing stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)

      const result = await journal.tombstone('stream-1')

      expect(result.isSuccess()).toBe(true)
      expect(result.streamName).toBe('stream-1')
      expect(result.journalPosition).toBeGreaterThanOrEqual(0)
    })

    it('should return already tombstoned for double tombstone', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.tombstone('stream-1')

      const result = await journal.tombstone('stream-1')

      expect(result.wasAlreadyTombstoned()).toBe(true)
      expect(result.isSuccess()).toBe(false)
    })

    it('should return not found for non-existent stream', async () => {
      const result = await journal.tombstone('non-existent')

      expect(result.wasNotFound()).toBe(true)
      expect(result.isSuccess()).toBe(false)
    })

    it('should prevent appends to tombstoned stream', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)
      await journal.tombstone('stream-1')

      const result = await journal.append('stream-1', 2, event2, metadata)

      expect(result.isSuccess()).toBe(false)
      expect(result.outcome.value).toBe(Result.StreamDeleted)
    })

    it('should return tombstoned EntryStream on read', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.tombstone('stream-1')

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      expect(stream.isTombstoned).toBe(true)
      expect(stream.isDeleted()).toBe(true)
      expect(stream.entries.length).toBe(0)
      expect(stream.streamVersion).toBe(1)
    })
  })

  describe('softDelete', () => {
    it('should soft-delete an existing stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)

      const result = await journal.softDelete('stream-1')

      expect(result.isSuccess()).toBe(true)
      expect(result.streamName).toBe('stream-1')
      expect(result.deletedAtVersion).toBe(1)
    })

    it('should return already deleted for double soft-delete', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.softDelete('stream-1')

      const result = await journal.softDelete('stream-1')

      expect(result.wasAlreadyDeleted()).toBe(true)
      expect(result.isSuccess()).toBe(false)
    })

    it('should return not found for non-existent stream', async () => {
      const result = await journal.softDelete('non-existent')

      expect(result.wasNotFound()).toBe(true)
    })

    it('should return tombstoned when trying to soft-delete a tombstoned stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.tombstone('stream-1')

      const result = await journal.softDelete('stream-1')

      expect(result.wasAlreadyDeleted()).toBe(true)
    })

    it('should return soft-deleted EntryStream on read', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.softDelete('stream-1')

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      expect(stream.isSoftDeleted).toBe(true)
      expect(stream.isDeleted()).toBe(true)
      expect(stream.entries.length).toBe(0)
      expect(stream.streamVersion).toBe(1)
    })

    it('should allow reopening a soft-deleted stream by appending', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)
      await journal.softDelete('stream-1')

      // Reopen by appending (version continues from 2)
      const result = await journal.append('stream-1', 2, event2, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(2)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      expect(stream.isSoftDeleted).toBe(false)
      expect(stream.entries.length).toBe(2)
    })
  })

  describe('truncateBefore', () => {
    it('should truncate events before specified version', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3'),
        new TestEvent('event-4'),
        new TestEvent('event-5')
      ]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events, metadata)

      const result = await journal.truncateBefore('stream-1', 3)

      expect(result.isSuccess()).toBe(true)
      expect(result.truncatedBefore).toBe(3)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      // Should only have events 3, 4, 5
      expect(stream.entries.length).toBe(3)
      expect(stream.streamVersion).toBe(5)
    })

    it('should return not found for non-existent stream', async () => {
      const result = await journal.truncateBefore('non-existent', 5)

      expect(result.wasNotFound()).toBe(true)
    })

    it('should return tombstoned for tombstoned stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.tombstone('stream-1')

      const result = await journal.truncateBefore('stream-1', 1)

      expect(result.wasTombstoned()).toBe(true)
    })

    it('should update truncate position on subsequent calls', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3'),
        new TestEvent('event-4'),
        new TestEvent('event-5')
      ]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events, metadata)

      await journal.truncateBefore('stream-1', 2)
      await journal.truncateBefore('stream-1', 4)

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      // Should only have events 4, 5
      expect(stream.entries.length).toBe(2)
    })
  })

  describe('streamInfo', () => {
    it('should return not found for non-existent stream', async () => {
      const info = await journal.streamInfo('non-existent')

      expect(info.exists).toBe(false)
      expect(info.currentVersion).toBe(0)
    })

    it('should return info for active stream', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3')
      ]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events, metadata)

      const info = await journal.streamInfo('stream-1')

      expect(info.exists).toBe(true)
      expect(info.currentVersion).toBe(3)
      expect(info.isTombstoned).toBe(false)
      expect(info.isSoftDeleted).toBe(false)
      expect(info.truncateBefore).toBe(0)
      expect(info.entryCount).toBe(3)
    })

    it('should return info for tombstoned stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.tombstone('stream-1')

      const info = await journal.streamInfo('stream-1')

      expect(info.exists).toBe(true)
      expect(info.isTombstoned).toBe(true)
      expect(info.currentVersion).toBe(1)
    })

    it('should return info for soft-deleted stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.softDelete('stream-1')

      const info = await journal.streamInfo('stream-1')

      expect(info.exists).toBe(true)
      expect(info.isSoftDeleted).toBe(true)
      expect(info.currentVersion).toBe(1)
    })

    it('should reflect truncate-before in entry count', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3'),
        new TestEvent('event-4'),
        new TestEvent('event-5')
      ]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events, metadata)
      await journal.truncateBefore('stream-1', 3)

      const info = await journal.streamInfo('stream-1')

      expect(info.truncateBefore).toBe(3)
      expect(info.entryCount).toBe(3) // Only versions 3, 4, 5 are visible
      expect(info.currentVersion).toBe(5)
    })
  })

  describe('expected version (optimistic concurrency)', () => {
    it('should succeed with correct expected version', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)
      const result = await journal.append('stream-1', 2, event2, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(2)
    })

    it('should fail with incorrect expected version', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)

      // Try to append with wrong version
      const result = await journal.append('stream-1', 5, event2, metadata)

      expect(result.isSuccess()).toBe(false)
      expect(result.outcome.value).toBe(Result.ConcurrencyViolation)
    })

    it('should succeed with StreamState.Any', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)

      // Any (-2) should bypass version check
      const result = await journal.append('stream-1', StreamState.Any, event2, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(2)
    })

    it('should succeed with StreamState.NoStream for new stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      const result = await journal.append('stream-1', StreamState.NoStream, event, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(1)
    })

    it('should fail with StreamState.NoStream for existing stream', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)

      const result = await journal.append('stream-1', StreamState.NoStream, event2, metadata)

      expect(result.isSuccess()).toBe(false)
      expect(result.outcome.value).toBe(Result.ConcurrencyViolation)
    })

    it('should succeed with StreamState.StreamExists for existing stream', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)

      const result = await journal.append('stream-1', StreamState.StreamExists, event2, metadata)

      expect(result.isSuccess()).toBe(true)
      expect(result.streamVersion).toBe(2)
    })

    it('should fail with StreamState.StreamExists for new stream', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      const result = await journal.append('stream-1', StreamState.StreamExists, event, metadata)

      expect(result.isSuccess()).toBe(false)
      expect(result.outcome.value).toBe(Result.ConcurrencyViolation)
    })

    it('should validate expected version for appendAll', async () => {
      const events1 = [new TestEvent('event-1'), new TestEvent('event-2')]
      const events2 = [new TestEvent('event-3')]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events1, metadata)

      // Try with wrong version
      const result = await journal.appendAll('stream-1', 5, events2, metadata)

      expect(result.isSuccess()).toBe(false)
      expect(result.outcome.value).toBe(Result.ConcurrencyViolation)
    })

    it('should validate expected version for appendWith', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()
      const snapshot = { version: 2 }

      await journal.append('stream-1', 1, event1, metadata)

      // Try with wrong version
      const result = await journal.appendWith('stream-1', 5, event2, metadata, snapshot)

      expect(result.isSuccess()).toBe(false)
      expect(result.outcome.value).toBe(Result.ConcurrencyViolation)
    })

    it('should validate expected version for appendAllWith', async () => {
      const events1 = [new TestEvent('event-1'), new TestEvent('event-2')]
      const events2 = [new TestEvent('event-3')]
      const metadata = Metadata.nullMetadata()
      const snapshot = { version: 3 }

      await journal.appendAll('stream-1', 1, events1, metadata)

      // Try with wrong version
      const result = await journal.appendAllWith('stream-1', 5, events2, metadata, snapshot)

      expect(result.isSuccess()).toBe(false)
      expect(result.outcome.value).toBe(Result.ConcurrencyViolation)
    })
  })

  describe('StreamState enum', () => {
    it('should have correct values', () => {
      expect(StreamState.Any).toBe(-2)
      expect(StreamState.NoStream).toBe(-1)
      expect(StreamState.StreamExists).toBe(-4)
    })

    it('should identify Any correctly', () => {
      expect(StreamState.isAny(StreamState.Any)).toBe(true)
      expect(StreamState.isAny(-2)).toBe(true)
      expect(StreamState.isAny(1)).toBe(false)
    })

    it('should identify NoStream correctly', () => {
      expect(StreamState.isNoStream(StreamState.NoStream)).toBe(true)
      expect(StreamState.isNoStream(-1)).toBe(true)
      expect(StreamState.isNoStream(1)).toBe(false)
    })

    it('should identify StreamExists correctly', () => {
      expect(StreamState.isStreamExists(StreamState.StreamExists)).toBe(true)
      expect(StreamState.isStreamExists(-4)).toBe(true)
      expect(StreamState.isStreamExists(1)).toBe(false)
    })

    it('should identify special states correctly', () => {
      expect(StreamState.isSpecialState(StreamState.Any)).toBe(true)
      expect(StreamState.isSpecialState(StreamState.NoStream)).toBe(true)
      expect(StreamState.isSpecialState(StreamState.StreamExists)).toBe(true)
      expect(StreamState.isSpecialState(1)).toBe(false)
      expect(StreamState.isSpecialState(0)).toBe(false)
    })

    it('should identify concrete versions correctly', () => {
      expect(StreamState.isConcreteVersion(0)).toBe(true)
      expect(StreamState.isConcreteVersion(1)).toBe(true)
      expect(StreamState.isConcreteVersion(100)).toBe(true)
      expect(StreamState.isConcreteVersion(StreamState.Any)).toBe(false)
      expect(StreamState.isConcreteVersion(StreamState.NoStream)).toBe(false)
    })
  })

  describe('EntryStream status methods', () => {
    it('should create tombstoned EntryStream', async () => {
      const { EntryStream } = await import('../../../src/store/journal/EntryStream')
      const stream = EntryStream.tombstoned<string>('test', 5)

      expect(stream.isTombstoned).toBe(true)
      expect(stream.isSoftDeleted).toBe(false)
      expect(stream.isDeleted()).toBe(true)
      expect(stream.streamVersion).toBe(5)
      expect(stream.entries.length).toBe(0)
    })

    it('should create soft-deleted EntryStream', async () => {
      const { EntryStream } = await import('../../../src/store/journal/EntryStream')
      const stream = EntryStream.softDeleted<string>('test', 3)

      expect(stream.isTombstoned).toBe(false)
      expect(stream.isSoftDeleted).toBe(true)
      expect(stream.isDeleted()).toBe(true)
      expect(stream.streamVersion).toBe(3)
      expect(stream.entries.length).toBe(0)
    })

    it('should create empty EntryStream', async () => {
      const { EntryStream } = await import('../../../src/store/journal/EntryStream')
      const stream = EntryStream.empty<string>('test')

      expect(stream.isTombstoned).toBe(false)
      expect(stream.isSoftDeleted).toBe(false)
      expect(stream.isDeleted()).toBe(false)
      expect(stream.streamVersion).toBe(0)
      expect(stream.entries.length).toBe(0)
    })
  })

  describe('AppendResult helper methods', () => {
    it('should return true for isConcurrencyViolation on version mismatch', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)
      const result = await journal.append('stream-1', 5, event2, metadata)

      expect(result.isConcurrencyViolation()).toBe(true)
      expect(result.isSuccess()).toBe(false)
      expect(result.isFailure()).toBe(true)
    })

    it('should return false for isConcurrencyViolation on success', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      const result = await journal.append('stream-1', 1, event, metadata)

      expect(result.isConcurrencyViolation()).toBe(false)
      expect(result.isSuccess()).toBe(true)
      expect(result.isFailure()).toBe(false)
    })

    it('should return true for isStreamDeleted on tombstoned stream', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event1, metadata)
      await journal.tombstone('stream-1')

      const result = await journal.append('stream-1', 2, event2, metadata)

      expect(result.isStreamDeleted()).toBe(true)
      expect(result.isSuccess()).toBe(false)
      expect(result.isFailure()).toBe(true)
    })

    it('should return false for isStreamDeleted on success', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      const result = await journal.append('stream-1', 1, event, metadata)

      expect(result.isStreamDeleted()).toBe(false)
    })

    it('should return true for isFailure on any non-success result', async () => {
      const event1 = new TestEvent('event-1')
      const event2 = new TestEvent('event-2')
      const metadata = Metadata.nullMetadata()

      // Concurrency violation
      await journal.append('stream-1', 1, event1, metadata)
      const concurrencyResult = await journal.append('stream-1', 5, event2, metadata)
      expect(concurrencyResult.isFailure()).toBe(true)

      // Stream deleted
      await journal.tombstone('stream-1')
      const deletedResult = await journal.append('stream-1', 2, event2, metadata)
      expect(deletedResult.isFailure()).toBe(true)
    })
  })

  describe('DefaultStreamInfo factory methods', () => {
    it('should create notFound StreamInfo', async () => {
      const { DefaultStreamInfo } = await import('../../../src/store/journal/StreamInfo')
      const info = DefaultStreamInfo.notFound('test-stream')

      expect(info.streamName).toBe('test-stream')
      expect(info.exists).toBe(false)
      expect(info.currentVersion).toBe(0)
      expect(info.isTombstoned).toBe(false)
      expect(info.isSoftDeleted).toBe(false)
      expect(info.truncateBefore).toBe(0)
      expect(info.entryCount).toBe(0)
    })

    it('should create tombstoned StreamInfo', async () => {
      const { DefaultStreamInfo } = await import('../../../src/store/journal/StreamInfo')
      const info = DefaultStreamInfo.tombstoned('test-stream', 5)

      expect(info.streamName).toBe('test-stream')
      expect(info.exists).toBe(true)
      expect(info.currentVersion).toBe(5)
      expect(info.isTombstoned).toBe(true)
      expect(info.isSoftDeleted).toBe(false)
      expect(info.truncateBefore).toBe(0)
      expect(info.entryCount).toBe(0)
    })

    it('should create softDeleted StreamInfo', async () => {
      const { DefaultStreamInfo } = await import('../../../src/store/journal/StreamInfo')
      const info = DefaultStreamInfo.softDeleted('test-stream', 3)

      expect(info.streamName).toBe('test-stream')
      expect(info.exists).toBe(true)
      expect(info.currentVersion).toBe(3)
      expect(info.isTombstoned).toBe(false)
      expect(info.isSoftDeleted).toBe(true)
      expect(info.truncateBefore).toBe(0)
      expect(info.entryCount).toBe(0)
    })

    it('should create active StreamInfo', async () => {
      const { DefaultStreamInfo } = await import('../../../src/store/journal/StreamInfo')
      const info = DefaultStreamInfo.active('test-stream', 10, 3, 7)

      expect(info.streamName).toBe('test-stream')
      expect(info.exists).toBe(true)
      expect(info.currentVersion).toBe(10)
      expect(info.isTombstoned).toBe(false)
      expect(info.isSoftDeleted).toBe(false)
      expect(info.truncateBefore).toBe(3)
      expect(info.entryCount).toBe(7)
    })
  })

  describe('Result namespace type guards', () => {
    it('should identify ConcurrencyViolation', () => {
      expect(Result.isConcurrencyViolation(Result.ConcurrencyViolation)).toBe(true)
      expect(Result.isConcurrencyViolation(Result.Success)).toBe(false)
    })

    it('should identify Error', () => {
      expect(Result.isError(Result.Error)).toBe(true)
      expect(Result.isError(Result.Success)).toBe(false)
    })

    it('should identify Failure', () => {
      expect(Result.isFailure(Result.Failure)).toBe(true)
      expect(Result.isFailure(Result.Success)).toBe(false)
    })

    it('should identify NotAllFound', () => {
      expect(Result.isNotAllFound(Result.NotAllFound)).toBe(true)
      expect(Result.isNotAllFound(Result.Success)).toBe(false)
    })

    it('should identify NotFound', () => {
      expect(Result.isNotFound(Result.NotFound)).toBe(true)
      expect(Result.isNotFound(Result.Success)).toBe(false)
    })

    it('should identify NoTypeStore', () => {
      expect(Result.isNoTypeStore(Result.NoTypeStore)).toBe(true)
      expect(Result.isNoTypeStore(Result.Success)).toBe(false)
    })

    it('should identify StreamDeleted', () => {
      expect(Result.isStreamDeleted(Result.StreamDeleted)).toBe(true)
      expect(Result.isStreamDeleted(Result.Success)).toBe(false)
    })

    it('should identify Success', () => {
      expect(Result.isSuccess(Result.Success)).toBe(true)
      expect(Result.isSuccess(Result.Failure)).toBe(false)
    })
  })

  describe('combined lifecycle scenarios', () => {
    it('should handle truncate then tombstone', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3')
      ]
      const metadata = Metadata.nullMetadata()

      await journal.appendAll('stream-1', 1, events, metadata)
      await journal.truncateBefore('stream-1', 2)
      await journal.tombstone('stream-1')

      const reader = await journal.streamReader('test')
      const stream = await reader.streamFor('stream-1')

      expect(stream.isTombstoned).toBe(true)
      expect(stream.entries.length).toBe(0)
    })

    it('should handle soft-delete then tombstone', async () => {
      const event = new TestEvent('event-1')
      const metadata = Metadata.nullMetadata()

      await journal.append('stream-1', 1, event, metadata)
      await journal.softDelete('stream-1')

      // Tombstone should clear soft-delete
      const result = await journal.tombstone('stream-1')
      expect(result.isSuccess()).toBe(true)

      const info = await journal.streamInfo('stream-1')
      expect(info.isTombstoned).toBe(true)
      expect(info.isSoftDeleted).toBe(false)
    })

    it('should track info correctly through lifecycle', async () => {
      const events = [
        new TestEvent('event-1'),
        new TestEvent('event-2'),
        new TestEvent('event-3'),
        new TestEvent('event-4'),
        new TestEvent('event-5')
      ]
      const metadata = Metadata.nullMetadata()

      // Initial append
      await journal.appendAll('stream-1', 1, events, metadata)
      let info = await journal.streamInfo('stream-1')
      expect(info.entryCount).toBe(5)
      expect(info.currentVersion).toBe(5)

      // Truncate
      await journal.truncateBefore('stream-1', 3)
      info = await journal.streamInfo('stream-1')
      expect(info.entryCount).toBe(3)
      expect(info.truncateBefore).toBe(3)
      expect(info.currentVersion).toBe(5)

      // Soft delete
      await journal.softDelete('stream-1')
      info = await journal.streamInfo('stream-1')
      expect(info.isSoftDeleted).toBe(true)
      expect(info.currentVersion).toBe(5)

      // Reopen
      await journal.append('stream-1', 6, new TestEvent('event-6'), metadata)
      info = await journal.streamInfo('stream-1')
      expect(info.isSoftDeleted).toBe(false)
      expect(info.currentVersion).toBe(6)
      expect(info.entryCount).toBe(4) // 3 + 1 (truncate still in effect)
    })
  })
})
