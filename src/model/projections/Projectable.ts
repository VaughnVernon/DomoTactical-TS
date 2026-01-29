// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Entry } from '../../store/journal/Entry.js'
import { State } from '../../store/State.js'

/**
 * Wrapper around state and/or entries that can be projected to a query model view.
 *
 * A Projectable represents a unit of work for a projection - it contains the raw data
 * (entries and/or state) plus metadata about why this should be projected (becauseOf).
 *
 * Multiple data accessors support different projection strategies:
 * - entries() - For event-based projections that process raw Entry instances
 * - dataAsText() - For text/JSON-based projections
 * - dataAsBytes() - For binary/Protobuf-based projections
 * - object<T>() - For typed domain object projections
 *
 * The projection system uses becauseOf() to match Projectables to appropriate Projections.
 *
 * @example
 * ```typescript
 * // Create a projectable from an event
 * const projectable = new TextProjectable(
 *   null,
 *   [accountOpenedEntry],
 *   'AccountOpened'
 * )
 *
 * // Access different representations
 * const entries = projectable.entries()
 * const json = projectable.dataAsText()
 * const event = projectable.object<AccountOpened>()
 * ```
 */
export interface Projectable {
  /**
   * Answer the reasons why this should be projected (event types, patterns, etc.).
   * Used by the projection matching system to route to appropriate projections.
   *
   * @returns string[] the reasons (typically event type names)
   *
   * @example
   * ```typescript
   * projectable.becauseOf() // ['AccountOpened', 'User.Registered']
   * ```
   */
  becauseOf(): string[]

  /**
   * Answer the state data as text/JSON string.
   * For text-based projections using JSON serialization.
   *
   * @returns string the data as text
   */
  dataAsText(): string

  /**
   * Answer the state data as bytes.
   * For binary projections using Protobuf, FlatBuffers, etc.
   *
   * @returns Uint8Array the data as bytes
   */
  dataAsBytes(): Uint8Array

  /**
   * Answer the version of the data.
   * Used for optimistic locking and tracking projection state versions.
   *
   * @returns number the data version
   */
  dataVersion(): number

  /**
   * Answer the unique identifier of the data.
   * Typically the stream name or entity ID.
   *
   * @returns string the unique identifier
   */
  dataId(): string

  /**
   * Answer the associated Entry instances (events/commands).
   * For projections that process raw entries.
   *
   * @returns Entry<unknown>[] the entries
   */
  entries(): Entry<unknown>[]

  /**
   * Answer whether this projectable has entries.
   *
   * @returns boolean true if entries exist
   */
  hasEntries(): boolean

  /**
   * Answer the metadata as text/JSON string.
   * Contains operation metadata, timestamps, correlation IDs, etc.
   *
   * @returns string the metadata as text
   */
  metadata(): string

  /**
   * Answer the state as a typed object.
   * For typed projections working with domain objects.
   *
   * @template T the object type
   * @returns T the state object
   */
  object<T>(): T

  /**
   * Answer whether this projectable has a state object.
   *
   * @returns boolean true if state object exists
   */
  hasObject(): boolean

  /**
   * Answer the type name of the projectable.
   * Typically the class name of the state or primary entry type.
   *
   * @returns string the type name
   */
  type(): string

  /**
   * Answer the type version for schema evolution tracking.
   *
   * @returns number the type version
   */
  typeVersion(): number
}

/**
 * Abstract base implementation of Projectable with common functionality.
 *
 * Concrete implementations provide specific data access strategies
 * (TextProjectable for JSON, BinaryProjectable for Protobuf, etc.).
 */
export abstract class AbstractProjectable implements Projectable {
  /**
   * Construct an AbstractProjectable.
   *
   * @param state_ the state instance (may be null)
   * @param entries_ the associated entries
   * @param projectionId_ the unique projection identifier
   */
  constructor(
    protected readonly state_: State<any> | null,
    protected readonly entries_: Entry<unknown>[],
    protected readonly projectionId_: string
  ) {}

