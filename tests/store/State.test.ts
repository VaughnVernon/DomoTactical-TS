// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect } from 'vitest'
import { State, BinaryState, ObjectState, TextState } from '../../src/store/State'
import { Metadata } from '../../src/store/Metadata'

describe('State', () => {
  describe('BinaryState', () => {
    it('should create with full constructor', () => {
      const data = new Uint8Array([1, 2, 3, 4])
      const state = new BinaryState('id-1', Object, 1, data, 1)

      expect(state.id).toBe('id-1')
      expect(state.type).toBe('Object')
      expect(state.typeVersion).toBe(1)
      expect(state.data).toEqual(data)
      expect(state.dataVersion).toBe(1)
      expect(state.isBinary()).toBe(true)
      expect(state.isText()).toBe(false)
      expect(state.isObject()).toBe(false)
    })

    it('should create with metadata', () => {
      const data = new Uint8Array([1, 2, 3])
      const metadata = Metadata.withValue('test')
      const state = new BinaryState('id-1', Object, 1, data, 1, metadata)

      expect(state.hasMetadata()).toBe(true)
      expect(state.metadata.value).toBe('test')
    })

    it('should create null state with empty constructor', () => {
      const state = new BinaryState()

      expect(state.id).toBe('')
      expect(state.data.length).toBe(0)
      expect(state.isEmpty()).toBe(true)
    })

    it('should identify as binary', () => {
      const state = new BinaryState('id', Object, 1, new Uint8Array([1]), 1)

      expect(state.isBinary()).toBe(true)
      expect(state.isText()).toBe(false)
      expect(state.isObject()).toBe(false)
    })

    it('should detect empty state', () => {
      const empty = new BinaryState('id', Object, 1, new Uint8Array(0), 1)
      const notEmpty = new BinaryState('id', Object, 1, new Uint8Array([1]), 1)

      expect(empty.isEmpty()).toBe(true)
      expect(notEmpty.isEmpty()).toBe(false)
    })

    it('should detect null state', () => {
      const nullState = BinaryState.Null
      const normalState = new BinaryState('id', Object, 1, new Uint8Array([1]), 1)

      expect(nullState.isNull()).toBe(true)
      expect(normalState.isNull()).toBe(false)
    })

    it('should cast to BinaryState', () => {
      const state = new BinaryState('id', Object, 1, new Uint8Array([1]), 1)
      const casted = state.asBinaryState()

      expect(casted).toBe(state)
    })
  })

  describe('ObjectState', () => {
    it('should create with full constructor', () => {
      const data = { name: 'test', value: 42 }
      const state = new ObjectState('id-1', Object, 1, data, 1)

      expect(state.id).toBe('id-1')
      expect(state.type).toBe('Object')
      expect(state.typeVersion).toBe(1)
      expect(state.data).toEqual(data)
      expect(state.dataVersion).toBe(1)
      expect(state.isObject()).toBe(true)
      expect(state.isText()).toBe(false)
      expect(state.isBinary()).toBe(false)
    })

    it('should create with metadata', () => {
      const data = { key: 'val' }
      const metadata = Metadata.withOperation('CREATE')
      const state = new ObjectState('id-1', Object, 1, data, 1, metadata)

      expect(state.hasMetadata()).toBe(true)
      expect(state.metadata.operation).toBe('CREATE')
    })

    it('should create null state with empty constructor', () => {
      const state = new ObjectState()

      expect(state.id).toBe('')
      expect(state.isObject()).toBe(true)
    })

    it('should identify as object', () => {
      const state = new ObjectState('id', Object, 1, {}, 1)

      expect(state.isObject()).toBe(true)
      expect(state.isText()).toBe(false)
      expect(state.isBinary()).toBe(false)
    })

    it('should detect null state', () => {
      const nullState = ObjectState.Null
      const normalState = new ObjectState('id', Object, 1, { x: 1 }, 1)

      expect(nullState.isNull()).toBe(true)
      expect(normalState.isNull()).toBe(false)
    })

    it('should cast to ObjectState', () => {
      const state = new ObjectState('id', Object, 1, { x: 1 }, 1)
      const casted = state.asObjectState<{ x: number }>()

      expect(casted).toBe(state)
    })
  })

  describe('TextState', () => {
    it('should create with full constructor', () => {
      const data = '{"name":"test"}'
      const state = new TextState('id-1', Object, 1, data, 1)

      expect(state.id).toBe('id-1')
      expect(state.type).toBe('Object')
      expect(state.typeVersion).toBe(1)
      expect(state.data).toBe(data)
      expect(state.dataVersion).toBe(1)
      expect(state.isText()).toBe(true)
      expect(state.isObject()).toBe(false)
      expect(state.isBinary()).toBe(false)
    })

    it('should create with metadata', () => {
      const metadata = Metadata.with('val', 'op')
      const state = new TextState('id-1', Object, 1, 'data', 1, metadata)

      expect(state.hasMetadata()).toBe(true)
      expect(state.metadata.value).toBe('val')
      expect(state.metadata.operation).toBe('op')
    })

    it('should create null state with empty constructor', () => {
      const state = new TextState()

      expect(state.id).toBe('')
      expect(state.data).toBe('')
      expect(state.isEmpty()).toBe(true)
    })

    it('should identify as text', () => {
      const state = new TextState('id', Object, 1, 'text', 1)

      expect(state.isText()).toBe(true)
      expect(state.isObject()).toBe(false)
      expect(state.isBinary()).toBe(false)
    })

    it('should detect empty state', () => {
      const empty = new TextState('id', Object, 1, '', 1)
      const notEmpty = new TextState('id', Object, 1, 'data', 1)

      expect(empty.isEmpty()).toBe(true)
      expect(notEmpty.isEmpty()).toBe(false)
    })

    it('should detect null state', () => {
      const nullState = TextState.Null
      const normalState = new TextState('id', Object, 1, 'text', 1)

      expect(nullState.isNull()).toBe(true)
      expect(normalState.isNull()).toBe(false)
    })

    it('should cast to TextState', () => {
      const state = new TextState('id', Object, 1, 'data', 1)
      const casted = state.asTextState()

      expect(casted).toBe(state)
    })
  })

  describe('State base class', () => {
    describe('validation', () => {
      it('should allow empty id for NoOp state', () => {
        // Empty id is allowed when id equals State.NoOp ('')
        const state = new TextState()
        expect(state.id).toBe('')
      })

      it('should throw on null type', () => {
        expect(() => new TextState('id', null as any, 1, 'data', 1)).toThrow('type must not be null')
      })

      it('should throw on typeVersion <= 0', () => {
        expect(() => new TextState('id', Object, 0, 'data', 1)).toThrow('typeVersion must be greater than 0')
        expect(() => new TextState('id', Object, -1, 'data', 1)).toThrow('typeVersion must be greater than 0')
      })

      it('should throw on null data', () => {
        expect(() => new TextState('id', Object, 1, null as any, 1)).toThrow('data must not be null')
      })

      it('should throw on dataVersion <= 0', () => {
        expect(() => new TextState('id', Object, 1, 'data', 0)).toThrow('dataVersion must be greater than 0')
        expect(() => new TextState('id', Object, 1, 'data', -1)).toThrow('dataVersion must be greater than 0')
      })
    })

    describe('hasMetadata', () => {
      it('should return true when metadata has content', () => {
        const metadata = Metadata.withValue('test')
        const state = new TextState('id', Object, 1, 'data', 1, metadata)

        expect(state.hasMetadata()).toBe(true)
      })

      it('should return false when metadata is empty', () => {
        const state = new TextState('id', Object, 1, 'data', 1)

        expect(state.hasMetadata()).toBe(false)
      })
    })

    describe('compareTo', () => {
      it('should return 0 for equal states', () => {
        const s1 = new TextState('id', Object, 1, 'data', 1)
        const s2 = new TextState('id', Object, 1, 'data', 1)

        expect(s1.compareTo(s2)).toBe(0)
      })

      it('should compare by data first for text states', () => {
        const s1 = new TextState('id', Object, 1, 'aaa', 1)
        const s2 = new TextState('id', Object, 1, 'bbb', 1)

        expect(s1.compareTo(s2)).toBeLessThan(0)
        expect(s2.compareTo(s1)).toBeGreaterThan(0)
      })

      it('should compare by data for binary states', () => {
        const s1 = new BinaryState('id', Object, 1, new Uint8Array([1, 2]), 1)
        const s2 = new BinaryState('id', Object, 1, new Uint8Array([1, 2]), 1)

        expect(s1.compareTo(s2)).toBe(0)
      })

      it('should detect different binary data', () => {
        const s1 = new BinaryState('id', Object, 1, new Uint8Array([1, 2]), 1)
        const s2 = new BinaryState('id', Object, 1, new Uint8Array([1, 3]), 1)

        expect(s1.compareTo(s2)).not.toBe(0)
      })

      it('should detect different length binary data', () => {
        const s1 = new BinaryState('id', Object, 1, new Uint8Array([1]), 1)
        const s2 = new BinaryState('id', Object, 1, new Uint8Array([1, 2]), 1)

        expect(s1.compareTo(s2)).not.toBe(0)
      })

      it('should compare by id when data is equal', () => {
        const s1 = new TextState('aaa', Object, 1, 'data', 1)
        const s2 = new TextState('bbb', Object, 1, 'data', 1)

        expect(s1.compareTo(s2)).toBeLessThan(0)
      })

      it('should compare by type when id and data are equal', () => {
        class TypeA {}
        class TypeB {}
        const s1 = new TextState('id', TypeA, 1, 'data', 1)
        const s2 = new TextState('id', TypeB, 1, 'data', 1)

        expect(s1.compareTo(s2)).not.toBe(0)
      })

      it('should compare by typeVersion', () => {
        const s1 = new TextState('id', Object, 1, 'data', 1)
        const s2 = new TextState('id', Object, 2, 'data', 1)

        expect(s1.compareTo(s2)).toBeLessThan(0)
      })

      it('should compare by dataVersion', () => {
        const s1 = new TextState('id', Object, 1, 'data', 1)
        const s2 = new TextState('id', Object, 1, 'data', 2)

        expect(s1.compareTo(s2)).toBeLessThan(0)
      })

      it('should compare by metadata', () => {
        const m1 = Metadata.withValue('aaa')
        const m2 = Metadata.withValue('bbb')
        const s1 = new TextState('id', Object, 1, 'data', 1, m1)
        const s2 = new TextState('id', Object, 1, 'data', 1, m2)

        expect(s1.compareTo(s2)).toBeLessThan(0)
      })
    })

    describe('hashCode', () => {
      it('should return consistent hash for same id', () => {
        const s1 = new TextState('same-id', Object, 1, 'data1', 1)
        const s2 = new TextState('same-id', Object, 2, 'data2', 2)

        expect(s1.hashCode()).toBe(s2.hashCode())
      })

      it('should return different hash for different id', () => {
        const s1 = new TextState('id-1', Object, 1, 'data', 1)
        const s2 = new TextState('id-2', Object, 1, 'data', 1)

        expect(s1.hashCode()).not.toBe(s2.hashCode())
      })
    })

    describe('equals', () => {
      it('should return true for states with same id and type', () => {
        const s1 = new TextState('id', Object, 1, 'data1', 1)
        const s2 = new TextState('id', Object, 1, 'data2', 2)

        expect(s1.equals(s2)).toBe(true)
      })

      it('should return false for states with different id', () => {
        const s1 = new TextState('id-1', Object, 1, 'data', 1)
        const s2 = new TextState('id-2', Object, 1, 'data', 1)

        expect(s1.equals(s2)).toBe(false)
      })

      it('should return false for different state types', () => {
        const s1 = new TextState('id', Object, 1, 'data', 1)
        const s2 = new ObjectState('id', Object, 1, { data: 'data' }, 1)

        expect(s1.equals(s2)).toBe(false)
      })

      it('should return false for null', () => {
        const state = new TextState('id', Object, 1, 'data', 1)

        expect(state.equals(null)).toBe(false)
      })

      it('should return false for non-State objects', () => {
        const state = new TextState('id', Object, 1, 'data', 1)

        expect(state.equals('string')).toBe(false)
        expect(state.equals(123)).toBe(false)
        expect(state.equals({})).toBe(false)
      })
    })

    describe('toString', () => {
      it('should format text state correctly', () => {
        const state = new TextState('id-1', Object, 1, 'my-data', 5)
        const str = state.toString()

        expect(str).toContain('TextState[')
        expect(str).toContain('id=id-1')
        expect(str).toContain('type=Object')
        expect(str).toContain('typeVersion=1')
        expect(str).toContain('my-data')
        expect(str).toContain('dataVersion=5')
      })

      it('should format object state correctly', () => {
        const state = new ObjectState('id-1', Object, 1, { x: 1 }, 1)
        const str = state.toString()

        expect(str).toContain('ObjectState[')
      })

      it('should format binary state as (binary)', () => {
        const state = new BinaryState('id-1', Object, 1, new Uint8Array([1, 2]), 1)
        const str = state.toString()

        expect(str).toContain('BinaryState[')
        expect(str).toContain('(binary)')
      })
    })
  })
})
