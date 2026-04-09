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

/**
 * Outcome represents the result of an operation that can either succeed or fail.
 * This is a discriminated union type similar to Rust's Result or Scala's Either.
 *
 * @template F the failure type
 * @template S the success type
 */
export type Outcome<F, S> = Success<F, S> | Failure<F, S>

/**
 * Successful outcome carrying a success value.
 */
export class Success<F, S> {
  readonly kind: 'success' = 'success'
  constructor(public readonly value: S) {}

  isSuccess(): this is Success<F, S> {
    return true
  }

  isFailure(): this is Failure<F, S> {
    return false
  }

  static of<F, S>(value: S): Success<F, S> {
    return new Success(value)
  }
}

/**
 * Failed outcome carrying a failure value.
 */
export class Failure<F, S> {
  readonly kind: 'failure' = 'failure'
  constructor(public readonly error: F) {}

  isSuccess(): this is Success<F, S> {
    return false
  }

  isFailure(): this is Failure<F, S> {
    return true
  }

  static of<F, S>(error: F): Failure<F, S> {
    return new Failure(error)
  }
}

/**
 * Helper functions for working with Outcomes.
 */
export namespace Outcome {
  export function success<F, S>(value: S): Outcome<F, S> {
    return new Success(value)
  }

  export function failure<F, S>(error: F): Outcome<F, S> {
    return new Failure(error)
  }
}
