// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Result } from '../Result.js'
import { StorageException } from '../StorageException.js'
import { Outcome } from '../Outcome.js'

/**
 * Result of a soft delete operation on a stream.
 *
 * A soft-deleted stream's events become invisible to normal reads,
 * but the stream can be reopened by appending new events.
 * Event numbers continue from where they left off.
 *
 * @example
 * ```typescript
 * const result = await journal.softDelete('account-123')
 *
 * if (result.isSuccess()) {
 *   console.log(`Stream soft-deleted at version ${result.deletedAtVersion}`)
 * }
 *
 * // Later, reopen the stream by appending
 * await journal.append('account-123', nextVersion, newEvent, metadata)
 * ```
 */
export class DeleteResult {
  constructor(
    /** The outcome of the delete operation */
    public readonly outcome: Outcome<StorageException, Result>,
    /** The name of the stream that was soft-deleted */
    public readonly streamName: string,
    /** The version at which the stream was deleted */
    public readonly deletedAtVersion: number
  ) {}

  /**
   * Create a successful delete result.
   */
  static success(streamName: string, deletedAtVersion: number): DeleteResult {
    return new DeleteResult(
      Outcome.success(Result.Success),
      streamName,
      deletedAtVersion
    )
  }

  /**
   * Create a result for an already soft-deleted stream.
   */
  static alreadyDeleted(streamName: string, deletedAtVersion: number): DeleteResult {
    return new DeleteResult(
      Outcome.success(Result.StreamDeleted),
      streamName,
      deletedAtVersion
    )
  }

  /**
   * Create a result for a tombstoned stream.
   */
  static tombstoned(streamName: string): DeleteResult {
    return new DeleteResult(
      Outcome.success(Result.StreamDeleted),
      streamName,
      -1
    )
  }

  /**
   * Create a result for a stream that doesn't exist.
   */
  static notFound(streamName: string): DeleteResult {
    return new DeleteResult(
      Outcome.success(Result.NotFound),
      streamName,
      -1
    )
  }

  /**
   * Check if the delete operation was successful.
   */
  isSuccess(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.Success
  }

  /**
   * Check if the stream was already deleted (soft or hard).
   */
  wasAlreadyDeleted(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.StreamDeleted
  }

  /**
   * Check if the stream was not found.
   */
  wasNotFound(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.NotFound
  }
}