  /**
   * Answer the reasons for projection.
   * Default: uses the projection ID as the single reason.
   * Override to provide multiple reasons or custom logic.
   */
  becauseOf(): string[] {
    return [this.projectionId_]
  }

  abstract dataAsText(): string
  abstract dataAsBytes(): Uint8Array

  /**
   * Answer the data version.
   * Uses state version if available, otherwise 0.
   */
  dataVersion(): number {
    return this.state_?.dataVersion ?? 0
  }

  /**
   * Answer the data ID.
   * Uses state ID if available, otherwise empty string.
   */
  dataId(): string {
    return this.state_?.id ?? ''
  }

  /**
   * Answer the entries.
   */
  entries(): Entry<unknown>[] {
    return this.entries_
  }

  /**
   * Answer whether entries exist.
   */
  hasEntries(): boolean {
    return this.entries_.length > 0
  }

  /**
   * Answer the metadata.
   * Uses state metadata if available, otherwise empty string.
   */
  metadata(): string {
    if (!this.state_ || !this.state_.metadata) {
      return ''
    }
    // Convert Metadata to string if needed
    if (typeof this.state_.metadata === 'string') {
      return this.state_.metadata
    }
    return JSON.stringify(this.state_.metadata)
  }

  /**
   * Answer the state object.
   * Subclasses must implement proper deserialization.
   */
  abstract object<T>(): T

  /**
   * Answer whether state object exists.
   */
  hasObject(): boolean {
    return this.state_ !== null
  }

  /**
   * Answer the type name.
   * Uses state type name if available, otherwise the projection ID.
   */
  type(): string {
    return this.state_?.type ?? this.projectionId_
  }

  /**
   * Answer the type version.
   * Uses state type version if available, otherwise 1.
   */
  typeVersion(): number {
    return this.state_?.typeVersion ?? 1
  }
}

/**
 * Text/JSON-based Projectable implementation.
 *
 * Designed for projections working with JSON-serialized events and state.
 * Provides text and object access to the underlying data.
 *
 * @example
 * ```typescript
 * // From a state
 * const projectable = new TextProjectable(
 *   textState,
 *   [],
 *   'AccountSummary'
 * )
 *
 * // From entries only
 * const projectable = new TextProjectable(
 *   null,
 *   [accountOpenedEntry, fundsDepositedEntry],
 *   'Account.*'
 * )
 *
 * // Access data
 * const json = projectable.dataAsText()
 * const account = projectable.object<AccountState>()
 * ```
 */
export class TextProjectable extends AbstractProjectable {
  /**
   * Construct a TextProjectable.
   *
   * @param state the state instance (may be null)
   * @param entries the associated entries
   * @param projectionId the projection identifier/reason
   */
  constructor(
    state: State<string> | null,
    entries: Entry<unknown>[],
    projectionId: string
  ) {
    super(state, entries, projectionId)
  }

  /**
   * Answer the data as text.
   * If state exists, returns state data; otherwise returns empty string.
   */
  dataAsText(): string {
    if (this.state_ && typeof this.state_.data === 'string') {
      return this.state_.data
    }
    return ''
  }

  /**
   * Answer the data as bytes.
   * Encodes the text data as UTF-8 bytes.
   */
  dataAsBytes(): Uint8Array {
    const text = this.dataAsText()
    return new TextEncoder().encode(text)
  }

  /**
   * Answer the state as a typed object.
   * Parses JSON if state data is a string, otherwise returns state data as-is.
   *
   * @template T the object type
   * @returns T the parsed object
   */
  object<T>(): T {
    if (!this.state_) {
      return {} as T
    }

    if (typeof this.state_.data === 'string') {
      try {
        return JSON.parse(this.state_.data) as T
      } catch {
        return this.state_.data as T
      }
    }

    return this.state_.data as T
  }
}
