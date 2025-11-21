// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Metadata associated with Sources and States, providing additional context
 * and properties for stored data.
 *
 * Metadata is immutable and can contain:
 * - properties: Key-value pairs for arbitrary metadata
 * - value: A string value for simple metadata
 * - operation: The operation type or class name associated with this metadata
 */
export class Metadata {
  /** Empty object used as default */
  private static readonly EmptyObject = Object.freeze({})

  /** Key-value properties map */
  public readonly properties: ReadonlyMap<string, string>

  /** Operation type or name */
  public readonly operation: string

  /** Metadata value */
  public readonly value: string

  /**
   * Answer a null/empty Metadata instance.
   * @returns Metadata
   */
  static nullMetadata(): Metadata {
    return new Metadata(new Map(), '', '')
  }

  /**
   * Create Metadata with properties.
   * @param properties the Map of string key-value pairs
   * @returns Metadata
   */
  static withProperties(properties: Map<string, string>): Metadata {
    return new Metadata(properties, '', '')
  }

  /**
   * Create Metadata with an operation.
   * @param operation the string operation name
   * @returns Metadata
   */
  static withOperation(operation: string): Metadata {
    return new Metadata(new Map(), '', operation)
  }

  /**
   * Create Metadata with a value.
   * @param value the string value
   * @returns Metadata
   */
  static withValue(value: string): Metadata {
    return new Metadata(new Map(), value, '')
  }

  /**
   * Create Metadata with value and operation.
   * @param value the string value
   * @param operation the string operation name
   * @returns Metadata
   */
  static with(value: string, operation: string): Metadata
  /**
   * Create Metadata with properties, value, and operation.
   * @param properties the Map of string key-value pairs
   * @param value the string value
   * @param operation the string operation name
   * @returns Metadata
   */
  static with(properties: Map<string, string>, value: string, operation: string): Metadata
  /**
   * Create Metadata with properties, value, and operation type.
   * @param properties the Map of string key-value pairs
   * @param value the string value
   * @param operationType the class or constructor function
   * @param compact whether to use simple class name (true) or full name (false)
   * @returns Metadata
   */
  static with(
    properties: Map<string, string>,
    value: string,
    operationType: Function,
    compact?: boolean
  ): Metadata

  static with(...args: unknown[]): Metadata {
    if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
      return new Metadata(new Map(), args[0], args[1])
    }
    if (args.length === 3 && args[0] instanceof Map && typeof args[1] === 'string' && typeof args[2] === 'string') {
      return new Metadata(args[0], args[1], args[2])
    }
    if (
      args.length >= 3 &&
      args[0] instanceof Map &&
      typeof args[1] === 'string' &&
      typeof args[2] === 'function'
    ) {
      const compact = args.length === 4 ? (args[3] as boolean) : true
      const operation = compact ? (args[2] as Function).name : (args[2] as Function).toString()
      return new Metadata(args[0], args[1], operation)
    }
    throw new Error('Invalid arguments to Metadata.with()')
  }

  /**
   * Construct Metadata with properties, value, and operation.
   * @param properties the Map of string key-value pairs (or null/undefined for empty)
   * @param value the string value (or null/undefined for empty)
   * @param operation the string operation name (or null/undefined for empty)
   */
  constructor(properties: Map<string, string> | null | undefined, value: string | null | undefined, operation: string | null | undefined)

  /**
   * Construct Metadata with value and operation.
   * @param value the string value (or null/undefined for empty)
   * @param operation the string operation name (or null/undefined for empty)
   */
  constructor(value: string | null | undefined, operation: string | null | undefined)

  /**
   * Construct empty Metadata.
   */
  constructor()

  /**
   * Constructor implementation.
   */
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      this.properties = new Map()
      this.value = ''
      this.operation = ''
    } else if (args.length === 2 && typeof args[0] === 'string') {
      this.properties = new Map()
      this.value = args[0] || ''
      this.operation = (args[1] as string) || ''
    } else if (args.length === 3) {
      this.properties = new Map(args[0] as Map<string, string>) || new Map()
      this.value = (args[1] as string) || ''
      this.operation = (args[2] as string) || ''
    } else {
      this.properties = new Map()
      this.value = ''
      this.operation = ''
    }
  }

  /**
   * Answer whether I have properties.
   * @returns boolean
   */
  hasProperties(): boolean {
    return this.properties.size > 0
  }

  /**
   * Answer whether I have an operation.
   * @returns boolean
   */
  hasOperation(): boolean {
    return this.operation.length > 0
  }

  /**
   * Answer whether I have a value.
   * @returns boolean
   */
  hasValue(): boolean {
    return this.value.length > 0
  }

  /**
   * Answer whether I am empty (no operation and no value).
   * @returns boolean
   */
  isEmpty(): boolean {
    return !this.hasOperation() && !this.hasValue()
  }

  /**
   * Compare this Metadata with another.
   * @param other the other Metadata to compare
   * @returns number (0 for equal, -1 or 1 for different)
   */
  compareTo(other: Metadata): number {
    if (!this.mapsEqual(this.properties, other.properties)) return 1

    if (this.value !== other.value) {
      return this.value < other.value ? -1 : 1
    }

    if (this.operation !== other.operation) {
      return this.operation < other.operation ? -1 : 1
    }

    return 0
  }

  /**
   * Answer my hash code.
   * @returns number
   */
  hashCode(): number {
    let hash = 31 * this.stringHash(this.value) + this.stringHash(this.operation)
    this.properties.forEach((value, key) => {
      hash = hash * 31 + this.stringHash(key) + this.stringHash(value)
    })
    return hash
  }

  /**
   * Answer whether I am equal to another Metadata.
   * @param other the other object to compare
   * @returns boolean
   */
  equals(other: unknown): boolean {
    if (other == null || !(other instanceof Metadata)) {
      return false
    }

    return (
      this.value === other.value &&
      this.operation === other.operation &&
      this.mapsEqual(this.properties, other.properties)
    )
  }

  /**
   * Answer my string representation.
   * @returns string
   */
  toString(): string {
    const props = Array.from(this.properties.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(', ')
    return `Metadata[value=${this.value} operation=${this.operation} properties={${props}}]`
  }

  /**
   * Helper to compute string hash.
   */
  private stringHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash
  }

  /**
   * Helper to compare two Maps for equality.
   */
  private mapsEqual<K, V>(map1: ReadonlyMap<K, V>, map2: ReadonlyMap<K, V>): boolean {
    if (map1.size !== map2.size) return false
    for (const [key, value] of map1) {
      if (!map2.has(key) || map2.get(key) !== value) {
        return false
      }
    }
    return true
  }
}
