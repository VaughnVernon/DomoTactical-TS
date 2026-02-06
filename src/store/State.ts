// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Metadata } from './Metadata.js'

/**
 * Abstract base class for state persistence.
 * State can be stored as Binary (Uint8Array), Text (string), or Object (any).
 *
 * The `type` field contains the type name as provided by the adapter. The adapter
 * is responsible for type name mapping (e.g., using StoreTypeMapper to convert
 * between PascalCase and kebab-case). This mirrors how Entry works.
 *
 * @template T the type of data being stored
 */
export abstract class State<T> {
  /** Indicator for no operation */
  static readonly NoOp = ''

  private static readonly EmptyBytesData = new Uint8Array(0)
  private static readonly EmptyObjectData = Object.freeze({})
  private static readonly EmptyTextData = ''

  /** The unique identifier for this state */
  public readonly id: string

  /** The data payload */
  public readonly data: T

  /** The version of the data */
  public readonly dataVersion: number

  /** Associated metadata */
  public readonly metadata: Metadata

  /** The type name of the state (as provided by the adapter) */
  public readonly type: string

  /** The version of the type */
  public readonly typeVersion: number

  /**
   * Construct a State instance.
   * @param id the unique identifier (must not be null)
   * @param type the type name (as string, e.g., 'AccountState' or 'account-state')
   * @param typeVersion the version of the type (must be greater than 0)
   * @param data the data payload (must not be null)
   * @param dataVersion the version of the data (must be greater than 0)
   * @param metadata optional metadata (defaults to null metadata)
   */
  protected constructor(
    id: string,
    type: string,
    typeVersion: number,
    data: T,
    dataVersion: number,
    metadata?: Metadata
  ) {
    if (id !== State.NoOp && !id) throw new Error('State id must not be null or empty')
    this.id = id

    if (!type) throw new Error('State type must not be null or empty')
    this.type = type

    if (typeVersion <= 0) throw new Error('State typeVersion must be greater than 0')
    this.typeVersion = typeVersion

    if (data == null) throw new Error('State data must not be null')
    this.data = data

    if (dataVersion <= 0) throw new Error('State dataVersion must be greater than 0')
    this.dataVersion = dataVersion

    this.metadata = metadata || Metadata.nullMetadata()
  }

  /**
   * Cast this state as a BinaryState.
   * @returns BinaryState
   */
  asBinaryState(): BinaryState {
    return this as unknown as BinaryState
  }

  /**
   * Cast this state as an ObjectState.
   * @returns ObjectState<T>
   */
  asObjectState<S>(): ObjectState<S> {
    return this as unknown as ObjectState<S>
  }

  /**
   * Cast this state as a TextState.
   * @returns TextState
   */
  asTextState(): TextState {
    return this as unknown as TextState
  }

  /**
   * Answer whether this state has metadata.
   * @returns boolean
   */
  hasMetadata(): boolean {
    return !this.metadata.isEmpty()
  }

  /**
   * Answer whether this is binary state.
   * @returns boolean
   */
  isBinary(): boolean {
    return false
  }

  /**
   * Answer whether this state is empty.
   * @returns boolean
   */
  isEmpty(): boolean {
    return false
  }

  /**
   * Answer whether this is a null state.
   * @returns boolean
   */
  isNull(): boolean {
    return false
  }

  /**
   * Answer whether this is object state.
   * @returns boolean
   */
  isObject(): boolean {
    return false
  }

  /**
   * Answer whether this is text state.
   * @returns boolean
   */
  isText(): boolean {
    return false
  }

  /**
   * Compare this state with another.
   * @param other the other State to compare
   * @returns number (negative, 0, or positive for less than, equal, or greater than)
   */
  compareTo(other: State<T>): number {
    const dataDiff = this.compareData(this, other)
    if (dataDiff !== 0) return dataDiff

    if (this.id !== other.id) return this.id < other.id ? -1 : 1
    if (this.type !== other.type) return this.type < other.type ? -1 : 1
    if (this.typeVersion !== other.typeVersion) return this.typeVersion - other.typeVersion
    if (this.dataVersion !== other.dataVersion) return this.dataVersion - other.dataVersion

    return this.metadata.compareTo(other.metadata)
  }

