// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Enum representing expected stream state for optimistic concurrency control.
 *
 * Use these values when appending to a stream to specify what state
 * the stream should be in for the operation to succeed.
 *
 * @example
 * ```typescript
 * // Append only if stream doesn't exist yet
 * await journal.append(streamName, StreamState.NoStream, event, metadata)
 *
 * // Append regardless of current version (disable concurrency check)
 * await journal.append(streamName, StreamState.Any, event, metadata)
 *
 * // Append only if stream exists (any version)
 * await journal.append(streamName, StreamState.StreamExists, event, metadata)
 *
 * // Append only if stream is at version 5
 * await journal.append(streamName, 5, event, metadata)
 * ```
 */
export enum StreamState {
  /**
   * Don't check version - append regardless of current stream state.
   * Use this to disable optimistic concurrency checking.
   */
  Any = -2,

  /**
   * Expect stream doesn't exist yet.
   * The append will fail with ConcurrencyViolation if the stream already has events.
   */
  NoStream = -1,

  /**
   * Expect stream exists with at least one event.
   * The append will fail with ConcurrencyViolation if the stream is empty.
   */
  StreamExists = -4,
}

/**
 * Type guard and helper functions for StreamState.
 */
export namespace StreamState {
  /**
   * Check if a version value represents the Any state.
   */
  export function isAny(version: number): boolean {
    return version === StreamState.Any
  }

  /**
   * Check if a version value represents the NoStream state.
   */
  export function isNoStream(version: number): boolean {
    return version === StreamState.NoStream
  }

  /**
   * Check if a version value represents the StreamExists state.
   */
  export function isStreamExists(version: number): boolean {
    return version === StreamState.StreamExists
  }

  /**
   * Check if a version value is a special StreamState value.
   */
  export function isSpecialState(version: number): boolean {
    return isAny(version) || isNoStream(version) || isStreamExists(version)
  }

  /**
   * Check if a version value represents a concrete version number (not a special state).
   */
  export function isConcreteVersion(version: number): boolean {
    return version >= 0
  }
}
