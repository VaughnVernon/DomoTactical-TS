// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Result } from '../Result.js'
import { StorageException } from '../StorageException.js'
import { Outcome } from './Outcome.js'

/**
 * Result of a tombstone (hard delete) operation on a stream.
 *
 * A tombstoned stream is permanently deleted and cannot be reopened.
 * Any subsequent append or read operations will return StreamDeleted.
 *
 * @example
 * ```typescript
 * const result = await journal.tombstone('account-123')
 *
 * if (result.isSuccess()) {
 *   console.log(`Stream tombstoned at journal position ${result.journalPosition}`)
 * } else if (result.wasAlreadyTombstoned()) {
 *   console.log('Stream was already tombstoned')
 * }
 * ```
 */
export class TombstoneResult {
  constructor(
    /** The outcome of the tombstone operation */
    public readonly outcome: Outcome<StorageException, Result>,
    /** The name of the stream that was tombstoned */
    public readonly streamName: string,
    /** The position in the journal where the tombstone marker was written */
    public readonly journalPosition: number
  ) {}

  /**
   * Create a successful tombstone result.
   */
  static success(streamName: string, journalPosition: number): TombstoneResult {
    return new TombstoneResult(
      Outcome.success(Result.Success),
      streamName,
      journalPosition
    )
  }

  /**
   * Create a result for an already-tombstoned stream.
   */
  static alreadyTombstoned(streamName: string): TombstoneResult {
    return new TombstoneResult(
      Outcome.success(Result.StreamDeleted),
      streamName,
      -1
    )
  }

  /**
   * Create a result for a stream that doesn't exist.
   */
  static notFound(streamName: string): TombstoneResult {
    return new TombstoneResult(
      Outcome.success(Result.NotFound),
      streamName,
      -1
    )
  }

  /**
   * Check if the tombstone operation was successful.
   */
  isSuccess(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.Success
  }

  /**
   * Check if the stream was already tombstoned.
   */
  wasAlreadyTombstoned(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.StreamDeleted
  }

  /**
   * Check if the stream was not found.
   */
  wasNotFound(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.NotFound
  }
}
