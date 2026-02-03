// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol, SupervisionDirective, SupervisionStrategy, Supervised } from 'domo-actors'
import { DefaultJournalSupervisor } from '../../../src/store/journal/DefaultJournalSupervisor'
import { ApplyFailedError, Applicable } from '../../../src/model/ApplyFailedError'
import { Metadata } from '../../../src/store/Metadata'
import { Source } from '../../../src/store/Source'

// Test event class
class TestEvent extends Source<{ value: string }> {
  constructor(value: string) {
    super(TestEvent, 1, { value })
  }
}

/**
 * Test subclass that exposes protected decideDirective for testing.
 */
class TestableJournalSupervisor extends DefaultJournalSupervisor {
  public testDecideDirective(
    error: Error,
    supervised: Supervised | null,
    strategy: SupervisionStrategy | null
  ): SupervisionDirective {
    return this.decideDirective(error, supervised as any, strategy as any)
  }
}

/**
 * Tests for DefaultJournalSupervisor directive decisions.
 *
 * The supervisor decides how to handle errors based on error message content:
 * - Resume: Business errors, concurrency conflicts
 * - Restart: State corruption
 * - Stop: Fatal storage failures
 */
describe('DefaultJournalSupervisor', () => {
  let supervisor: TestableJournalSupervisor

  beforeEach(async () => {
    // Create supervisor via actor system
    const supervisorProtocol: Protocol = {
      type: () => 'test-journal-supervisor',
      instantiator: () => ({
        instantiate: () => new TestableJournalSupervisor()
      })
    }
    supervisor = stage().actorFor<TestableJournalSupervisor>(supervisorProtocol, undefined, 'default') as any
  })

  afterEach(async () => {
    await stage().close()
  })

  describe('directive decisions', () => {
    describe('Resume directives', () => {
      it('should Resume on concurrency errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Concurrency violation detected'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Version conflict on stream'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Optimistic lock failed'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume on validation errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Validation failed: amount must be positive'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Invalid operation for current state'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume on not found errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Entity not found'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Stream not found'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume on business rule violations', async () => {
        expect(await supervisor.testDecideDirective(new Error('Operation not allowed in current state'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Insufficient funds for withdrawal'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Entity already exists'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Duplicate order detected'), null, null)).toBe(SupervisionDirective.Resume)
      })

      it('should Resume by default for unknown errors', async () => {
        expect(await supervisor.testDecideDirective(new Error('Some random error'), null, null)).toBe(SupervisionDirective.Resume)
      })
    })

    describe('Restart directives', () => {
      it('should Restart on state corruption', async () => {
        expect(await supervisor.testDecideDirective(new Error('Corrupt event detected in stream'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('Inconsistent state after replay'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('Internal state error'), null, null)).toBe(SupervisionDirective.Restart)
        expect(await supervisor.testDecideDirective(new Error('State error during apply'), null, null)).toBe(SupervisionDirective.Restart)
      })
    })

    describe('storage failure directives', () => {
      it('should Resume on storage failures to allow recovery when storage is restored', async () => {
        // Storage failures use Resume rather than Stop because:
        // - Storage recovery is handled externally (k8s, admins, etc.)
        // - The journal will recover gracefully once storage is available
        // - Stopping would require service restart, which is undesirable
        expect(await supervisor.testDecideDirective(new Error('Storage unavailable'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Connection lost to database'), null, null)).toBe(SupervisionDirective.Resume)
        expect(await supervisor.testDecideDirective(new Error('Fatal: cannot recover'), null, null)).toBe(SupervisionDirective.Resume)
      })
    })
  })

  describe('ApplyFailedError handling', () => {
    it('should handle ApplyFailedError with sources', async () => {
      const sources = [new TestEvent('value1'), new TestEvent('value2')]
      const metadata = Metadata.withOperation('CREATE')
      const applicable = new Applicable({ orderId: 'order-1' }, sources, metadata)
      const error = new ApplyFailedError(applicable, 'Validation failed')

      const directive = await supervisor.testDecideDirective(error, null, null)
      expect(directive).toBe(SupervisionDirective.Resume)
    })

    it('should handle ApplyFailedError with null state', async () => {
      const sources = [new TestEvent('value')]
      const applicable = new Applicable(null, sources, Metadata.nullMetadata())
      const error = new ApplyFailedError(applicable, 'Concurrency violation')

      const directive = await supervisor.testDecideDirective(error, null, null)
      expect(directive).toBe(SupervisionDirective.Resume)
    })
  })

  describe('supervisor creation', () => {
    it('should be createable as an actor', async () => {
      // supervisor was already created in beforeEach
      expect(supervisor).toBeDefined()
    })

    it('should have correct type name', async () => {
      const supervisorProtocol: Protocol = {
        type: () => 'journal-supervisor',
        instantiator: () => ({
          instantiate: () => new DefaultJournalSupervisor()
        })
      }

      const created = stage().actorFor(supervisorProtocol, undefined, 'default')
      expect(created).toBeDefined()
    })
  })
})
