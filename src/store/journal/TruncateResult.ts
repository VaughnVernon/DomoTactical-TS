// Copyright © 2012-2026 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2026 Kalele, Inc. All rights reserved.
//
// See: LICENSE.md in repository root directory
//
// This file is part of DomoTactical-TS.
//
// DomoTactical-TS is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of
// the License, or (at your option) any later version.
//
// DomoTactical-TS is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with DomoTactical-TS. If not, see <https://www.gnu.org/licenses/>.

import { Result } from '../Result.js'
import { StorageException } from '../StorageException.js'
import { Outcome } from '../Outcome.js'

/**
 * Result of a truncate-before operation on a stream.
 *
 * Events with version less than the truncate position become invisible
 * to reads, but the events are not physically deleted. This is similar
 * to EventStoreDB's $tb (truncate-before) metadata.
 *
 * @example
 * ```typescript
 * // Hide all events before version 100
 * const result = await journal.truncateBefore('account-123', 100)
 *
 * if (result.isSuccess()) {
 *   console.log(`Events before version ${result.truncatedBefore} are now hidden`)
 * }
 *
 * // Subsequent reads will only return events from version 100 onwards
 * const stream = await reader.streamFor('account-123')
 * // stream.entries will not include events with version < 100
 * ```
 */
export class TruncateResult {
  constructor(
    /** The outcome of the truncate operation */
    public readonly outcome: Outcome<StorageException, Result>,
    /** The name of the stream that was truncated */
    public readonly streamName: string,
    /** The version before which events are hidden */
    public readonly truncatedBefore: number
  ) {}

  /**
   * Create a successful truncate result.
   */
  static success(streamName: string, truncatedBefore: number): TruncateResult {
    return new TruncateResult(
      Outcome.success(Result.Success),
      streamName,
      truncatedBefore
    )
  }

  /**
   * Create a result for a tombstoned stream.
   */
  static tombstoned(streamName: string): TruncateResult {
    return new TruncateResult(
      Outcome.success(Result.StreamDeleted),
      streamName,
      -1
    )
  }

  /**
   * Create a result for a stream that doesn't exist.
   */
  static notFound(streamName: string): TruncateResult {
    return new TruncateResult(
      Outcome.success(Result.NotFound),
      streamName,
      -1
    )
  }

  /**
   * Check if the truncate operation was successful.
   */
  isSuccess(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.Success
  }

  /**
   * Check if the stream was tombstoned (can't truncate).
   */
  wasTombstoned(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.StreamDeleted
  }

  /**
   * Check if the stream was not found.
   */
  wasNotFound(): boolean {
    return this.outcome.isSuccess() && this.outcome.value === Result.NotFound
  }
}
