// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Result } from './Result'

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
