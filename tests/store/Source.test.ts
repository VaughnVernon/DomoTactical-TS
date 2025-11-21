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
})
