// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor, Protocol, Definition } from 'domo-actors'
import { Metadata } from '../../Metadata.js'
import { Result } from '../../Result.js'
import { Source } from '../../Source.js'
import { State, ObjectState } from '../../State.js'
import { Entry } from '../../Entry.js'
import { Outcome } from '../../Outcome.js'
import { EntryAdapterProvider } from '../../EntryAdapterProvider.js'
import { TextEntry } from '../../TextEntry.js'
import { AppendResult, Journal, StreamReader } from '../Journal.js'
import { DeleteResult } from '../DeleteResult.js'
import { EntryStream } from '../EntryStream.js'
import { JournalReader } from '../JournalReader.js'
import { StreamInfo, DefaultStreamInfo } from '../StreamInfo.js'
import { StreamState } from '../StreamState.js'
import { TombstoneResult } from '../TombstoneResult.js'
import { TruncateResult } from '../TruncateResult.js'
import { InMemoryJournalReader } from './InMemoryJournalReader.js'

/**
 * In-memory implementation of Journal using Map-based storage.
 * Extends Actor for use with the actor model.
 * Stores entries as JSON strings for simplicity.
 *
 * @template T the type of entry data (typically string for JSON)
 */
export class InMemoryJournal<T> extends Actor implements Journal<T> {
  /** All journal entries in order */
  private readonly journal: Entry<T>[] = []

  /** Map of stream name to map of version to journal index */
  private readonly streamIndexes: Map<string, Map<number, number>> = new Map()

  /** Map of stream name to latest snapshot */
  private readonly snapshots: Map<string, State<unknown>> = new Map()

  /** Map of stream reader names to readers */
  private readonly streamReaders: Map<string, InMemoryStreamReader<T>> = new Map()

  /** Map of journal reader names to readers */
  private readonly journalReaders: Map<string, InMemoryJournalReader<T>> = new Map()

  /** Set of tombstoned (hard deleted) stream names */
  private readonly tombstones: Set<string> = new Set()

  /** Map of soft-deleted stream names to the version at which they were deleted */
  private readonly softDeleted: Map<string, number> = new Map()

  /** Map of stream names to their truncate-before position */
  private readonly truncateBeforeMap: Map<string, number> = new Map()

  /** Adapter provider for Source/Entry conversion */
  private readonly adapterProvider = EntryAdapterProvider.instance()

  /**
   * Construct an InMemoryJournal.
   */
  constructor() {
    super()
  }

  /**
   * Append a single Source as an Entry to the journal.
   */
  async append<S, ST>(
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    metadata: Metadata
  ): Promise<AppendResult<S, ST>> {
    // Check for tombstone
    if (this.tombstones.has(streamName)) {
      const outcome = Outcome.success<never, Result>(Result.StreamDeleted)
      return AppendResult.forSource<S, ST>(outcome, streamName, streamVersion, source, null)
    }

    // Validate expected version
    const validationResult = this.validateExpectedVersion(streamName, streamVersion)
    if (validationResult !== null) {
      return AppendResult.forSource<S, ST>(validationResult, streamName, streamVersion, source, null)
    }

    // Clear soft-delete if reopening
    if (this.softDeleted.has(streamName)) {
      this.softDeleted.delete(streamName)
    }

    const actualVersion = this.resolveActualVersion(streamName, streamVersion)
    const entry = this.sourceToEntry(source, actualVersion, metadata)
    this.insert(streamName, actualVersion, entry)

    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSource<S, ST>(outcome, streamName, actualVersion, source, null)
  }