  /**
   * Answer my hash code based on id.
   * @returns number
   */
  hashCode(): number {
    let hash = 0
    for (let i = 0; i < this.id.length; i++) {
      const char = this.id.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return 31 * hash
  }

  /**
   * Answer whether I am equal to another state based on id.
   * @param other the other object to compare
   * @returns boolean
   */
  equals(other: unknown): boolean {
    if (other == null || !(other instanceof State)) {
      return false
    }
    if (other.constructor !== this.constructor) {
      return false
    }
    return this.id === other.id
  }

  /**
   * Answer my string representation.
   * @returns string
   */
  toString(): string {
    const dataStr =
      this.isText() || this.isObject() ? String(this.data) : '(binary)'
    return `${this.constructor.name}[id=${this.id} type=${this.type} typeVersion=${this.typeVersion} data=${dataStr} dataVersion=${this.dataVersion} metadata=${this.metadata}]`
  }

  /**
   * Compare data between two states.
   */
  private compareData(state1: State<T>, state2: State<T>): number {
    if (state1.isText() && state2.isText()) {
      const str1 = state1.data as unknown as string
      const str2 = state2.data as unknown as string
      return str1 < str2 ? -1 : str1 > str2 ? 1 : 0
    } else if (state1.isBinary() && state2.isBinary()) {
      const data1 = state1.data as unknown as Uint8Array
      const data2 = state2.data as unknown as Uint8Array
      if (data1.length !== data2.length) return 1
      for (let i = 0; i < data1.length; i++) {
        if (data1[i] !== data2[i]) return 1
      }
      return 0
    }
    return 1
  }
}

/**
 * Binary state stored as Uint8Array.
 */
export class BinaryState extends State<Uint8Array> {
  /** Null instance for BinaryState */
  static readonly Null = new BinaryState()

  constructor(
    id: string,
    type: string,
    typeVersion: number,
    data: Uint8Array,
    dataVersion: number,
    metadata?: Metadata
  )
  constructor()
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      super(State.NoOp, 'Object', 1, new Uint8Array(0), 1, Metadata.nullMetadata())
    } else {
      const [id, type, typeVersion, data, dataVersion, metadata] = args as [
        string,
        string,
        number,
        Uint8Array,
        number,
        Metadata | undefined
      ]
      super(id, type, typeVersion, data, dataVersion, metadata)
    }
  }

  override isBinary(): boolean {
    return true
  }

  override isEmpty(): boolean {
    return this.data.length === 0
  }

  override isNull(): boolean {
    return this === BinaryState.Null
  }
}

/**
 * Object state stored as any TypeScript object.
 * @template T the type of the object
 */
export class ObjectState<T> extends State<T> {
  /** Null instance for ObjectState */
  static readonly Null = new ObjectState<object>()

  constructor(
    id: string,
    type: string,
    typeVersion: number,
    data: T,
    dataVersion: number,
    metadata?: Metadata
  )
  constructor()
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      super(State.NoOp, 'Object', 1, Object.freeze({}) as T, 1, Metadata.nullMetadata())
    } else {
      const [id, type, typeVersion, data, dataVersion, metadata] = args as [
        string,
        string,
        number,
        T,
        number,
        Metadata | undefined
      ]
      super(id, type, typeVersion, data, dataVersion, metadata)
    }
  }

  override isEmpty(): boolean {
    return this.data === Object.freeze({})
  }

  override isNull(): boolean {
    return this === ObjectState.Null
  }

  override isObject(): boolean {
    return true
  }
}

/**
 * Text state stored as a string.
 */
export class TextState extends State<string> {
  /** Null instance for TextState */
  static readonly Null = new TextState()

  constructor(
    id: string,
    type: string,
    typeVersion: number,
    data: string,
    dataVersion: number,
    metadata?: Metadata
  )
  constructor()
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      super(State.NoOp, 'Object', 1, '', 1, Metadata.nullMetadata())
    } else {
      const [id, type, typeVersion, data, dataVersion, metadata] = args as [
        string,
        string,
        number,
        string,
        number,
        Metadata | undefined
      ]
      super(id, type, typeVersion, data, dataVersion, metadata)
    }
  }

  override isEmpty(): boolean {
    return this.data.length === 0
  }

  override isNull(): boolean {
    return this === TextState.Null
  }

  override isText(): boolean {
    return true
  }
}
