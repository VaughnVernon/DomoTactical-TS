// Copyright � 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright � 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryDocumentStore } from '../../../../src/store/document/inmemory/InMemoryDocumentStore'
import { Metadata } from '../../../../src/store/Metadata'
import { DomainEvent } from '../../../../src/model/DomainEvent'
import { Result } from '../../../../src/store/Result'

// Test domain event
class UserRegistered extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super()
  }

  override id(): string {
    return this.userId
  }
}

// Test state types
interface User {
  id: string
  name: string
  email: string
}

interface Product {
  id: string
  title: string
  price: number
}

describe('InMemoryDocumentStore', () => {
  let store: InMemoryDocumentStore

  beforeEach(() => {
    store = new InMemoryDocumentStore()
  })

  describe('write', () => {
    it('should write a document successfully', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }

      const result = await store.write('user-1', 'User', user, 1)

      expect(result.outcome.success).toBe(true)
      expect(result.id).toBe('user-1')
      expect(result.state).toEqual(user)
      expect(result.stateVersion).toBe(1)
      expect(result.sources).toHaveLength(0)
    })

    it('should write a document with metadata', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const metadata = Metadata.withProperties(new Map([['createdBy', 'system']]))

      const result = await store.write('user-1', 'User', user, 1, [], metadata)

      expect(result.outcome.success).toBe(true)
      expect(result.id).toBe('user-1')
    })

    it('should write a document with sources', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const event = new UserRegistered('user-1', 'alice@example.com')

      const result = await store.write('user-1', 'User', user, 1, [event])

      expect(result.outcome.success).toBe(true)
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0]).toBe(event)
    })

    it('should fail when writing null state', async () => {
      const result = await store.write('user-1', 'User', null as any, 1)

      expect(result.outcome.success).toBe(false)
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.Error)
        expect(result.outcome.error.message).toContain('state is null')
      }
    })

    it('should detect concurrency violation on lower version', async () => {
      const user1: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const user2: User = { id: 'user-1', name: 'Alice Updated', email: 'alice@example.com' }

      // Write version 2
      await store.write('user-1', 'User', user1, 2)

      // Try to write version 1 (lower)
      const result = await store.write('user-1', 'User', user2, 1)

      expect(result.outcome.success).toBe(false)
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.ConcurrencyViolation)
        expect(result.outcome.error.message).toContain('Version conflict')
      }
    })

    it('should detect concurrency violation on same version', async () => {
      const user1: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const user2: User = { id: 'user-1', name: 'Alice Updated', email: 'alice@example.com' }

      // Write version 1
      await store.write('user-1', 'User', user1, 1)

      // Try to write version 1 again
      const result = await store.write('user-1', 'User', user2, 1)

      expect(result.outcome.success).toBe(false)
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.ConcurrencyViolation)
      }
    })

    it('should allow write with higher version', async () => {
      const user1: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const user2: User = { id: 'user-1', name: 'Alice Updated', email: 'alice@example.com' }

      // Write version 1
      await store.write('user-1', 'User', user1, 1)

      // Write version 2 (higher)
      const result = await store.write('user-1', 'User', user2, 2)

      expect(result.outcome.success).toBe(true)
      expect(result.state).toEqual(user2)
      expect(result.stateVersion).toBe(2)
    })

    it('should store multiple document types separately', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const product: Product = { id: 'product-1', title: 'Laptop', price: 999 }

      await store.write('user-1', 'User', user, 1)
      await store.write('product-1', 'Product', product, 1)

      expect(store.count('User')).toBe(1)
      expect(store.count('Product')).toBe(1)
      expect(store.types()).toContain('User')
      expect(store.types()).toContain('Product')
    })
  })

  describe('read', () => {
    it('should read a document successfully', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      await store.write('user-1', 'User', user, 1)

      const result = await store.read<User>('user-1', 'User')

      expect(result.outcome.success).toBe(true)
      expect(result.id).toBe('user-1')
      expect(result.state).toEqual(user)
      expect(result.stateVersion).toBe(1)
      expect(result.metadata).not.toBeNull()
    })

    it('should read a document with metadata', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const metadata = Metadata.withProperties(new Map([['createdBy', 'admin']]))
      await store.write('user-1', 'User', user, 1, [], metadata)

      const result = await store.read<User>('user-1', 'User')

      expect(result.outcome.success).toBe(true)
      expect(result.metadata).toEqual(metadata)
    })

    it('should fail when reading non-existent document', async () => {
      const result = await store.read('user-999', 'User')

      expect(result.outcome.success).toBe(false)
      expect(result.state).toBeNull()
      expect(result.stateVersion).toBe(-1)
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.NotFound)
      }
    })

    it('should fail when reading from non-existent type store', async () => {
      const result = await store.read('user-1', 'NonExistentType')

      expect(result.outcome.success).toBe(false)
      expect(result.state).toBeNull()
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.NotFound)
        expect(result.outcome.error.message).toContain('Store not found')
      }
    })

    it('should fail when id is null or empty', async () => {
      const result = await store.read('', 'User')

      expect(result.outcome.success).toBe(false)
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.Error)
        expect(result.outcome.error.message).toContain('id is null or empty')
      }
    })

    it('should fail when type is null or empty', async () => {
      const result = await store.read('user-1', '')

      expect(result.outcome.success).toBe(false)
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.Error)
        expect(result.outcome.error.message).toContain('type is null or empty')
      }
    })
  })

  describe('readAll', () => {
    it('should read all documents successfully', async () => {
      const user1: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const user2: User = { id: 'user-2', name: 'Bob', email: 'bob@example.com' }

      await store.write('user-1', 'User', user1, 1)
      await store.write('user-2', 'User', user2, 1)

      const result = await store.readAll([
        { id: 'user-1', type: 'User' },
        { id: 'user-2', type: 'User' }
      ])

      expect(result.outcome.success).toBe(true)
      expect(result.bundles).toHaveLength(2)
      expect(result.bundles[0].state).toEqual(user1)
      expect(result.bundles[1].state).toEqual(user2)
    })

    it('should handle partial reads with NotAllFound', async () => {
      const user1: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }

      await store.write('user-1', 'User', user1, 1)

      const result = await store.readAll([
        { id: 'user-1', type: 'User' },
        { id: 'user-999', type: 'User' } // Does not exist
      ])

      expect(result.outcome.success).toBe(false)
      expect(result.bundles).toHaveLength(1) // Only one found
      expect(result.bundles[0].state).toEqual(user1)
      if (!result.outcome.success) {
        expect(result.outcome.error.result).toBe(Result.NotAllFound)
      }
    })

    it('should read documents across different types', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const product: Product = { id: 'product-1', title: 'Laptop', price: 999 }

      await store.write('user-1', 'User', user, 1)
      await store.write('product-1', 'Product', product, 1)

      const result = await store.readAll([
        { id: 'user-1', type: 'User' },
        { id: 'product-1', type: 'Product' }
      ])

      expect(result.outcome.success).toBe(true)
      expect(result.bundles).toHaveLength(2)
    })

    it('should return empty bundles when none found', async () => {
      const result = await store.readAll([
        { id: 'user-999', type: 'User' }
      ])

      expect(result.outcome.success).toBe(false)
      expect(result.bundles).toHaveLength(0)
    })
  })

  describe('sources management', () => {
    it('should store and retrieve sources', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const event1 = new UserRegistered('user-1', 'alice@example.com')
      const event2 = new UserRegistered('user-1', 'alice.new@example.com')

      await store.write('user-1', 'User', user, 1, [event1])
      await store.write('user-1', 'User', user, 2, [event2])

      const sources = store.getSources('user-1')

      expect(sources).toHaveLength(2)
      expect(sources[0]).toBe(event1)
      expect(sources[1]).toBe(event2)
    })

    it('should return empty array for non-existent document', async () => {
      const sources = store.getSources('user-999')

      expect(sources).toHaveLength(0)
    })
  })

  describe('utility methods', () => {
    it('should count documents in a type store', async () => {
      const user1: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const user2: User = { id: 'user-2', name: 'Bob', email: 'bob@example.com' }

      await store.write('user-1', 'User', user1, 1)
      await store.write('user-2', 'User', user2, 1)

      expect(store.count('User')).toBe(2)
      expect(store.count('NonExistent')).toBe(0)
    })

    it('should list all type names', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const product: Product = { id: 'product-1', title: 'Laptop', price: 999 }

      await store.write('user-1', 'User', user, 1)
      await store.write('product-1', 'Product', product, 1)

      const types = store.types()

      expect(types).toContain('User')
      expect(types).toContain('Product')
      expect(types).toHaveLength(2)
    })

    it('should clear all data', async () => {
      const user: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const event = new UserRegistered('user-1', 'alice@example.com')

      await store.write('user-1', 'User', user, 1, [event])

      store.clear()

      expect(store.count('User')).toBe(0)
      expect(store.types()).toHaveLength(0)
      expect(store.getSources('user-1')).toHaveLength(0)
    })
  })

  describe('version tracking', () => {
    it('should track version through multiple writes', async () => {
      const user1: User = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      const user2: User = { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com' }
      const user3: User = { id: 'user-1', name: 'Alice Smith Jones', email: 'alice@example.com' }

      await store.write('user-1', 'User', user1, 1)
      await store.write('user-1', 'User', user2, 2)
      await store.write('user-1', 'User', user3, 3)

      const result = await store.read<User>('user-1', 'User')

      expect(result.outcome.success).toBe(true)
      expect(result.state).toEqual(user3)
      expect(result.stateVersion).toBe(3)
    })
  })
})