  /**
   * Append a single Source as an Entry along with a snapshot.
   */
  async appendWith<S, ST>(
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    metadata: Metadata,
    snapshot: ST
  ): Promise<AppendResult<S, ST>> {
    // Check for tombstone
    if (this.tombstones.has(streamName)) {
      const outcome = Outcome.success<never, Result>(Result.StreamDeleted)
      return AppendResult.forSource<S, ST>(outcome, streamName, streamVersion, source, snapshot)
    }

    // Validate expected version
    const validationResult = this.validateExpectedVersion(streamName, streamVersion)
    if (validationResult !== null) {
      return AppendResult.forSource<S, ST>(validationResult, streamName, streamVersion, source, snapshot)
    }

    // Clear soft-delete if reopening
    if (this.softDeleted.has(streamName)) {
      this.softDeleted.delete(streamName)
    }

    const actualVersion = this.resolveActualVersion(streamName, streamVersion)
    const entry = this.sourceToEntry(source, actualVersion, metadata)
    this.insert(streamName, actualVersion, entry)

    if (snapshot != null) {
      // Wrap snapshot in a simple State if it's not already one
      if (snapshot instanceof State) {
        this.snapshots.set(streamName, snapshot as State<unknown>)
      } else {
        // Wrap in ObjectState
        const objectState = new ObjectState(streamName, Object, 1, snapshot, actualVersion)
        this.snapshots.set(streamName, objectState)
      }
    }

    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSource(outcome, streamName, actualVersion, source, snapshot)
  }

  /**
   * Append multiple Sources as Entries to the journal.
   */
  async appendAll<S, ST>(
    streamName: string,
    fromStreamVersion: number,
    sources: Source<S>[],
    metadata: Metadata
  ): Promise<AppendResult<S, ST>> {
    // Check for tombstone
    if (this.tombstones.has(streamName)) {
      const outcome = Outcome.success<never, Result>(Result.StreamDeleted)
      return AppendResult.forSources<S, ST>(outcome, streamName, fromStreamVersion, sources, null)
    }

    // Validate expected version
    const validationResult = this.validateExpectedVersion(streamName, fromStreamVersion)
    if (validationResult !== null) {
      return AppendResult.forSources<S, ST>(validationResult, streamName, fromStreamVersion, sources, null)
    }

    // Clear soft-delete if reopening
    if (this.softDeleted.has(streamName)) {
      this.softDeleted.delete(streamName)
    }

    const actualFromVersion = this.resolveActualVersion(streamName, fromStreamVersion)
    const entries = sources.map((source, index) =>
      this.sourceToEntry(source, actualFromVersion + index, metadata)
    )

    entries.forEach((entry, index) => {
      this.insert(streamName, actualFromVersion + index, entry)
    })

    const finalVersion = sources.length > 0 ? actualFromVersion + sources.length - 1 : actualFromVersion - 1
    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSources<S, ST>(outcome, streamName, finalVersion, sources, null)
  }

  /**
   * Append multiple Sources as Entries along with a snapshot.
   */
  async appendAllWith<S, ST>(
    streamName: string,
    fromStreamVersion: number,
    sources: Source<S>[],
    metadata: Metadata,
    snapshot: ST
  ): Promise<AppendResult<S, ST>> {
    // Check for tombstone
    if (this.tombstones.has(streamName)) {
      const outcome = Outcome.success<never, Result>(Result.StreamDeleted)
      return AppendResult.forSources<S, ST>(outcome, streamName, fromStreamVersion, sources, snapshot)
    }

    // Validate expected version
    const validationResult = this.validateExpectedVersion(streamName, fromStreamVersion)
    if (validationResult !== null) {
      return AppendResult.forSources<S, ST>(validationResult, streamName, fromStreamVersion, sources, snapshot)
    }

    // Clear soft-delete if reopening
    if (this.softDeleted.has(streamName)) {
      this.softDeleted.delete(streamName)
    }

    const actualFromVersion = this.resolveActualVersion(streamName, fromStreamVersion)
    const entries = sources.map((source, index) =>
      this.sourceToEntry(source, actualFromVersion + index, metadata)
    )

    entries.forEach((entry, index) => {
      this.insert(streamName, actualFromVersion + index, entry)
    })

    const finalVersion = sources.length > 0 ? actualFromVersion + sources.length - 1 : actualFromVersion - 1

    if (snapshot != null) {
      // Wrap snapshot in a simple State if it's not already one
      if (snapshot instanceof State) {
        this.snapshots.set(streamName, snapshot as State<unknown>)
      } else {
        // Wrap in ObjectState
        const objectState = new ObjectState(streamName, Object, 1, snapshot, finalVersion)
        this.snapshots.set(streamName, objectState)
      }
    }

    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSources(outcome, streamName, finalVersion, sources, snapshot)
  }

