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

import { Result } from './Result.js'

/**
 * Exception thrown when storage operations fail.
 * Carries the Result that caused the failure.
 */
export class StorageException extends Error {
  /** The result that caused this exception */
  public readonly result: Result

  /**
   * Construct a StorageException.
   * @param result the Result indicating the failure type
   * @param message the error message
   * @param cause optional underlying error that caused this exception
   */
  constructor(result: Result, message: string, cause?: Error) {
    super(message)
    this.name = 'StorageException'
    this.result = result

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, StorageException.prototype)

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageException)
    }

    // Set cause if provided
    if (cause) {
      this.cause = cause
    }
  }

  /**
   * Answer whether I am equal to another StorageException.
   * @param other the other object to compare
   * @returns boolean
   */
  equals(other: unknown): boolean {
    if (other == null || !(other instanceof StorageException)) {
      return false
    }
    return this.result === other.result
  }

  /**
   * Answer my hash code based on the result.
   * @returns number
   */
  hashCode(): number {
    return 31 * this.result.toString().length
  }
}
