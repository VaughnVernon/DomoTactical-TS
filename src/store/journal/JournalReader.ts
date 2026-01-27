// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { ActorProtocol } from 'domo-actors'
import { Entry } from './Entry'

/**
 * Reader for sequential access to all Entry instances in the journal.
 *
 * A JournalReader provides a cursor-based interface for reading through
 * the entire journal from beginning to end. Multiple named readers can
 * exist simultaneously, each maintaining its own independent position.
 *
 * JournalReader extends ActorProtocol, meaning implementations must be Actors.
 *
 * This is the key component for CQRS projections, allowing them to:
 * - Read all events in order from the beginning
 * - Continue reading newly appended events
 * - Maintain position across restarts (when backed by persistent storage)
 *
 * Unlike StreamReader which reads entries for a specific stream (entity),
 * JournalReader reads ALL entries across ALL streams in chronological order.
 *
 * @template T the type of entry data (typically string for JSON)
 *
 * @example
 * ```typescript
 * // Create a journal reader
 * const reader = await journal.journalReader('projection-reader')
 *
 * // Read first batch of entries
 * const entries1 = await reader.readNext(100)
 * console.log(`Position: ${await reader.position()}`) // 100
 *
 * // Read next batch
 * const entries2 = await reader.readNext(100)
 * console.log(`Position: ${await reader.position()}`) // 200
 *
 * // Rewind to beginning
 * await reader.rewind()
 * console.log(`Position: ${await reader.position()}`) // 0
 *
 * // Seek to specific position
 * await reader.seek(150)
 * const entries3 = await reader.readNext(50)
 * ```
 */
export interface JournalReader<T> extends ActorProtocol {
  /**
   * Read the next available entries up to the maximum count.
   *
   * Reads entries sequentially from the current position. If fewer entries
   * are available than requested, returns only the available entries.
   * Returns empty array if at end of journal.
   *
   * This method advances the reader's position by the number of entries read.
   *
   * @param max maximum number of entries to read (must be > 0)
   * @returns Promise<Entry<T>[]> array of entries (may be empty)
   *
   * @example
   * ```typescript
   * const entries = await reader.readNext(100)
   * console.log(`Read ${entries.length} entries`)
   * ```
   */
  readNext(max: number): Promise<Entry<T>[]>

  /**
   * Answer the name of this reader.
   *
   * The name identifies this reader instance and allows multiple
   * readers to coexist with independent positions.
   *
   * @returns Promise<string> the reader name
   */
  name(): Promise<string>

  /**
   * Seek to a specific position in the journal.
   *
   * Sets the reader's position to the specified index. The next call to
   * readNext() will read starting from this position.
   *
   * Position is 0-based (0 = first entry).
   *
   * @param position the position to seek to (0-based index)
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // Jump to entry 500
   * await reader.seek(500)
   * const entries = await reader.readNext(10) // Reads entries 500-509
   * ```
   */
  seek(position: number): Promise<void>

  /**
   * Answer the current reading position.
   *
   * Returns the 0-based index of the next entry that will be read.
   * Position 0 means at the beginning (no entries read yet).
   *
   * @returns Promise<number> the current position (0-based)
   *
   * @example
   * ```typescript
   * console.log(`Currently at position ${await reader.position()}`)
   * ```
   */
  position(): Promise<number>

  /**
   * Rewind to the beginning of the journal.
   *
   * Resets the position to 0, allowing the journal to be re-read
   * from the start.
   *
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await reader.rewind()
   * console.log(`Position: ${reader.position()}`) // 0
   * ```
   */
  rewind(): Promise<void>
}