  /**
   * Get a stream reader for reading entity event streams.
   * Creates the reader as an actor under this journal's supervisor.
   */
  async streamReader(name: string): Promise<StreamReader<T>> {
    let reader = this.streamReaders.get(name)
    if (!reader) {
      const readerProtocol: Protocol = {
        type: () => 'StreamReader',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [journalEntries, indexes, snaps, tombstoneSet, softDeletedMap, truncateMap, readerName] = def.parameters()
            return new InMemoryStreamReader(journalEntries, indexes, snaps, tombstoneSet, softDeletedMap, truncateMap, readerName)
          }
        })
      }

      reader = this.stage().actorFor<InMemoryStreamReader<T>>(
        readerProtocol,
        undefined,
        this.supervisorName(),
        undefined,
        this.journal,
        this.streamIndexes,
        this.snapshots,
        this.tombstones,
        this.softDeleted,
        this.truncateBeforeMap,
        name
      )
      this.streamReaders.set(name, reader)
    }
    return reader
  }

  /**
   * Get a journal reader for sequential access to all entries.
   * Creates the reader as an actor under this journal's supervisor.
   */
  async journalReader(name: string): Promise<JournalReader<T>> {
    let reader = this.journalReaders.get(name)
    if (!reader) {
      const readerProtocol: Protocol = {
        type: () => 'JournalReader',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [journalEntries, readerName] = def.parameters()
            return new InMemoryJournalReader(journalEntries, readerName)
          }
        })
      }

      reader = this.stage().actorFor<InMemoryJournalReader<T>>(
        readerProtocol,
        undefined,
        this.supervisorName(),
        undefined,
        this.journal,
        name
      )
      this.journalReaders.set(name, reader)
    }
    return reader
  }

  // ============================================================================
  // Stream Lifecycle Management
  // ============================================================================

  /**
   * Permanently delete a stream (tombstone).
   */
  async tombstone(streamName: string): Promise<TombstoneResult> {
    // Already tombstoned
    if (this.tombstones.has(streamName)) {
      return TombstoneResult.alreadyTombstoned(streamName)
    }

    // Check if stream exists
    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      return TombstoneResult.notFound(streamName)
    }

    // Mark as tombstoned
    this.tombstones.add(streamName)

    // Clear soft-delete if present
    this.softDeleted.delete(streamName)

    // Record the journal position (current length)
    const journalPosition = this.journal.length

    return TombstoneResult.success(streamName, journalPosition)
  }

  /**
   * Soft-delete a stream.
   */
  async softDelete(streamName: string): Promise<DeleteResult> {
    // Check if tombstoned
    if (this.tombstones.has(streamName)) {
      return DeleteResult.tombstoned(streamName)
    }

    // Check if already soft-deleted
    const existingDeletedAt = this.softDeleted.get(streamName)
    if (existingDeletedAt !== undefined) {
      return DeleteResult.alreadyDeleted(streamName, existingDeletedAt)
    }

    // Check if stream exists
    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      return DeleteResult.notFound(streamName)
    }

    // Get current version
    const currentVersion = this.getCurrentVersion(streamName)

    // Mark as soft-deleted
    this.softDeleted.set(streamName, currentVersion)

    return DeleteResult.success(streamName, currentVersion)
  }

  /**
   * Set the truncate-before position for a stream.
   */
  async truncateBefore(streamName: string, beforeVersion: number): Promise<TruncateResult> {
    // Check if tombstoned
    if (this.tombstones.has(streamName)) {
      return TruncateResult.tombstoned(streamName)
    }

    // Check if stream exists
    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      return TruncateResult.notFound(streamName)
    }

    // Set truncate-before position
    this.truncateBeforeMap.set(streamName, beforeVersion)

    return TruncateResult.success(streamName, beforeVersion)
  }

  /**
   * Get information about a stream's current state.
   */
  async streamInfo(streamName: string): Promise<StreamInfo> {
    // Check if tombstoned
    if (this.tombstones.has(streamName)) {
      const currentVersion = this.getCurrentVersion(streamName)
      return DefaultStreamInfo.tombstoned(streamName, currentVersion)
    }

    // Check if soft-deleted
    const deletedAtVersion = this.softDeleted.get(streamName)
    if (deletedAtVersion !== undefined) {
      return DefaultStreamInfo.softDeleted(streamName, deletedAtVersion)
    }

    // Check if stream exists
    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      return DefaultStreamInfo.notFound(streamName)
    }

    const currentVersion = this.getCurrentVersion(streamName)
    const truncateBefore = this.truncateBeforeMap.get(streamName) || 0

    // Count visible entries
    let entryCount = 0
    for (const version of versionIndexes.keys()) {
      if (version >= truncateBefore) {
        entryCount++
      }
    }

    return DefaultStreamInfo.active(streamName, currentVersion, truncateBefore, entryCount)
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Answer this actor's supervisor name, so child actors can use the same supervisor.
   */
  private supervisorName(): string {
    return this.environment().supervisorName()
  }

  /**
   * Convert a Source to an Entry using EntryAdapterProvider.
   * This ensures custom adapters are used for serialization.
   * The globalPosition is calculated based on the current journal length.
   */
  private sourceToEntry<S>(source: Source<S>, streamVersion: number, metadata: Metadata): Entry<T> {
    const globalPosition = this.journal.length // Journal assigns globalPosition
    // Use EntryAdapterProvider to convert Source to Entry
    // This will use custom adapters if registered, or default adapter otherwise
    const adapterEntry = this.adapterProvider.asEntry(source, streamVersion, metadata)
    // Create a new TextEntry with proper globalPosition
    // Use values from adapterEntry (id, type, typeVersion, entryData, streamVersion, metadata)
    // Cast through unknown because T is typically string for InMemoryJournal
    return new TextEntry(
      adapterEntry.id,
      globalPosition,
      adapterEntry.type,
      adapterEntry.typeVersion,
      adapterEntry.entryData,
      (adapterEntry as TextEntry).streamVersion,
      adapterEntry.metadata
    ) as unknown as Entry<T>
  }

  /**
   * Insert an entry into the journal and update stream indexes.
   */
  private insert(streamName: string, streamVersion: number, entry: Entry<T>): void {
    const entryIndex = this.journal.length
    this.journal.push(entry)

    let versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes) {
      versionIndexes = new Map()
      this.streamIndexes.set(streamName, versionIndexes)
    }
    versionIndexes.set(streamVersion, entryIndex)
  }

  /**
   * Get the current (highest) version of a stream.
   */
  private getCurrentVersion(streamName: string): number {
    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      return 0
    }
    return Math.max(...versionIndexes.keys())
  }

  /**
   * Validate expected version for optimistic concurrency.
   * Returns null if valid, or an Outcome with the error result.
   */
  private validateExpectedVersion(streamName: string, expectedVersion: number): Outcome<never, Result> | null {
    const currentVersion = this.getCurrentVersion(streamName)

    // StreamState.Any (-2) = skip check
    if (StreamState.isAny(expectedVersion)) {
      return null
    }

    // StreamState.NoStream (-1) = must not exist
    if (StreamState.isNoStream(expectedVersion)) {
      if (currentVersion > 0) {
        return Outcome.success(Result.ConcurrencyViolation)
      }
      return null
    }

    // StreamState.StreamExists (-4) = must exist (any version)
    if (StreamState.isStreamExists(expectedVersion)) {
      if (currentVersion === 0) {
        return Outcome.success(Result.ConcurrencyViolation)
      }
      return null
    }

    // Concrete version check
    if (StreamState.isConcreteVersion(expectedVersion)) {
      // For new streams, expectedVersion should be 1
      // For existing streams, expectedVersion should be currentVersion + 1
      const expectedCurrentVersion = expectedVersion - 1
      if (expectedCurrentVersion !== currentVersion) {
        return Outcome.success(Result.ConcurrencyViolation)
      }
    }

    return null
  }

  /**
   * Resolve the actual version to use for append.
   * For special states, calculate the next version automatically.
   */
  private resolveActualVersion(streamName: string, expectedVersion: number): number {
    if (StreamState.isSpecialState(expectedVersion)) {
      return this.getCurrentVersion(streamName) + 1
    }
    return expectedVersion
  }
}

