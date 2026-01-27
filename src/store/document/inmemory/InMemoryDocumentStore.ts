// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor } from 'domo-actors'
import { Source } from '../../Source'
import { Metadata } from '../../Metadata'
import { TextState } from '../../State'
import { Result } from '../../Result'
import { StorageException } from '../../StorageException'
import {
  DocumentStore,
  DocumentBundle,
  ReadResult,
  ReadAllResult,
  WriteResult,
  Outcome
} from '../DocumentStore'

/**
 * In-memory implementation of DocumentStore using Map-based storage.
 * Extends Actor for use with the actor model.
 *
 * Documents are organized by type name, then by id:
 * - Map<typeName, Map<id, State>>
 *
 * This implementation:
 * - Provides fast in-memory storage for development and testing
 * - Implements optimistic concurrency control via version checking
 * - Stores sources/events separately for event sourcing support
 * - Thread-safe for single-process use
 *
 * @example
 * ```typescript
 * const store = new InMemoryDocumentStore()
 *
 * // Write a document
 * await store.write('user-123', 'User', { name: 'Alice' }, 1)
 *
 * // Read it back
 * const result = await store.read('user-123', 'User')
 * console.log(result.state) // { name: 'Alice' }
 * ```
 */
export class InMemoryDocumentStore extends Actor implements DocumentStore {
  /** Storage map: typeName -> id -> State */
  private readonly store = new Map<string, Map<string, TextState>>()

  /** Sources/events storage: id -> Source[] */
  private readonly sources = new Map<string, Source<any>[]>()

  /**
   * Construct an InMemoryDocumentStore.
   */
  constructor() {
    super()
  }

  /**
   * Read a single document by id and type.
   */
  async read<S = any>(id: string, type: string): Promise<ReadResult<S>> {
    if (!id) {
      return {
        outcome: {
          success: false,
          error: new StorageException(Result.Error, 'The id is null or empty.')
        },
        id,
        state: null,
        stateVersion: -1,
        metadata: null
      }
    }

    if (!type) {
      return {
        outcome: {
          success: false,
          error: new StorageException(Result.Error, 'The type is null or empty.')
        },
        id,
        state: null,
        stateVersion: -1,
        metadata: null
      }
    }

    const typeStore = this.store.get(type)

    if (!typeStore) {
      return {
        outcome: {
          success: false,
          error: new StorageException(Result.NotFound, `Store not found: ${type}`)
        },
        id,
        state: null,
        stateVersion: -1,
        metadata: null
      }
    }

    const raw = typeStore.get(id)

    if (!raw) {
      return {
        outcome: {
          success: false,
          error: new StorageException(Result.NotFound, 'Document not found.')
        },
        id,
        state: null,
        stateVersion: -1,
        metadata: null
      }
    }

    // Parse the state from TextState
    const state = JSON.parse(raw.data) as S

    return {
      outcome: {
        success: true,
        result: Result.Success,
        value: state
      },
      id,
      state,
      stateVersion: raw.dataVersion,
      metadata: raw.metadata
    }
  }

  /**
   * Read multiple documents in a single batch operation.
   */
  async readAll(bundles: DocumentBundle[]): Promise<ReadAllResult> {
    const results: DocumentBundle[] = []
    let foundAll = true

    for (const bundle of bundles) {
      const readResult = await this.read(bundle.id, bundle.type)

      if (readResult.outcome.success && readResult.state !== null) {
        results.push({
          id: readResult.id,
          type: bundle.type,
          state: readResult.state,
          stateVersion: readResult.stateVersion,
          metadata: readResult.metadata || undefined
        })
      } else {
        foundAll = false
      }
    }

    const outcome: Outcome<DocumentBundle[]> = foundAll
      ? {
          success: true,
          result: Result.Success,
          value: results
        }
      : {
          success: false,
          error: new StorageException(
            Result.NotAllFound,
            'Not all documents were found.'
          )
        }

    return {
      outcome,
      bundles: results
    }
  }

  /**
   * Write a document with optional sources and metadata.
   */
  async write<S = any, C = any>(
    id: string,
    type: string,
    state: S,
    stateVersion: number,
    sources: Source<C>[] = [],
    metadata: Metadata = Metadata.nullMetadata()
  ): Promise<WriteResult<S, C>> {
    if (!state) {
      return {
        outcome: {
          success: false,
          error: new StorageException(Result.Error, 'The state is null.')
        },
        id,
        state,
        stateVersion,
        sources
      }
    }

    try {
      // Get or create type store
      let typeStore = this.store.get(type)

      if (!typeStore) {
        typeStore = new Map<string, TextState>()
        this.store.set(type, typeStore)
      }

      // Create TextState representation
      // Note: Using Object as type since we store type name separately
      const raw = new TextState(
        id,
        Object, // type constructor
        1, // typeVersion - always 1 for now
        JSON.stringify(state),
        stateVersion,
        metadata
      )

      // Check for concurrency violation
      const existingState = typeStore.get(id)
      if (existingState && existingState.dataVersion >= stateVersion) {
        return {
          outcome: {
            success: false,
            error: new StorageException(
              Result.ConcurrencyViolation,
              `Version conflict: existing version ${existingState.dataVersion} >= new version ${stateVersion}`
            )
          },
          id,
          state,
          stateVersion,
          sources
        }
      }

      // Store the state
      typeStore.set(id, raw)

      // Store sources if provided
      if (sources.length > 0) {
        const existingSources = this.sources.get(id) || []
        this.sources.set(id, [...existingSources, ...sources])
      }

      return {
        outcome: {
          success: true,
          result: Result.Success,
          value: state
        },
        id,
        state,
        stateVersion,
        sources
      }
    } catch (error) {
      return {
        outcome: {
          success: false,
          error: new StorageException(
            Result.Error,
            `Write failed: ${(error as Error).message}`,
            error as Error
          )
        },
        id,
        state,
        stateVersion,
        sources
      }
    }
  }

  /**
   * Get all sources/events for a document.
   * Useful for debugging and testing.
   */
  getSources<C = any>(id: string): Source<C>[] {
    return (this.sources.get(id) || []) as Source<C>[]
  }

  /**
   * Clear all stored documents and sources.
   * Useful for testing.
   */
  clear(): void {
    this.store.clear()
    this.sources.clear()
  }

  /**
   * Get the number of documents in a type store.
   * Useful for testing and monitoring.
   */
  count(type: string): number {
    const typeStore = this.store.get(type)
    return typeStore ? typeStore.size : 0
  }

  /**
   * Get all type names that have documents.
   * Useful for debugging and testing.
   */
  types(): string[] {
    return Array.from(this.store.keys())
  }

  /**
   * Remove a document from the store.
   * Useful for projections that need to delete documents.
   */
  async remove(id: string, type: string): Promise<void> {
    const typeStore = this.store.get(type)
    if (typeStore) {
      typeStore.delete(id)
    }
    this.sources.delete(id)
  }
}
