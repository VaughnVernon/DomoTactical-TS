// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { ActorProtocol } from 'domo-actors'
import { Metadata } from '../Metadata'
import { Result } from '../Result'
import { Source } from '../Source'
import { StorageException } from '../StorageException'
import { EntryStream } from './EntryStream'
import { JournalReader } from './JournalReader'
import { Outcome } from './Outcome'

/**
 * Result of an append operation, containing all contextual information.
 * @template S the Source type
 * @template ST the snapshot type
 */
export class AppendResult<S, ST> {
  constructor(
    public readonly outcome: Outcome<StorageException, Result>,
    public readonly streamName: string,
    public readonly streamVersion: number,
    public readonly source: Source<S> | null,
    public readonly sources: Source<S>[] | null,
    public readonly snapshot: ST | null
  ) {}

  /**
   * Create an AppendResult for a single source append.
   */
  static forSource<S, ST>(
    outcome: Outcome<StorageException, Result>,
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    snapshot: ST | null
  ): AppendResult<S, ST> {
    return new AppendResult(outcome, streamName, streamVersion, source, null, snapshot)
  }

  /**
   * Create an AppendResult for multiple sources append.
   */
  static forSources<S, ST>(
    outcome: Outcome<StorageException, Result>,
    streamName: string,
    streamVersion: number,
    sources: Source<S>[],
    snapshot: ST | null
  ): AppendResult<S, ST> {
    return new AppendResult(outcome, streamName, streamVersion, null, sources, snapshot)
  }

  /**
   * Answer whether the append was successful.
   */
  isSuccess(): boolean {
    return this.outcome.isSuccess()
  }

  /**
   * Answer whether the append failed.
   */
  isFailure(): boolean {
    return this.outcome.isFailure()
  }
}

/**
 * Stream reader for reading entity event streams.
 *
 * StreamReader extends ActorProtocol, meaning implementations must be Actors.
 * This ensures compatibility with the Journal actor that creates and owns
 * the StreamReader instances.
 *
 * @template T the type of entry data
 */
export interface StreamReader<T> extends ActorProtocol {
  /**
   * Read the stream for the given stream name.
   * @param streamName the name of the stream to read
   * @returns Promise resolving to the EntryStream
   */
  streamFor(streamName: string): Promise<EntryStream<T>>
}

/**
 * The top-level journal used within a Bounded Context to store all of its Entry instances
 * for EventSourced and CommandSourced components.
 *
 * Each use of the journal appends some number of Entry instances and perhaps a single snapshot State.
 *
 * Journal extends ActorProtocol, meaning implementations must be Actors.
 *
 * @template T the concrete type of Entry stored (typically string for JSON)
 */
export interface Journal<T> extends ActorProtocol {
  /**
   * Append a single Source as an Entry to the journal.
   * @param streamName the name of the stream to append
   * @param streamVersion the version of the stream to append
   * @param source the Source to append as an Entry
   * @param metadata the Metadata associated with the Source
   * @returns Promise resolving to AppendResult
   */
  append<S, ST>(
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    metadata: Metadata
  ): Promise<AppendResult<S, ST>>

  /**
   * Append a single Source as an Entry along with a snapshot.
   * @param streamName the name of the stream to append
   * @param streamVersion the version of the stream to append
   * @param source the Source to append as an Entry
   * @param metadata the Metadata associated with the Source
   * @param snapshot the full state snapshot to persist
   * @returns Promise resolving to AppendResult
   */
  appendWith<S, ST>(
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    metadata: Metadata,
    snapshot: ST
  ): Promise<AppendResult<S, ST>>

  /**
   * Append multiple Sources as Entries to the journal.
   * @param streamName the name of the stream to append
   * @param fromStreamVersion the starting version of the stream
   * @param sources the list of Sources to append as Entries
   * @param metadata the Metadata associated with the Sources
   * @returns Promise resolving to AppendResult
   */
  appendAll<S, ST>(
    streamName: string,
    fromStreamVersion: number,
    sources: Source<S>[],
    metadata: Metadata
  ): Promise<AppendResult<S, ST>>

  /**
   * Append multiple Sources as Entries along with a snapshot.
   * @param streamName the name of the stream to append
   * @param fromStreamVersion the starting version of the stream
   * @param sources the list of Sources to append as Entries
   * @param metadata the Metadata associated with the Sources
   * @param snapshot the full state snapshot to persist
   * @returns Promise resolving to AppendResult
   */
  appendAllWith<S, ST>(
    streamName: string,
    fromStreamVersion: number,
    sources: Source<S>[],
    metadata: Metadata,
    snapshot: ST
  ): Promise<AppendResult<S, ST>>

  /**
   * Get a stream reader for reading entity event streams.
   * @param name the name of the reader
   * @returns Promise resolving to a StreamReader
   */
  streamReader(name: string): Promise<StreamReader<T>>

  /**
   * Get a journal reader for sequential access to all entries.
   *
   * Unlike StreamReader which reads entries for a specific stream (entity),
   * JournalReader reads ALL entries across ALL streams in chronological order.
   *
   * This is the primary method for CQRS projections to consume the event stream.
   *
   * Multiple readers with different names maintain independent positions.
   * Calling this method with the same name returns the existing reader.
   *
   * @param name the name of the reader (e.g., "projection-reader")
   * @returns Promise resolving to a JournalReader
   *
   * @example
   * ```typescript
   * const reader = await journal.journalReader('my-projection')
   * const entries = await reader.readNext(100)
   * ```
   */
  journalReader(name: string): Promise<JournalReader<T>>
}