/**
 * In-memory implementation of StreamReader.
 * Extends Actor for compatibility with the Journal actor model.
 */
class InMemoryStreamReader<T> extends Actor implements StreamReader<T> {
  private readonly journalEntries: Entry<T>[]
  private readonly streamIndexes: Map<string, Map<number, number>>
  private readonly snapshotStore: Map<string, State<unknown>>
  private readonly tombstones: Set<string>
  private readonly softDeleted: Map<string, number>
  private readonly truncateBeforeMap: Map<string, number>
  private readonly readerName: string

  constructor(
    journal: Entry<T>[],
    streamIndexes: Map<string, Map<number, number>>,
    snapshots: Map<string, State<unknown>>,
    tombstones: Set<string>,
    softDeleted: Map<string, number>,
    truncateBeforeMap: Map<string, number>,
    name: string
  ) {
    super()
    this.journalEntries = journal
    this.streamIndexes = streamIndexes
    this.snapshotStore = snapshots
    this.tombstones = tombstones
    this.softDeleted = softDeleted
    this.truncateBeforeMap = truncateBeforeMap
    this.readerName = name
  }

  /**
   * Read the stream for the given stream name.
   */
  async streamFor(streamName: string): Promise<EntryStream<T>> {
    // Check if tombstoned
    if (this.tombstones.has(streamName)) {
      const currentVersion = this.getMaxVersion(streamName)
      return EntryStream.tombstoned<T>(streamName, currentVersion)
    }

    // Check if soft-deleted
    const deletedAtVersion = this.softDeleted.get(streamName)
    if (deletedAtVersion !== undefined) {
      return EntryStream.softDeleted<T>(streamName, deletedAtVersion)
    }

    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      // Return empty stream
      return EntryStream.empty<T>(streamName)
    }

    const truncateBefore = this.truncateBeforeMap.get(streamName) || 0

    // Get all entries for this stream in order, respecting truncate-before
    const entries: Entry<T>[] = []
    let maxVersion = 0

    for (const [version, index] of versionIndexes.entries()) {
      if (version >= truncateBefore) {
        entries.push(this.journalEntries[index])
      }
      maxVersion = Math.max(maxVersion, version)
    }

    // Sort entries by version (they should already be in order, but just to be safe)
    entries.sort((a, b) => {
      const aId = parseInt(a.id)
      const bId = parseInt(b.id)
      return aId - bId
    })

    const snapshot = this.snapshotStore.get(streamName) || null

    return new EntryStream(streamName, maxVersion, entries, snapshot, false, false)
  }

  /**
   * Get the maximum version of a stream.
   */
  private getMaxVersion(streamName: string): number {
    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      return 0
    }
    return Math.max(...versionIndexes.keys())
  }
}
