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
 * Entry representing a journal event or command.
 *
 * An Entry is the persisted representation of a Source (event or command).
 * The Source is serialized into the Entry's entryData field.
 *
 * @template T the type of entry data (typically string for JSON)
 */
export class Entry<T> {
  /** Unique identifier for this entry */
  private readonly _id: string

  /** Global position in the journal (across all streams) */
  private readonly _globalPosition: number

  /** Type name of the entry (e.g., "AccountOpened", "FundsDeposited") */
  private readonly _type: string

  /** Version of the type for schema evolution */
  private readonly _typeVersion: number

  /** The data payload (serialized Source) */
  private readonly _entryData: T

  /** Associated metadata (as JSON string) */
  private readonly _metadata: string

  /**
   * Construct an Entry.
   *
   * @param id unique identifier for this entry
   * @param globalPosition global position in the journal
   * @param type type name of the entry
   * @param typeVersion version of the type for schema evolution
   * @param entryData the data payload (serialized Source)
   * @param metadata associated metadata (as JSON string)
   */
  constructor(
    id: string,
    globalPosition: number,
    type: string,
    typeVersion: number,
    entryData: T,
    metadata: string
  ) {
    this._id = id
    this._globalPosition = globalPosition
    this._type = type
    this._typeVersion = typeVersion
    this._entryData = entryData
    this._metadata = metadata
  }

  /**
   * Answer the unique identifier for this entry.
   */
  get id(): string {
    return this._id
  }

  /**
   * Answer the global position in the journal (across all streams).
   */
  get globalPosition(): number {
    return this._globalPosition
  }

  /**
   * Answer the type name of the entry.
   */
  get type(): string {
    return this._type
  }

  /**
   * Answer the version of the type for schema evolution.
   */
  get typeVersion(): number {
    return this._typeVersion
  }

  /**
   * Answer the data payload (serialized Source).
   */
  get entryData(): T {
    return this._entryData
  }

  /**
   * Answer the associated metadata (as JSON string).
   */
  get metadata(): string {
    return this._metadata
  }

  /**
   * Answer my string representation.
   */
  toString(): string {
    return `Entry[id=${this._id} globalPosition=${this._globalPosition} type=${this._type} typeVersion=${this._typeVersion}]`
  }
}
