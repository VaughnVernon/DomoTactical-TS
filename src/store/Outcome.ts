// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

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
