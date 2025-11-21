// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Metadata } from '../../Metadata'
import { Result } from '../../Result'
import { Source } from '../../Source'
import { State, ObjectState } from '../../State'
import { AppendResult, Journal, StreamReader } from '../Journal'
import { Entry } from '../Entry'
import { EntryStream } from '../EntryStream'
import { JournalReader } from '../JournalReader'
import { Outcome } from '../Outcome'
import { InMemoryJournalReader } from './InMemoryJournalReader'
import { EntryAdapterProvider } from '../../EntryAdapterProvider'

/**
 * In-memory implementation of Journal using Map-based storage.
 * Stores entries as JSON strings for simplicity.
 *
 * @template T the type of entry data (typically string for JSON)
 */
export class InMemoryJournal<T> implements Journal<T> {
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

  /** Next entry ID counter */
  private nextEntryId = 1

  /** Adapter provider for Source/Entry conversion */
  private readonly adapterProvider = EntryAdapterProvider.getInstance()

  /**
   * Construct an InMemoryJournal.
   */
  constructor() {}

  /**
   * Append a single Source as an Entry to the journal.
   */
  async append<S, ST>(
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    metadata: Metadata
  ): Promise<AppendResult<S, ST>> {
    const entry = this.sourceToEntry(source, streamVersion, metadata)
    this.insert(streamName, streamVersion, entry)

    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSource<S, ST>(outcome, streamName, streamVersion, source, null)
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
    const entry = this.sourceToEntry(source, streamVersion, metadata)
    this.insert(streamName, streamVersion, entry)

    if (snapshot != null) {
      // Wrap snapshot in a simple State if it's not already one
      if (snapshot instanceof State) {
        this.snapshots.set(streamName, snapshot as State<unknown>)
      } else {
        // Wrap in ObjectState
        const objectState = new ObjectState(streamName, Object, 1, snapshot, streamVersion)
        this.snapshots.set(streamName, objectState)
      }
    }

    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSource(outcome, streamName, streamVersion, source, snapshot)
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
    const entries = sources.map((source, index) =>
      this.sourceToEntry(source, fromStreamVersion + index, metadata)
    )

    entries.forEach((entry, index) => {
      this.insert(streamName, fromStreamVersion + index, entry)
    })

    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSources<S, ST>(outcome, streamName, fromStreamVersion + sources.length - 1, sources, null)
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
    const entries = sources.map((source, index) =>
      this.sourceToEntry(source, fromStreamVersion + index, metadata)
    )

    entries.forEach((entry, index) => {
      this.insert(streamName, fromStreamVersion + index, entry)
    })

    if (snapshot != null) {
      // Wrap snapshot in a simple State if it's not already one
      if (snapshot instanceof State) {
        this.snapshots.set(streamName, snapshot as State<unknown>)
      } else {
        // Wrap in ObjectState
        const objectState = new ObjectState(streamName, Object, 1, snapshot, fromStreamVersion + sources.length - 1)
        this.snapshots.set(streamName, objectState)
      }
    }

    const outcome = Outcome.success<never, Result>(Result.Success)
    return AppendResult.forSources(outcome, streamName, fromStreamVersion + sources.length - 1, sources, snapshot)
  }

  /**
   * Get a stream reader for reading entity event streams.
   */
  async streamReader(name: string): Promise<StreamReader<T>> {
    let reader = this.streamReaders.get(name)
    if (!reader) {
      reader = new InMemoryStreamReader(this.journal, this.streamIndexes, this.snapshots, name)
      this.streamReaders.set(name, reader)
    }
    return reader
  }

  /**
   * Get a journal reader for sequential access to all entries.
   */
  async journalReader(name: string): Promise<JournalReader<T>> {
    let reader = this.journalReaders.get(name)
    if (!reader) {
      reader = new InMemoryJournalReader(this.journal, name)
      this.journalReaders.set(name, reader)
    }
    return reader
  }

  /**
   * Convert a Source to an Entry using EntryAdapterProvider.
   * This ensures custom adapters are used for serialization.
   */
  private sourceToEntry<S>(source: Source<S>, streamVersion: number, metadata: Metadata): Entry<T> {
    const id = String(this.nextEntryId++)
    // Use EntryAdapterProvider to convert Source to Entry
    // This will use custom adapters if registered, or default adapter otherwise
    const entry = this.adapterProvider.asEntry(source, streamVersion, metadata)
    // Set the generated ID
    return {
      ...entry,
      id
    } as Entry<T>
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
}

/**
 * In-memory implementation of StreamReader.
 */
class InMemoryStreamReader<T> implements StreamReader<T> {
  constructor(
    private readonly journal: Entry<T>[],
    private readonly streamIndexes: Map<string, Map<number, number>>,
    private readonly snapshots: Map<string, State<unknown>>,
    private readonly name: string
  ) {}

  /**
   * Read the stream for the given stream name.
   */
  async streamFor(streamName: string): Promise<EntryStream<T>> {
    const versionIndexes = this.streamIndexes.get(streamName)
    if (!versionIndexes || versionIndexes.size === 0) {
      // Return empty stream
      return new EntryStream(streamName, 0, [], null)
    }

    // Get all entries for this stream in order
    const entries: Entry<T>[] = []
    let maxVersion = 0

    for (const [version, index] of versionIndexes.entries()) {
      entries.push(this.journal[index])
      maxVersion = Math.max(maxVersion, version)
    }

    // Sort entries by version (they should already be in order, but just to be safe)
    entries.sort((a, b) => {
      const aId = parseInt(a.id)
      const bId = parseInt(b.id)
      return aId - bId
    })

    const snapshot = this.snapshots.get(streamName) || null

    return new EntryStream(streamName, maxVersion, entries, snapshot)
  }
}
