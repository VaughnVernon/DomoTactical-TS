// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Enumeration of possible store operation results.
 *
 * Results indicate the outcome of storage operations (journal appends, document reads/writes).
 * Each result type has a corresponding type guard function in the `Result` namespace.
 *
 * @example
 * ```typescript
 * const result = await journal.append(streamName, version, event, metadata)
 * if (Result.isSuccess(result.outcome.value)) {
 *   console.log('Event appended successfully')
 * } else if (Result.isConcurrencyViolation(result.outcome.value)) {
 *   console.log('Version mismatch - retry with correct version')
 * }
 * ```
 */
export enum Result {
  /**
   * The operation failed due to an optimistic concurrency violation.
   *
   * This occurs when:
   * - Journal append: The expected stream version doesn't match the actual version
   * - Document write: The document was modified by another process since last read
   *
   * Resolution: Re-read the current state and retry with the correct version.
   */
  ConcurrencyViolation = 'ConcurrencyViolation',

  /**
   * The operation failed due to an unexpected error (typically an exception).
   *
   * This is a general error category for failures that don't fit other result types.
   * Check the associated `StorageException` for details about the underlying cause.
   */
  Error = 'Error',

  /**
   * The operation failed for a known, expected reason.
   *
   * Unlike `Error` which indicates unexpected problems, `Failure` represents
   * anticipated failure conditions that are part of normal operation flow.
   */
  Failure = 'Failure',

  /**
   * A batch read operation found some but not all requested items.
   *
   * This occurs when reading multiple documents or entries by ID and only
   * a subset exists. The partial results are still returned.
   */
  NotAllFound = 'NotAllFound',

  /**
   * The requested item was not found.
   *
   * This occurs when:
   * - Reading a document by ID that doesn't exist
   * - Reading a stream that has no entries
   * - Tombstoning or soft-deleting a non-existent stream
   *
   * Note: This differs from `NoTypeStore` which indicates the type/category
   * itself doesn't exist, not just the specific item.
   */
  NotFound = 'NotFound',

  /**
   * The type store (document category) does not exist.
   *
   * In document stores, documents are organized by type (e.g., "User", "Order").
   * This result indicates that no documents of the requested type have ever
   * been written, so the type's storage partition doesn't exist.
   *
   * This is distinct from `NotFound`:
   * - `NoTypeStore`: The category "User" has never had any documents
   * - `NotFound`: The category "User" exists but user "123" wasn't found
   *
   * @example
   * ```typescript
   * // First read of type "Invoice" before any invoices are written
   * const result = await documentStore.read('inv-001', 'Invoice')
   * // result may be NoTypeStore if no Invoice documents exist yet
   * ```
   */
  NoTypeStore = 'NoTypeStore',

  /**
   * The stream has been tombstoned (permanently deleted).
   *
   * This occurs when:
   * - Attempting to append to a tombstoned stream
   * - Attempting to soft-delete an already tombstoned stream
   *
   * A tombstoned stream cannot be reopened. This is a permanent deletion
   * used for GDPR compliance and data lifecycle management.
   */
  StreamDeleted = 'StreamDeleted',

  /**
   * The operation completed successfully.
   *
   * For append operations, the event/command was persisted.
   * For read operations, the requested data was found and returned.
   * For lifecycle operations, the stream state was updated as requested.
   */
  Success = 'Success',
}

/**
 * Type guard and helper functions for Result enum.
 *
 * These functions provide a type-safe way to check result values,
 * which is especially useful in switch statements and conditional logic.
 *
 * @example
 * ```typescript
 * function handleResult(result: Result): void {
 *   if (Result.isSuccess(result)) {
 *     console.log('Operation succeeded')
 *   } else if (Result.isConcurrencyViolation(result)) {
 *     console.log('Retry with updated version')
 *   } else if (Result.isNotFound(result)) {
 *     console.log('Item does not exist')
 *   }
 * }
 * ```
 */
export namespace Result {
  /**
   * Check if the result indicates a concurrency violation.
   * @param result The result to check
   * @returns true if the result is ConcurrencyViolation
   */
  export function isConcurrencyViolation(result: Result): boolean {
    return result === Result.ConcurrencyViolation
  }

  /**
   * Check if the result indicates an unexpected error.
   * @param result The result to check
   * @returns true if the result is Error
   */
  export function isError(result: Result): boolean {
    return result === Result.Error
  }

  /**
   * Check if the result indicates an expected failure.
   * @param result The result to check
   * @returns true if the result is Failure
   */
  export function isFailure(result: Result): boolean {
    return result === Result.Failure
  }

  /**
   * Check if the result indicates a partial batch read (some items not found).
   * @param result The result to check
   * @returns true if the result is NotAllFound
   */
  export function isNotAllFound(result: Result): boolean {
    return result === Result.NotAllFound
  }

  /**
   * Check if the result indicates the requested item was not found.
   * @param result The result to check
   * @returns true if the result is NotFound
   */
  export function isNotFound(result: Result): boolean {
    return result === Result.NotFound
  }

  /**
   * Check if the result indicates the document type/category doesn't exist.
   * @param result The result to check
   * @returns true if the result is NoTypeStore
   */
  export function isNoTypeStore(result: Result): boolean {
    return result === Result.NoTypeStore
  }

  /**
   * Check if the result indicates the stream was tombstoned (permanently deleted).
   * @param result The result to check
   * @returns true if the result is StreamDeleted
   */
  export function isStreamDeleted(result: Result): boolean {
    return result === Result.StreamDeleted
  }

  /**
   * Check if the result indicates success.
   * @param result The result to check
   * @returns true if the result is Success
   */
  export function isSuccess(result: Result): boolean {
    return result === Result.Success
  }
}
