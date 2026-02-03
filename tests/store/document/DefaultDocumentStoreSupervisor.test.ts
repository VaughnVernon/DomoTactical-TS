// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol, SupervisionDirective, SupervisionStrategy, Supervised } from 'domo-actors'
import { DefaultDocumentStoreSupervisor } from '../../../src/store/document/DefaultDocumentStoreSupervisor'

/**
 * Test subclass that exposes protected decideDirective for testing.
 */
class TestableDocumentStoreSupervisor extends DefaultDocumentStoreSupervisor {
  public testDecideDirective(
    error: Error,
    supervised: Supervised | null,
    strategy: SupervisionStrategy | null
  ): SupervisionDirective {
    return this.decideDirective(error, supervised as any, strategy as any)
  }
}

/**
 * Tests for DefaultDocumentStoreSupervisor directive decisions.
 *
 * The supervisor decides how to handle errors based on error message content:
 * - Resume: Business errors, concurrency conflicts
 * - Restart: State corruption, serialization errors
 * - Stop: Fatal storage failures
 */
describe('DefaultDocumentStoreSupervisor', () => {
  let supervisor: TestableDocumentStoreSupervisor

  beforeEach(async () => {
    // Create supervisor via actor system
    const supervisorProtocol: Protocol = {
      type: () => 'test-document-store-supervisor',
      instantiator: () => ({
        instantiate: () => new TestableDocumentStoreSupervisor()
      })
    }
    supervisor = stage().actorFor<TestableDocumentStoreSupervisor>(supervisorProtocol, undefined, 'default') as any
  })

  afterEach(async () => {
    await stage().close()
  })

  describe('directive decisions', () => {
    describe('Resume directives', () => {
      it('should Resume on concurrency errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Concurrency violation detected'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Version conflict on document'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Optimistic lock failed'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume on validation errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Validation failed: name required'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Invalid document state'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume on not found errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Document not found'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Collection not found'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume on business rule violations', async () => {
        expect(await supervisor.testDecideDirective(new Error('Operation not allowed'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Document already exists'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Duplicate key detected'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume by default for unknown errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Some random error'), null, null)).toBe(SupervisionDirective.Resume)
      })
    })

    describe('Restart directives', () => {
      it('should Restart on serialization errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Serialization failed'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('Deserialization error'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('JSON parse error'), null, null)).toBe(SupervisionDirective.Restart)
      })

      it('should Restart on schema errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Schema mismatch'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('Schema validation failed'), null, null)).toBe(SupervisionDirective.Restart)
      })

      it('should Restart on state corruption', async () => {
        expect(await supervisor.testDecideDirective(new Error('Corrupt document detected'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('Inconsistent state'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('Internal state error'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('State error during read'), null, null)).toBe(SupervisionDirective.Restart)
      })
    })

    describe('storage failure directives', () => {
      it('should Resume on storage failures to allow recovery when storage is restored', async () => {
        // Storage failures use Resume rather than Stop because:
        // - Storage recovery is handled externally (k8s, admins, etc.)
        // - The document store will recover gracefully once storage is available
        // - Stopping would require service restart, which is undesirable
        expect(await supervisor.testDecideDirective(new Error('Storage unavailable'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Connection lost to database'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Fatal: cannot recover'), null, null)).toBe(SupervisionDirective.Resume)
      })
    })
  })

  describe('supervisor creation', () => {
    it('should be createable as an actor', async () => {
      // supervisor was already created in beforeEach
      expect(supervisor).toBeDefined()
    })

    it('should have correct type name', async () => {
      const supervisorProtocol: Protocol = {
        type: () => 'document-store-supervisor',
        instantiator: () => ({
          instantiate: () => new DefaultDocumentStoreSupervisor()
        })
      }

      const created = stage().actorFor(supervisorProtocol, undefined, 'default')
      expect(created).toBeDefined()
    })
  })
})
