// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Entry } from './Entry.js'

/**
 * Concrete implementation of Entry for text/JSON-based entries.
 * This is the primary Entry type used for JSON serialization.
 */
export class TextEntry extends Entry<string> {
  /** The stream version this entry belongs to */
  private readonly _streamVersion: number

  /**
   * Construct a TextEntry with all fields explicitly specified.
   * Used by the Journal when creating the final entry with globalPosition.
   * @param id the unique identifier (aggregate root identity)
   * @param globalPosition the global position in the journal
   * @param type the type name
   * @param typeVersion the type version (schema version for evolution)
   * @param entryData the JSON data
   * @param streamVersion the stream version (1-based index in entity's stream)
   * @param metadata the metadata as JSON string
   */
  constructor(
    id: string,
    globalPosition: number,
    type: string,
    typeVersion: number,
    entryData: string,
    streamVersion: number,
    metadata: string
  )

  /**
   * Construct a TextEntry without globalPosition.
   * Used by adapters - the Journal assigns globalPosition when appending.
   * @param id the unique identifier (aggregate root identity)
   * @param type the type name
   * @param typeVersion the type version (schema version for evolution)
   * @param entryData the JSON data
   * @param streamVersion the stream version (1-based index in entity's stream)
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
   * Implementation of overloaded constructor.
   */
  constructor(
    id: string,
    globalPositionOrType: number | string,
    typeOrTypeVersion: string | number,
    typeVersionOrEntryData: number | string,
    entryDataOrStreamVersion: string | number,
    streamVersionOrMetadata: number | string,
    metadataOrUndefined?: string
  ) {
    if (typeof globalPositionOrType === 'string') {
      // 6-arg form: (id, type, typeVersion, entryData, streamVersion, metadata)
      // Used by adapters - globalPosition will be assigned by Journal
      super(
        id,
        0, // Placeholder - Journal assigns globalPosition
        globalPositionOrType as string,
        typeOrTypeVersion as number,
        typeVersionOrEntryData as string,
        streamVersionOrMetadata as string
      )
      this._streamVersion = entryDataOrStreamVersion as number
    } else {
      // 7-arg form: (id, globalPosition, type, typeVersion, entryData, streamVersion, metadata)
      // Used by Journal when creating final entry
      super(
        id,
        globalPositionOrType as number,
        typeOrTypeVersion as string,
        typeVersionOrEntryData as number,
        entryDataOrStreamVersion as string,
        metadataOrUndefined!
      )
      this._streamVersion = streamVersionOrMetadata as number
    }
  }

  /**
   * Answer the stream version this entry belongs to.
   */
  get streamVersion(): number {
    return this._streamVersion
  }

  /**
   * Answer my string representation.
   */
  override toString(): string {
    return `TextEntry[id=${this.id} globalPosition=${this.globalPosition} type=${this.type} typeVersion=${this.typeVersion} streamVersion=${this._streamVersion}]`
  }
}
