// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Source } from '../Source'
import { Metadata } from '../Metadata'
import { State } from '../State'
import { Result } from '../Result'
import { StorageException } from '../StorageException'

/**
 * Outcome type for document store operations.
 * Either Success with Result or Failure with StorageException.
 */
export type Outcome<T> =
  | { success: true; result: Result; value: T }
  | { success: false; error: StorageException }

/**
 * Bundle containing document metadata for batch read operations.
 * Used to read multiple documents in a single operation.
 */
export interface DocumentBundle<S = any> {
  /** Unique identifier of the document */
  id: string
  /** Type name of the document (used for store partitioning) */
  type: string
  /** The document state (present for write operations) */
  state?: S
  /** Version of the document state */
  stateVersion?: number
  /** Metadata associated with the document */
  metadata?: Metadata
}

/**
 * Result of a read operation containing the document and metadata.
 */
export interface ReadResult<S = any> {
  /** Outcome of the read operation */
  outcome: Outcome<S | null>
  /** Unique identifier of the document */
  id: string
  /** The document state, or null if not found */
  state: S | null
  /** Version of the document state, or -1 if not found */
  stateVersion: number
  /** Metadata associated with the document, or null if not found */
  metadata: Metadata | null
}

/**
 * Result of a batch read operation.
 */
export interface ReadAllResult {
  /** Outcome of the read operation */
  outcome: Outcome<DocumentBundle[]>
  /** Collection of document bundles that were successfully read */
  bundles: DocumentBundle[]
}

/**
 * Result of a write operation.
 */
export interface WriteResult<S = any, C = any> {
  /** Outcome of the write operation */
  outcome: Outcome<S>
  /** Unique identifier of the document */
  id: string
  /** The document state that was written */
  state: S
  /** Version of the document state */
  stateVersion: number
  /** Sources/events that were appended with the write */
  sources: Source<C>[]
}

/**
 * DocumentStore provides key-value and document storage with optional event sourcing.
 *
 * Documents are stored by type and id, with optional metadata and version tracking.
 * Each write can optionally append sources (events/commands) for event sourcing.
 *
 * The API is fully async, returning Promise-based results.
 *
 * @example
 * ```typescript
 * const store = new InMemoryDocumentStore()
 *
 * // Write a document
 * const writeResult = await store.write(
 *   'user-123',
 *   'User',
 *   { name: 'Alice', email: 'alice@example.com' },
 *   1
 * )
 *
 * // Read a document
 * const readResult = await store.read('user-123', 'User')
 * if (readResult.outcome.success) {
 *   console.log(readResult.state)
 * }
 * ```
 */
export interface DocumentStore {
  /**
   * Read a single document by id and type.
   *
   * @param id Unique identifier of the document
   * @param type Type name of the document (used for store partitioning)
   * @returns Promise resolving to ReadResult with the document or null if not found
   */
  read<S = any>(id: string, type: string): Promise<ReadResult<S>>

  /**
   * Read multiple documents in a single batch operation.
   *
   * If some documents are not found, the result will contain only the documents
   * that were found, and the outcome will indicate partial success.
   *
   * @param bundles Collection of document bundles defining which documents to read
   * @returns Promise resolving to ReadAllResult with all found documents
   */
  readAll(bundles: DocumentBundle[]): Promise<ReadAllResult>

  /**
   * Write a document with optional sources and metadata.
   *
   * Implements optimistic concurrency control via version checking.
   * If the stored version is >= the provided version, the write will fail
   * with a ConcurrencyViolation result.
   *
   * @param id Unique identifier of the document
   * @param type Type name of the document (used for store partitioning)
   * @param state The document state to write
   * @param stateVersion Version of the document state
   * @param sources Optional array of sources (events/commands) to append
   * @param metadata Optional metadata to associate with the document
   * @returns Promise resolving to WriteResult with the outcome
   */
  write<S = any, C = any>(
    id: string,
    type: string,
    state: S,
    stateVersion: number,
    sources?: Source<C>[],
    metadata?: Metadata
  ): Promise<WriteResult<S, C>>
}
