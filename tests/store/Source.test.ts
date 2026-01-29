// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect } from 'vitest'
import { Source } from '../../src/store/Source'

class TestSource extends Source<TestSource> {
  constructor(public readonly value: string, version: number = 1) {
    super(version)
  }

  override id(): string {
    return this.value
  }
}

class SourceWithTimestamp extends Source<SourceWithTimestamp> {
  constructor(
    public readonly eventId: string,
    public readonly occurredAt: number
  ) {
    super()
  }

  override id(): string {
    return this.eventId
  }
}

describe('Source', () => {
  it('should create a source with default version', () => {
    const source = new TestSource('test-1')
    expect(source.sourceTypeVersion).toBe(1)
    expect(source.id()).toBe('test-1')
    expect(source.typeName()).toBe('TestSource')
  })

  it('should create a source with custom version', () => {
    const source = new TestSource('test-2', 2)
    expect(source.sourceTypeVersion).toBe(2)
  })

  it('should have a timestamp', () => {
    const before = Date.now()
    const source = new TestSource('test-3')
    const after = Date.now()

    expect(source.dateTimeSourced).toBeGreaterThanOrEqual(before)
    expect(source.dateTimeSourced).toBeLessThanOrEqual(after)
  })

  it('should implement equals correctly', () => {
    const source1 = new TestSource('test-id')
    const source2 = new TestSource('test-id')
    const source3 = new TestSource('different-id')

    expect(source1.equals(source2)).toBe(true)
    expect(source1.equals(source3)).toBe(false)
  })

  it('should create null source', () => {
    const nullSource = Source.nulled<TestSource>()
    expect(nullSource.isNull()).toBe(true)
  })

  it('should filter null sources from list', () => {
    const source1 = new TestSource('test-1')
    const source2 = Source.nulled<TestSource>()
    const source3 = new TestSource('test-3')

    const filtered = Source.allFrom([source1, source2, source3])
    expect(filtered.length).toBe(2)
    expect(filtered).toContain(source1)
    expect(filtered).toContain(source3)
  })

  describe('date utilities', () => {
    describe('dateSourced()', () => {
      it('should return dateTimeSourced as a Date', () => {
        const source = new TestSource('test-date')
        const date = source.dateSourced()

        expect(date).toBeInstanceOf(Date)
        expect(date.getTime()).toBe(source.dateTimeSourced)
      })
    })

    describe('Source.asDate()', () => {
      it('should convert number timestamp to Date', () => {
        const timestamp = 1706123456789
        const date = Source.asDate(timestamp)

        expect(date).toBeInstanceOf(Date)
        expect(date.getTime()).toBe(timestamp)
      })

      it('should convert ISO string to Date', () => {
        const isoString = '2025-01-15T10:30:00.000Z'
        const date = Source.asDate(isoString)

        expect(date).toBeInstanceOf(Date)
        expect(date.toISOString()).toBe(isoString)
      })

      it('should work as a transform function', () => {
        const data = { timestamp: '2025-01-20T15:00:00.000Z' }
        const transformed = Source.asDate(data.timestamp)

        expect(transformed).toBeInstanceOf(Date)
        expect(transformed.toISOString()).toBe(data.timestamp)
      })
    })

    describe('dateOf()', () => {
      it('should convert numeric property to Date', () => {
        const timestamp = Date.now()
        const source = new SourceWithTimestamp('event-1', timestamp)
        const date = source.dateOf('occurredAt')

        expect(date).toBeInstanceOf(Date)
        expect(date.getTime()).toBe(timestamp)
      })

      it('should throw for undefined property', () => {
        const source = new TestSource('test')

        expect(() => source.dateOf('nonexistent')).toThrow("Property 'nonexistent' is undefined or null")
      })

      it('should throw for null property', () => {
        const source = new TestSource('test') as any
        source.nullProp = null

        expect(() => source.dateOf('nullProp')).toThrow("Property 'nullProp' is undefined or null")
      })
    })
  })
})
