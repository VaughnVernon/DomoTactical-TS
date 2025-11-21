// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Enumeration of possible store operation results.
 * Each result type has corresponding type-checking methods.
 */
export enum Result {
  ConcurrencyViolation = 'ConcurrencyViolation',
  Error = 'Error',
  Failure = 'Failure',
  NotAllFound = 'NotAllFound',
  NotFound = 'NotFound',
  NoTypeStore = 'NoTypeStore',
  Success = 'Success',
}

/**
 * Type guard and helper functions for Result enum.
 */
export namespace Result {
  export function isConcurrencyViolation(result: Result): boolean {
    return result === Result.ConcurrencyViolation
  }

  export function isError(result: Result): boolean {
    return result === Result.Error
  }

  export function isFailure(result: Result): boolean {
    return result === Result.Failure
  }

  export function isNotAllFound(result: Result): boolean {
    return result === Result.NotAllFound
  }

  export function isNotFound(result: Result): boolean {
    return result === Result.NotFound
  }

  export function isNoTypeStore(result: Result): boolean {
    return result === Result.NoTypeStore
  }

  export function isSuccess(result: Result): boolean {
    return result === Result.Success
  }
}
