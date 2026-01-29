// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Information about a stream's current state.
 *
 * Use this to check stream existence and state before performing operations.
 *
 * @example
 * ```typescript
 * const info = await journal.streamInfo('account-123')
 *
 * if (!info.exists) {
 *   console.log('Stream does not exist')
 * } else if (info.isTombstoned) {
 *   console.log('Stream has been permanently deleted')
 * } else if (info.isSoftDeleted) {
 *   console.log('Stream is soft-deleted but can be reopened')
 * } else {
 *   console.log(`Stream has ${info.entryCount} entries at version ${info.currentVersion}`)
 * }
 * ```
 */
export interface StreamInfo {
  /** The name of the stream */
  readonly streamName: string

  /** Whether the stream exists (has at least one entry or has been created) */
  readonly exists: boolean

  /**
   * The current version (highest entry version) of the stream.
   * Returns 0 if the stream doesn't exist.
   */
  readonly currentVersion: number

  /**
   * Whether the stream has been tombstoned (hard deleted).
   * A tombstoned stream cannot be reopened or appended to.
   */
  readonly isTombstoned: boolean

  /**
   * Whether the stream has been soft-deleted.
   * A soft-deleted stream can be reopened by appending new events.
   */
  readonly isSoftDeleted: boolean

  /**
   * The truncate-before position for this stream.
   * Events with version less than this value are hidden from reads.
   * Returns 0 if no truncation has been set.
   */
  readonly truncateBefore: number

  /**
   * The total number of visible entries in the stream.
   * This accounts for truncation but not soft-delete.
   */
  readonly entryCount: number
}

/**
 * Default implementation of StreamInfo.
 */
export class DefaultStreamInfo implements StreamInfo {
  constructor(
    public readonly streamName: string,
    public readonly exists: boolean,
    public readonly currentVersion: number,
    public readonly isTombstoned: boolean,
    public readonly isSoftDeleted: boolean,
    public readonly truncateBefore: number,
    public readonly entryCount: number
  ) {}

  /**
   * Create a StreamInfo for a non-existent stream.
   */
  static notFound(streamName: string): StreamInfo {
    return new DefaultStreamInfo(streamName, false, 0, false, false, 0, 0)
  }

  /**
   * Create a StreamInfo for a tombstoned stream.
   */
  static tombstoned(streamName: string, currentVersion: number): StreamInfo {
    return new DefaultStreamInfo(streamName, true, currentVersion, true, false, 0, 0)
  }

  /**
   * Create a StreamInfo for a soft-deleted stream.
   */
  static softDeleted(streamName: string, currentVersion: number): StreamInfo {
    return new DefaultStreamInfo(streamName, true, currentVersion, false, true, 0, 0)
  }

  /**
   * Create a StreamInfo for an active stream.
   */
  static active(
    streamName: string,
    currentVersion: number,
    truncateBefore: number,
    entryCount: number
  ): StreamInfo {
    return new DefaultStreamInfo(
      streamName,
      true,
      currentVersion,
      false,
      false,
      truncateBefore,
      entryCount
    )
  }
}
