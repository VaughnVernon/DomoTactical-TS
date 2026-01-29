// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { State } from '../State.js'
import { Entry } from './Entry.js'

/**
 * The entries and possible snapshot of a full or partial stream of a given named stream.
 *
 * @template T the concrete type of the stream of Entry<T>
 */
export class EntryStream<T> {
  /** The most recent State snapshot, if any */
  public readonly snapshot: State<unknown> | null

  /** The list of entries of the named stream, possibly just a sub-stream */
  public readonly entries: Entry<T>[]

  /** The name of the stream (generally a global unique identity of an entity/aggregate) */
  public readonly streamName: string

  /**
   * The version of the stream, indicating the 1-based sequence of the last entry.
   * All entry streams start at version 1 and end with the total number of all entries.
   */
  public readonly streamVersion: number

  /**
   * Whether this stream has been tombstoned (hard deleted).
   * A tombstoned stream cannot be reopened or appended to.
   */
  public readonly isTombstoned: boolean

  /**
   * Whether this stream has been soft-deleted.
   * A soft-deleted stream can be reopened by appending new events.
   */
  public readonly isSoftDeleted: boolean

  /**
   * Construct a new EntryStream.
   * @param streamName the name of this stream
   * @param streamVersion the version of the stream
   * @param entries the list of all entries in the named stream or some sub-stream
   * @param snapshot the persisted state snapshot, or null if none
   * @param isTombstoned whether the stream is tombstoned (hard deleted)
   * @param isSoftDeleted whether the stream is soft-deleted
   */
  constructor(
    streamName: string,
    streamVersion: number,
    entries: Entry<T>[],
    snapshot: State<unknown> | null,
    isTombstoned: boolean = false,
    isSoftDeleted: boolean = false
  ) {
    this.streamName = streamName
    this.streamVersion = streamVersion
    this.entries = entries
    this.snapshot = snapshot
    this.isTombstoned = isTombstoned
    this.isSoftDeleted = isSoftDeleted
  }

  /**
   * Answer whether I hold a non-empty snapshot.
   * @returns boolean
   */
  hasSnapshot(): boolean {
    return this.snapshot != null && !this.snapshot.isEmpty()
  }

  /**
   * Answer my size, which is the number of entries.
   * @returns number
   */
  size(): number {
    return this.entries.length
  }

  /**
   * Answer whether this stream is deleted (either tombstoned or soft-deleted).
   * @returns boolean
   */
  isDeleted(): boolean {
    return this.isTombstoned || this.isSoftDeleted
  }

  /**
   * Answer my string representation.
   * @returns string
   */
  toString(): string {
    return `EntryStream[streamName=${this.streamName} streamVersion=${this.streamVersion} entries=${this.entries.length} snapshot=${this.snapshot} tombstoned=${this.isTombstoned} softDeleted=${this.isSoftDeleted}]`
  }

  /**
   * Create an EntryStream for a tombstoned (hard deleted) stream.
   * @param streamName the name of the tombstoned stream
   * @param streamVersion the version at which the stream was tombstoned
   */
  static tombstoned<T>(streamName: string, streamVersion: number = 0): EntryStream<T> {
    return new EntryStream<T>(streamName, streamVersion, [], null, true, false)
  }

  /**
   * Create an EntryStream for a soft-deleted stream.
   * @param streamName the name of the soft-deleted stream
   * @param streamVersion the version at which the stream was deleted
   */
  static softDeleted<T>(streamName: string, streamVersion: number = 0): EntryStream<T> {
    return new EntryStream<T>(streamName, streamVersion, [], null, false, true)
  }

  /**
   * Create an empty EntryStream for a non-existent stream.
   * @param streamName the name of the non-existent stream
   */
  static empty<T>(streamName: string): EntryStream<T> {
    return new EntryStream<T>(streamName, 0, [], null, false, false)
  }
}
