// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect } from 'vitest'
import { Metadata } from '../../src/store/Metadata'

describe('Metadata', () => {
  describe('factory methods', () => {
    it('should create null metadata', () => {
      const metadata = Metadata.nullMetadata()

      expect(metadata.value).toBe('')
      expect(metadata.operation).toBe('')
      expect(metadata.properties.size).toBe(0)
      expect(metadata.isEmpty()).toBe(true)
    })

    it('should create metadata with properties', () => {
      const props = new Map([
        ['key1', 'value1'],
        ['key2', 'value2']
      ])
      const metadata = Metadata.withProperties(props)

      expect(metadata.hasProperties()).toBe(true)
      expect(metadata.properties.size).toBe(2)
      expect(metadata.properties.get('key1')).toBe('value1')
      expect(metadata.properties.get('key2')).toBe('value2')
      expect(metadata.value).toBe('')
      expect(metadata.operation).toBe('')
    })

    it('should create metadata with operation', () => {
      const metadata = Metadata.withOperation('CREATE')

      expect(metadata.hasOperation()).toBe(true)
      expect(metadata.operation).toBe('CREATE')
      expect(metadata.value).toBe('')
      expect(metadata.hasProperties()).toBe(false)
    })

    it('should create metadata with value', () => {
      const metadata = Metadata.withValue('test-value')

      expect(metadata.hasValue()).toBe(true)
      expect(metadata.value).toBe('test-value')
      expect(metadata.operation).toBe('')
      expect(metadata.hasProperties()).toBe(false)
    })
  })

  describe('with() overloads', () => {
    it('should create metadata with value and operation', () => {
      const metadata = Metadata.with('my-value', 'UPDATE')

      expect(metadata.value).toBe('my-value')
      expect(metadata.operation).toBe('UPDATE')
      expect(metadata.hasProperties()).toBe(false)
    })

    it('should create metadata with properties, value, and operation', () => {
      const props = new Map([['key', 'val']])
      const metadata = Metadata.with(props, 'my-value', 'DELETE')

      expect(metadata.value).toBe('my-value')
      expect(metadata.operation).toBe('DELETE')
      expect(metadata.hasProperties()).toBe(true)
      expect(metadata.properties.get('key')).toBe('val')
    })

    it('should create metadata with properties, value, and operation type (Function)', () => {
      class TestOperation {}
      const props = new Map([['context', 'test']])
      const metadata = Metadata.with(props, 'fn-value', TestOperation)

      expect(metadata.value).toBe('fn-value')
      expect(metadata.operation).toBe('TestOperation')
      expect(metadata.hasProperties()).toBe(true)
    })

    it('should create metadata with function operation in non-compact mode', () => {
      class LongOperation {}
      const props = new Map<string, string>()
      const metadata = Metadata.with(props, 'value', LongOperation, false)

      expect(metadata.operation).toContain('LongOperation')
    })

    it('should throw on invalid arguments', () => {
      expect(() => (Metadata as any).with(123)).toThrow('Invalid arguments')
    })
  })

  describe('constructors', () => {
    it('should create empty metadata with no args', () => {
      const metadata = new Metadata()

      expect(metadata.value).toBe('')
      expect(metadata.operation).toBe('')
      expect(metadata.properties.size).toBe(0)
    })

    it('should create metadata with value and operation (2-arg)', () => {
      const metadata = new Metadata('val', 'op')

      expect(metadata.value).toBe('val')
      expect(metadata.operation).toBe('op')
      expect(metadata.properties.size).toBe(0)
    })

    it('should create metadata with all three args', () => {
      const props = new Map([['a', 'b']])
      const metadata = new Metadata(props, 'v', 'o')

      expect(metadata.value).toBe('v')
      expect(metadata.operation).toBe('o')
      expect(metadata.properties.get('a')).toBe('b')
    })

    it('should handle null/undefined in constructors', () => {
      const metadata1 = new Metadata(null, null)
      expect(metadata1.value).toBe('')
      expect(metadata1.operation).toBe('')

      const metadata2 = new Metadata(undefined, undefined)
      expect(metadata2.value).toBe('')
      expect(metadata2.operation).toBe('')

      const metadata3 = new Metadata(null, null, null)
      expect(metadata3.properties.size).toBe(0)
      expect(metadata3.value).toBe('')
      expect(metadata3.operation).toBe('')
    })
  })

  describe('state queries', () => {
    it('should detect presence of properties', () => {
      const withProps = Metadata.withProperties(new Map([['k', 'v']]))
      const withoutProps = Metadata.nullMetadata()

      expect(withProps.hasProperties()).toBe(true)
      expect(withoutProps.hasProperties()).toBe(false)
    })

    it('should detect presence of operation', () => {
      const withOp = Metadata.withOperation('OP')
      const withoutOp = Metadata.nullMetadata()

      expect(withOp.hasOperation()).toBe(true)
      expect(withoutOp.hasOperation()).toBe(false)
    })

    it('should detect presence of value', () => {
      const withValue = Metadata.withValue('val')
      const withoutValue = Metadata.nullMetadata()

      expect(withValue.hasValue()).toBe(true)
      expect(withoutValue.hasValue()).toBe(false)
    })

    it('should detect empty metadata', () => {
      const empty = Metadata.nullMetadata()
      const notEmpty1 = Metadata.withValue('val')
      const notEmpty2 = Metadata.withOperation('op')

      expect(empty.isEmpty()).toBe(true)
      expect(notEmpty1.isEmpty()).toBe(false)
      expect(notEmpty2.isEmpty()).toBe(false)
    })
  })

  describe('compareTo', () => {
    it('should return 0 for equal metadata', () => {
      const m1 = Metadata.with('value', 'operation')
      const m2 = Metadata.with('value', 'operation')

      expect(m1.compareTo(m2)).toBe(0)
    })

    it('should compare by value', () => {
      const m1 = Metadata.withValue('a')
      const m2 = Metadata.withValue('b')

      expect(m1.compareTo(m2)).toBeLessThan(0)
      expect(m2.compareTo(m1)).toBeGreaterThan(0)
    })

    it('should compare by operation when values are equal', () => {
      const m1 = Metadata.with('value', 'a')
      const m2 = Metadata.with('value', 'b')

      expect(m1.compareTo(m2)).toBeLessThan(0)
      expect(m2.compareTo(m1)).toBeGreaterThan(0)
    })

    it('should compare by properties', () => {
      const m1 = Metadata.withProperties(new Map([['a', '1']]))
      const m2 = Metadata.withProperties(new Map([['b', '2']]))

      expect(m1.compareTo(m2)).not.toBe(0)
    })

    it('should detect different sized property maps', () => {
      const m1 = Metadata.withProperties(new Map([['a', '1']]))
      const m2 = Metadata.withProperties(new Map([['a', '1'], ['b', '2']]))

      expect(m1.compareTo(m2)).not.toBe(0)
    })
  })

  describe('hashCode', () => {
    it('should return consistent hash for same metadata', () => {
      const m1 = Metadata.with('value', 'operation')
      const m2 = Metadata.with('value', 'operation')

      expect(m1.hashCode()).toBe(m2.hashCode())
    })

    it('should return different hash for different metadata', () => {
      const m1 = Metadata.withValue('value1')
      const m2 = Metadata.withValue('value2')

      expect(m1.hashCode()).not.toBe(m2.hashCode())
    })

    it('should include properties in hash', () => {
      const m1 = Metadata.withProperties(new Map([['key', 'val1']]))
      const m2 = Metadata.withProperties(new Map([['key', 'val2']]))

      expect(m1.hashCode()).not.toBe(m2.hashCode())
    })
  })

  describe('equals', () => {
    it('should return true for equal metadata', () => {
      const props = new Map([['k', 'v']])
      const m1 = Metadata.with(props, 'value', 'operation')
      const m2 = Metadata.with(new Map([['k', 'v']]), 'value', 'operation')

      expect(m1.equals(m2)).toBe(true)
    })

    it('should return false for different values', () => {
      const m1 = Metadata.withValue('a')
      const m2 = Metadata.withValue('b')

      expect(m1.equals(m2)).toBe(false)
    })

    it('should return false for different operations', () => {
      const m1 = Metadata.withOperation('op1')
      const m2 = Metadata.withOperation('op2')

      expect(m1.equals(m2)).toBe(false)
    })

    it('should return false for different properties', () => {
      const m1 = Metadata.withProperties(new Map([['k', 'v1']]))
      const m2 = Metadata.withProperties(new Map([['k', 'v2']]))

      expect(m1.equals(m2)).toBe(false)
    })

    it('should return false for null', () => {
      const m = Metadata.nullMetadata()

      expect(m.equals(null)).toBe(false)
    })

    it('should return false for non-Metadata objects', () => {
      const m = Metadata.nullMetadata()

      expect(m.equals('not metadata')).toBe(false)
      expect(m.equals(123)).toBe(false)
      expect(m.equals({})).toBe(false)
    })
  })

  describe('toString', () => {
    it('should format metadata correctly', () => {
      const props = new Map([['key1', 'val1'], ['key2', 'val2']])
      const metadata = Metadata.with(props, 'my-value', 'CREATE')

      const str = metadata.toString()

      expect(str).toContain('Metadata[')
      expect(str).toContain('value=my-value')
      expect(str).toContain('operation=CREATE')
      expect(str).toContain('key1:val1')
      expect(str).toContain('key2:val2')
    })

    it('should handle empty metadata', () => {
      const metadata = Metadata.nullMetadata()
      const str = metadata.toString()

      expect(str).toContain('Metadata[')
      expect(str).toContain('value=')
      expect(str).toContain('operation=')
      expect(str).toContain('properties={}')
    })
  })
})
