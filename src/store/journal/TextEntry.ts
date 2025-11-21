// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Entry } from './Entry'

/**
 * Concrete implementation of Entry for text/JSON-based entries.
 * This is the primary Entry type used for JSON serialization.
 */
export class TextEntry implements Entry<string> {
  /** Unique identifier for this entry */
  public readonly id: string

  /** Type name of the entry (e.g., "AccountOpened") */
  public readonly type: string

  /** Version of the type for schema evolution */
  public readonly typeVersion: number

  /** The data payload as JSON string */
  public readonly entryData: string

  /** Associated metadata as JSON string */
  public readonly metadata: string

  /** The stream version this entry belongs to */
  public readonly streamVersion: number

  /**
   * Construct a TextEntry with explicit id.
   * @param id the unique identifier
   * @param type the type name
   * @param typeVersion the type version
   * @param entryData the JSON data
   * @param streamVersion the stream version
   * @param metadata the metadata as JSON string
   */
  constructor(
    id: string,
    type: string,
    typeVersion: number,
    entryData: string,
    streamVersion: number,
    metadata: string
  )

  /**
   * Construct a TextEntry with auto-generated id.
   * @param type the type name
   * @param typeVersion the type version
   * @param entryData the JSON data
   * @param metadata the metadata as JSON string
   */
  constructor(type: string, typeVersion: number, entryData: string, metadata: string)

  /**
   * Implementation of overloaded constructor.
   */
  constructor(
    idOrType: string,
    typeOrTypeVersion: string | number,
    typeVersionOrEntryData: number | string,
    entryDataOrMetadata: string,
    streamVersionOrUndefined?: number,
    metadataOrUndefined?: string
  ) {
    if (typeof typeOrTypeVersion === 'number') {
      // Short form: (type, typeVersion, entryData, metadata)
      this.id = '' // Will be assigned by Journal
      this.type = idOrType
      this.typeVersion = typeOrTypeVersion
      this.entryData = typeVersionOrEntryData as string
      this.metadata = entryDataOrMetadata
      this.streamVersion = 0 // Will be assigned by Journal
    } else {
      // Long form: (id, type, typeVersion, entryData, streamVersion, metadata)
      this.id = idOrType
      this.type = typeOrTypeVersion
      this.typeVersion = typeVersionOrEntryData as number
      this.entryData = entryDataOrMetadata
      this.streamVersion = streamVersionOrUndefined || 0
      this.metadata = metadataOrUndefined || ''
    }
  }

  /**
   * Answer my string representation.
   */
  toString(): string {
    return `TextEntry[id=${this.id} type=${this.type} typeVersion=${this.typeVersion} streamVersion=${this.streamVersion}]`
  }
}
