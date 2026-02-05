// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5

import { describe, it, expect, beforeEach } from 'vitest'
import { StoreTypeMapper } from '../../src/store/StoreTypeMapper'

describe('StoreTypeMapper', () => {
  beforeEach(() => {
    StoreTypeMapper.reset()
  })

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = StoreTypeMapper.instance()
      const instance2 = StoreTypeMapper.instance()
      expect(instance1).toBe(instance2)
    })

    it('should reset the singleton', () => {
      const instance1 = StoreTypeMapper.instance()
      StoreTypeMapper.reset()
      const instance2 = StoreTypeMapper.instance()
      expect(instance1).not.toBe(instance2)
    })
  })

  describe('explicit mapping', () => {
    it('should register bidirectional mapping', () => {
      const mapper = StoreTypeMapper.instance()

      mapper.mapping('AccountOpened', 'account-opened')

      expect(mapper.toSymbolicName('AccountOpened')).toBe('account-opened')
      expect(mapper.toTypeName('account-opened')).toBe('AccountOpened')
    })

    it('should support fluent chaining', () => {
      const mapper = StoreTypeMapper.instance()

      mapper
        .mapping('AccountOpened', 'account-opened')
        .mapping('FundsDeposited', 'funds-deposited')
        .mapping('FundsWithdrawn', 'funds-withdrawn')

      expect(mapper.toSymbolicName('AccountOpened')).toBe('account-opened')
      expect(mapper.toSymbolicName('FundsDeposited')).toBe('funds-deposited')
      expect(mapper.toSymbolicName('FundsWithdrawn')).toBe('funds-withdrawn')
    })

    it('should support custom symbolic names', () => {
      const mapper = StoreTypeMapper.instance()

      mapper.mapping('AccountOpened', 'acct-open')
      mapper.mapping('FundsDeposited', 'deposit')

      expect(mapper.toSymbolicName('AccountOpened')).toBe('acct-open')
      expect(mapper.toTypeName('acct-open')).toBe('AccountOpened')
      expect(mapper.toSymbolicName('FundsDeposited')).toBe('deposit')
      expect(mapper.toTypeName('deposit')).toBe('FundsDeposited')
    })

    it('should report hasTypeMapping correctly', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.hasTypeMapping('AccountOpened')).toBe(false)

      mapper.mapping('AccountOpened', 'account-opened')

      expect(mapper.hasTypeMapping('AccountOpened')).toBe(true)
      expect(mapper.hasTypeMapping('FundsDeposited')).toBe(false)
    })

    it('should report hasSymbolicMapping correctly', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.hasSymbolicMapping('account-opened')).toBe(false)

      mapper.mapping('AccountOpened', 'account-opened')

      expect(mapper.hasSymbolicMapping('account-opened')).toBe(true)
      expect(mapper.hasSymbolicMapping('funds-deposited')).toBe(false)
    })
  })

  describe('implicit conversion - PascalCase to kebab-case', () => {
    it('should convert simple PascalCase', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toSymbolicName('AccountOpened')).toBe('account-opened')
      expect(mapper.toSymbolicName('FundsDeposited')).toBe('funds-deposited')
      expect(mapper.toSymbolicName('UserRegistered')).toBe('user-registered')
    })

    it('should convert single word PascalCase', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toSymbolicName('Name')).toBe('name')
      expect(mapper.toSymbolicName('Account')).toBe('account')
    })

    it('should convert multi-word PascalCase', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toSymbolicName('UserAccountCreated')).toBe('user-account-created')
      expect(mapper.toSymbolicName('BankTransferInitiated')).toBe('bank-transfer-initiated')
    })

    it('should handle consecutive uppercase (acronyms)', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toSymbolicName('XMLParser')).toBe('xml-parser')
      expect(mapper.toSymbolicName('HTTPRequest')).toBe('http-request')
      expect(mapper.toSymbolicName('JSONData')).toBe('json-data')
    })

    it('should handle empty string', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toSymbolicName('')).toBe('')
    })
  })

  describe('implicit conversion - kebab-case to PascalCase', () => {
    it('should convert simple kebab-case', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toTypeName('account-opened')).toBe('AccountOpened')
      expect(mapper.toTypeName('funds-deposited')).toBe('FundsDeposited')
      expect(mapper.toTypeName('user-registered')).toBe('UserRegistered')
    })

    it('should convert single word kebab-case', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toTypeName('name')).toBe('Name')
      expect(mapper.toTypeName('account')).toBe('Account')
    })

    it('should convert multi-word kebab-case', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toTypeName('user-account-created')).toBe('UserAccountCreated')
      expect(mapper.toTypeName('bank-transfer-initiated')).toBe('BankTransferInitiated')
    })

    it('should handle empty string', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toTypeName('')).toBe('')
    })
  })

  describe('round-trip conversion', () => {
    it('should round-trip PascalCase through kebab-case', () => {
      const mapper = StoreTypeMapper.instance()

      const original = 'AccountOpened'
      const symbolic = mapper.toSymbolicName(original)
      const restored = mapper.toTypeName(symbolic)

      expect(restored).toBe(original)
    })

    it('should round-trip kebab-case through PascalCase', () => {
      const mapper = StoreTypeMapper.instance()

      const original = 'account-opened'
      const typeName = mapper.toTypeName(original)
      const restored = mapper.toSymbolicName(typeName)

      expect(restored).toBe(original)
    })

    it('should round-trip single word', () => {
      const mapper = StoreTypeMapper.instance()

      expect(mapper.toTypeName(mapper.toSymbolicName('Name'))).toBe('Name')
      expect(mapper.toSymbolicName(mapper.toTypeName('name'))).toBe('name')
    })
  })

  describe('explicit mapping takes precedence', () => {
    it('should use explicit mapping over convention', () => {
      const mapper = StoreTypeMapper.instance()

      // Register a non-conventional mapping
      mapper.mapping('AccountOpened', 'custom-event-name')

      // Should use explicit mapping, not convention
      expect(mapper.toSymbolicName('AccountOpened')).toBe('custom-event-name')
      expect(mapper.toTypeName('custom-event-name')).toBe('AccountOpened')

      // Unregistered type should still use convention
      expect(mapper.toSymbolicName('FundsDeposited')).toBe('funds-deposited')
    })
  })
})
