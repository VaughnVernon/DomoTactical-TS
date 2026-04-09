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

import { Metadata } from '../store/Metadata.js'
import { Source } from '../store/Source.js'

/**
 * The elements used in the attempted apply operation.
 * @template T the type of the state
 */
export class Applicable<T> {
  constructor(
    public readonly state: T | null,
    public readonly sources: Source<unknown>[],
    public readonly metadata: Metadata
  ) {}
}

/**
 * An Error used to indicate the failure of an attempt to apply()
 * state and/or Source instances.
 */
export class ApplyFailedError extends Error {
  public readonly applicable: Applicable<unknown>

  constructor(applicable: Applicable<unknown>)
  constructor(applicable: Applicable<unknown>, message: string)
  constructor(applicable: Applicable<unknown>, message: string, cause: Error)
  constructor(applicable: Applicable<unknown>, message?: string, cause?: Error) {
    super(message || 'Apply operation failed')
    this.name = 'ApplyFailedError'
    this.applicable = applicable

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApplyFailedError.prototype)

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplyFailedError)
    }

    // Set cause if provided
    if (cause) {
      this.cause = cause
    }
  }

  /**
   * Get the applicable context with specific type.
   * @template T the type of the state
   * @returns Applicable<T>
   */
  getApplicable<T>(): Applicable<T> {
    return this.applicable as Applicable<T>
  }
}
