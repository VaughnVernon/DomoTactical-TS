// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor } from 'domo-actors'
import { Entry } from '../../Entry.js'
import { JournalReader } from '../JournalReader.js'

/**
 * In-memory implementation of JournalReader.
 * Extends Actor for use with the actor model.
 *
 * Maintains a position pointer into the shared journal entry list.
 * Multiple readers can exist simultaneously, each with independent positions.
 *
 * This implementation:
 * - Reads from a shared journal array (all entries across all streams)
 * - Maintains its own position pointer
 * - Is thread-safe for single-process use (JavaScript is single-threaded)
 * - Position is volatile (resets on restart)
 *
 * @template T the type of entry data (typically string for JSON)
 */
export class InMemoryJournalReader<T> extends Actor implements JournalReader<T> {
  /** Current reading position (0-based index) */
  private currentPosition: number = 0

  /** Reference to the shared journal entries */
  private readonly journal: Entry<T>[]

  /** The name of this reader */
  private readonly readerName: string

  /**
   * Construct an InMemoryJournalReader.
   *
   * @param journal reference to the shared journal entries
   * @param readerName the name of this reader
   */
  constructor(journal: Entry<T>[], readerName: string) {
    super()
    this.journal = journal
    this.readerName = readerName
  }

  /**
   * Read the next available entries up to the maximum count.
   *
   * @param max maximum number of entries to read
   * @returns Promise<Entry<T>[]> array of entries
   */
  async readNext(max: number): Promise<Entry<T>[]> {
    if (max <= 0) {
      throw new Error('max must be greater than 0')
    }

    // Calculate end position
    const startPos = this.currentPosition
    const endPos = Math.min(startPos + max, this.journal.length)

    // Read entries from current position to end position
    const entries = this.journal.slice(startPos, endPos)

    // Advance position
    this.currentPosition = endPos

    return entries
  }

  /**
   * Answer the name of this reader.
   *
   * @returns Promise<string> the reader name
   */
  async name(): Promise<string> {
    return this.readerName
  }

  /**
   * Seek to a specific position in the journal.
   *
   * @param position the position to seek to (0-based index)
   * @returns Promise<void>
   */
  async seek(position: number): Promise<void> {
    if (position < 0) {
      throw new Error('position cannot be negative')
    }

    // Allow seeking beyond current journal size (for future entries)
    this.currentPosition = position
  }

  /**
   * Answer the current reading position.
   *
   * @returns Promise<number> the current position (0-based)
   */
  async position(): Promise<number> {
    return this.currentPosition
  }

  /**
   * Rewind to the beginning of the journal.
   *
   * @returns Promise<void>
   */
  async rewind(): Promise<void> {
    this.currentPosition = 0
  }

  /**
   * Answer the total number of entries in the journal.
   * Useful for debugging and testing.
   *
   * @returns number the total entry count
   */
  totalEntries(): number {
    return this.journal.length
  }

  /**
   * Answer whether the reader is at the end of the journal.
   *
   * @returns boolean true if at end
   */
  isAtEnd(): boolean {
    return this.currentPosition >= this.journal.length
  }
}
