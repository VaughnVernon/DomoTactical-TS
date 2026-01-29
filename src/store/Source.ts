// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Abstract base of any concrete type that is a source of truth. The concrete
 * type is represented by the `T` parameter and also extends Source.
 *
 * Source instances are immutable records of events or commands that have occurred,
 * carrying a timestamp and version information.
 *
 * @template T the type of source of truth
 */
export abstract class Source<T> {
  /** The timestamp (milliseconds since epoch) when this source was created */
  public readonly dateTimeSourced: number

  /** The semantic version of this source type */
  public readonly sourceTypeVersion: number

  /**
   * Answer a NullSource instance.
   *
   * Use `Source.nulled<void>()` when you need a general-purpose null source
   * without a specific type context. Use `Source.nulled<T>()` when you need
   * the null source to fit into a typed context (e.g., typed arrays or variables).
   *
   * @template T the type used in Source<T>
   * @returns Source<T>
   * @example
   * ```typescript
   * // General-purpose null source (no fake type needed)
   * const nullSource = Source.nulled<void>()
   *
   * // Null source for specific type context
   * const userNull: Source<UserCreated> = Source.nulled<UserCreated>()
   *
   * // In typed arrays
   * const sources: Source<OrderPlaced>[] = [
   *   new OrderPlaced(...),
   *   Source.nulled<OrderPlaced>()
   * ]
   * ```
   */
  static nulled<T>(): Source<T> {
    return new NullSource() as Source<T>
  }

  /**
   * Answer a list of Source instances from the array of sources.
   * @param sources the varargs of Source<T>
   * @template T the concrete type of Source
   * @returns Source<T>[]
   */
  static all<T>(...sources: Source<T>[]): Source<T>[] {
    return sources
  }

  /**
   * Answer a list of Source instances from the pre-existing list of sources,
   * filtering out any null sources.
   * @param sources the Source<T>[] of elements to answer as a new Source<T>[]
   * @template T the concrete type of Source
   * @returns Source<T>[]
   */
  static allFrom<T>(sources: Source<T>[]): Source<T>[] {
    return sources.filter((source) => !source.isNull())
  }

  /**
   * Answer an empty Source array.
   * @template T the type used in Source<T>
   * @returns Source<T>[]
   */
  static none<T>(): Source<T>[] {
    return []
  }

  /**
   * Convert a timestamp (milliseconds since epoch) or ISO string to a Date.
   * Useful as a transform function in EntryRegistry.register().
   *
   * @param value the timestamp as number (millis) or string (ISO format)
   * @returns Date the converted Date instance
   *
   * @example
   * ```typescript
   * // Use as a transform in EntryRegistry
   * EntryRegistry.register(FundsDeposited, { depositedAt: Source.asDate })
   *
   * // Direct usage
   * const date = Source.asDate(1706123456789)
   * const date2 = Source.asDate('2025-01-15T10:30:00.000Z')
   * ```
   */
  static asDate(value: number | string): Date {
    return new Date(value)
  }

  /**
   * Answer my id as a string. By default my id is empty. Override to provide an actual id.
   * @returns string
   */
  id(): string {
    return ''
  }

  /**
   * Answer the dateTimeSourced as a Date instance.
   *
   * @returns Date the timestamp when this source was created
   *
   * @example
   * ```typescript
   * const event = new AccountOpened('123', 'Alice', 1000)
   * const createdAt = event.dateSourced()  // Date instance
   * ```
   */
  dateSourced(): Date {
    return new Date(this.dateTimeSourced)
  }

  /**
   * Answer a property value as a Date.
   * Useful for accessing timestamp properties stored as numbers or strings.
   *
   * @param propertyName the name of the property containing a timestamp
   * @returns Date the property value converted to a Date
   * @throws Error if the property doesn't exist or is null/undefined
   *
   * @example
   * ```typescript
   * class FundsDeposited extends DomainEvent {
   *   constructor(public accountId: string, public depositedAt: number) { super() }
   * }
   *
   * const event = new FundsDeposited('123', Date.now())
   * const when = event.dateOf('depositedAt')  // Date instance
   * ```
   */
  dateOf(propertyName: string): Date {
    const value = (this as Record<string, unknown>)[propertyName]
    if (value === undefined || value === null) {
      throw new Error(`Property '${propertyName}' is undefined or null`)
    }
    return new Date(value as number | string)
  }

  /**
   * Answer whether or not I am a Null Object, which is by default false.
   * @returns boolean
   */
  isNull(): boolean {
    return false
  }

  /**
   * Answer my type name, which is the simple name of my concrete class.
   * @returns string
   */
  typeName(): string {
    return this.constructor.name
  }

  /**
   * Answer my hash code based on my id.
   * @returns number
   */
  hashCode(): number {
    const id = this.id()
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }

  /**
   * Answer whether I am equal to another Source based on id comparison.
   * @param other the other Source to compare
   * @returns boolean
   */
  equals(other: unknown): boolean {
    if (other == null || !(other instanceof Source)) {
      return false
    }
    if (other.constructor !== this.constructor) {
      return false
    }
    return this.id() === other.id()
  }

  /**
   * Answer my string representation.
   * @returns string
   */
  toString(): string {
    const id = this.id()
    const date = new Date(this.dateTimeSourced)
    return `Source [id=${id || '(none)'} dateTimeSourced=${date.toISOString()} sourceTypeVersion=${this.sourceTypeVersion}]`
  }

  /**
   * Construct my default state with a type version of 1.0.0 (represented as integer 1).
   */
  protected constructor()

  /**
   * Construct my default state with a sourceTypeVersion.
   * @param sourceTypeVersion the int type version of my concrete extender
   */
  protected constructor(sourceTypeVersion: number)

  /**
   * Constructor implementation.
   */
  protected constructor(sourceTypeVersion: number = 1) {
    if (sourceTypeVersion <= 0) {
      throw new Error('Source type version must be greater than 0')
    }
    this.dateTimeSourced = Date.now()
    this.sourceTypeVersion = sourceTypeVersion
  }
}

/**
 * Null Object pattern for Source<T> instances.
 */
class NullSource extends Source<void> {
  /**
   * Answer true that I am a NullSource.
   */
  override isNull(): boolean {
    return true
  }
}
