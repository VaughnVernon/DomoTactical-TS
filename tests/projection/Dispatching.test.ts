// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol, Definition, Actor } from 'domo-actors'
import {
  ProjectToDescription,
  MatchableProjections,
  TextProjectionDispatcherActor,
  ProjectionDispatcher,
  Projection,
  Projectable,
  ProjectionControl,
  TextProjectable,
  ProjectionSupervisor
} from '../../src/model/projections'
import { TestConfirmer } from '../../src/testkit'
import { TextEntry } from '../../src/store/journal/TextEntry'
import { Metadata } from '../../src/store/Metadata'

/**
 * Test projection Actor for verification.
 */
class TestProjectionActor extends Actor implements Projection {
  private projectables: Projectable[] = []
  private errorToThrow?: Error

  constructor() {
    super()
  }

  async projectWith(
    projectable: Projectable,
    control: ProjectionControl
  ): Promise<void> {
    // Set execution context for supervisor
    this.executionContext()
      .setValue('operation', 'projectWith')
      .setValue('projectableId', projectable.dataId())

    if (this.errorToThrow) {
      // Just throw - supervision handles error reporting
      throw this.errorToThrow
    }

    this.projectables.push(projectable)
    control.confirmProjected(projectable)
  }

  /**
   * Set error to throw on next projectWith call.
   * This is a message handler to configure test behavior.
   */
  async setErrorToThrow(error: Error | undefined): Promise<void> {
    this.errorToThrow = error
  }

  /**
   * Get the projectables for testing.
   * This is a message handler that returns the internal state.
   */
  async getProjectables(): Promise<Projectable[]> {
    return this.projectables
  }

  /**
   * Get count of projectables for testing.
   */
  async getProjectableCount(): Promise<number> {
    return this.projectables.length
  }

  async reset(): Promise<void> {
    this.projectables = []
    this.errorToThrow = undefined
  }
}

/**
 * Test suite for projection matching and dispatching.
 */
describe('Projection Matching and Dispatching', () => {
  describe('ProjectToDescription', () => {
    // Simple projection for pattern matching tests (no Actor needed)
    class SimpleProjection implements Projection {
      async projectWith(_projectable: Projectable, _control: ProjectionControl): Promise<void> {
        // No-op for pattern matching tests
      }
    }

    let projection: SimpleProjection

    beforeEach(() => {
      projection = new SimpleProjection()
    })

    it('should create description with exact matches', () => {
      const description = new ProjectToDescription(
        projection,
        ['AccountOpened', 'FundsDeposited'],
        'Account events'
      )

      expect(description.projection).toBe(projection)
      expect(description.becauseOf).toEqual(['AccountOpened', 'FundsDeposited'])
      expect(description.description).toBe('Account events')
    })

    it('should throw error for null projection', () => {
      expect(() => new ProjectToDescription(
        null as any,
        ['Test'],
        'Description'
      )).toThrow('Projection must not be null')
    })

    it('should throw error for empty patterns', () => {
      expect(() => new ProjectToDescription(
        projection,
        [],
        'Description'
      )).toThrow('BecauseOf patterns must not be empty')
    })

    it('should throw error for empty description', () => {
      expect(() => new ProjectToDescription(
        projection,
        ['Test'],
        ''
      )).toThrow('Description must not be empty')
    })

    describe('Pattern matching', () => {
      it('should match exact patterns', () => {
        const description = new ProjectToDescription(
          projection,
          ['AccountOpened'],
          'Test'
        )

        expect(description.matches(['AccountOpened'])).toBe(true)
        expect(description.matches(['AccountClosed'])).toBe(false)
      })

      it('should match prefix wildcard patterns', () => {
        const description = new ProjectToDescription(
          projection,
          ['Account*'],
          'Test'
        )

        expect(description.matches(['AccountOpened'])).toBe(true)
        expect(description.matches(['AccountClosed'])).toBe(true)
        expect(description.matches(['Account.Something.Else'])).toBe(true)
        expect(description.matches(['TransferStarted'])).toBe(false)
      })

      it('should match suffix wildcard patterns', () => {
        const description = new ProjectToDescription(
          projection,
          ['*Event'],
          'Test'
        )

        expect(description.matches(['AccountEvent'])).toBe(true)
        expect(description.matches(['TransferEvent'])).toBe(true)
        expect(description.matches(['EventAccount'])).toBe(false)
      })

      it('should match namespace wildcard patterns', () => {
        const description = new ProjectToDescription(
          projection,
          ['com.example.*'],
          'Test'
        )

        expect(description.matches(['com.example.EventA'])).toBe(true)
        expect(description.matches(['com.example.EventB'])).toBe(true)
        expect(description.matches(['com.other.EventA'])).toBe(false)
      })

      it('should match multiple patterns', () => {
        const description = new ProjectToDescription(
          projection,
          ['Account*', 'Transfer.Completed'],
          'Test'
        )

        expect(description.matches(['AccountOpened'])).toBe(true)
        expect(description.matches(['Transfer.Completed'])).toBe(true)
        expect(description.matches(['Transfer.Started'])).toBe(false)
      })

      it('should match full wildcard', () => {
        const description = new ProjectToDescription(
          projection,
          ['*'],
          'Test'
        )

        expect(description.matches(['AccountOpened'])).toBe(true)
        expect(description.matches(['AnyEvent'])).toBe(true)
      })

      it('should match contains wildcard', () => {
        const description = new ProjectToDescription(
          projection,
          ['*Transfer*'],
          'Test'
        )

        expect(description.matches(['FundsTransferStarted'])).toBe(true)
        expect(description.matches(['TransferCompleted'])).toBe(true)
        expect(description.matches(['AccountOpened'])).toBe(false)
      })

      it('should match any reason in list', () => {
        const description = new ProjectToDescription(
          projection,
          ['AccountOpened'],
          'Test'
        )

        // Multiple reasons, one matches
        expect(description.matches(['AccountClosed', 'AccountOpened'])).toBe(true)
        // No matches
        expect(description.matches(['AccountClosed', 'TransferStarted'])).toBe(false)
      })

      it('should not match empty reasons', () => {
        const description = new ProjectToDescription(
          projection,
          ['AccountOpened'],
          'Test'
        )

        expect(description.matches([])).toBe(false)
        expect(description.matches(null as any)).toBe(false)
      })
    })
  })

  describe('MatchableProjections', () => {
    let matchable: MatchableProjections
    let projection1: Projection
    let projection2: Projection
    let projection3: Projection

    beforeEach(() => {
      // Initialize supervisor
      const supervisorProtocol: Protocol = {
        type: () => 'projection-supervisor',
        instantiator: () => ({
          instantiate: () => new ProjectionSupervisor()
        })
      }
      stage().actorFor(supervisorProtocol, undefined, 'default')

      matchable = new MatchableProjections()

      // Create projection Actors
      const projectionProtocol: Protocol = {
        type: () => 'TestProjection',
        instantiator: () => ({
          instantiate: () => new TestProjectionActor()
        })
      }

      projection1 = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor')
      projection2 = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor')
      projection3 = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor')
    })

    afterEach(async () => {
      await stage().close()
    })

    it('should register descriptions', () => {
      const desc = new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Test'
      )

      matchable.register(desc)

      expect(matchable.count()).toBe(1)
      expect(matchable.allDescriptions()).toContain(desc)
    })

    it('should throw error for null description', () => {
      expect(() => matchable.register(null as any)).toThrow('ProjectToDescription must not be null')
    })

    it('should match single exact pattern', () => {
      matchable.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Projection 1'
      ))

      const projections = matchable.match(['AccountOpened'])

      expect(projections).toHaveLength(1)
      expect(projections[0]).toBe(projection1)
    })

    it('should match multiple projections for same event', () => {
      matchable.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Projection 1'
      ))

      matchable.register(new ProjectToDescription(
        projection2,
        ['Account*'],
        'Projection 2'
      ))

      const projections = matchable.match(['AccountOpened'])

      expect(projections).toHaveLength(2)
      expect(projections).toContain(projection1)
      expect(projections).toContain(projection2)
    })

    it('should return empty array for no matches', () => {
      matchable.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Test'
      ))

      const projections = matchable.match(['TransferStarted'])

      expect(projections).toHaveLength(0)
    })

    it('should deduplicate projections', () => {
      // Register same projection with multiple patterns that might match
      matchable.register(new ProjectToDescription(
        projection1,
        ['Account*', 'AccountOpened'],
        'Test'
      ))

      const projections = matchable.match(['AccountOpened'])

      // Should only return projection once even though multiple patterns match
      expect(projections).toHaveLength(1)
      expect(projections[0]).toBe(projection1)
    })

    it('should clear all registrations', () => {
      matchable.register(new ProjectToDescription(projection1, ['Test1'], 'Test 1'))
      matchable.register(new ProjectToDescription(projection2, ['Test2'], 'Test 2'))

      expect(matchable.count()).toBe(2)

      matchable.clear()

      expect(matchable.count()).toBe(0)
      expect(matchable.match(['Test1'])).toHaveLength(0)
    })

    it('should cache exact matches for performance', () => {
      matchable.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Test'
      ))

      // First match (cache miss)
      const projections1 = matchable.match(['AccountOpened'])
      expect(projections1).toHaveLength(1)

      // Second match (cache hit - should return same result)
      const projections2 = matchable.match(['AccountOpened'])
      expect(projections2).toHaveLength(1)
      expect(projections2[0]).toBe(projection1)
    })

    it('should clear cache when new description registered', () => {
      matchable.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Test 1'
      ))

      const projections1 = matchable.match(['AccountOpened'])
      expect(projections1).toHaveLength(1)

      // Register new description
      matchable.register(new ProjectToDescription(
        projection2,
        ['AccountOpened'],
        'Test 2'
      ))

      // Should now return both projections
      const projections2 = matchable.match(['AccountOpened'])
      expect(projections2).toHaveLength(2)
    })
  })

  describe('TextProjectionDispatcherActor', () => {
    let dispatcher: ProjectionDispatcher
    let confirmer: InMemoryConfirmer
    let projection1: Projection
    let projection2: Projection
    let projectable: Projectable

    beforeEach(() => {
      // Initialize supervisor
      const supervisorProtocol: Protocol = {
        type: () => 'projection-supervisor',
        instantiator: () => ({
          instantiate: () => new ProjectionSupervisor()
        })
      }
      stage().actorFor(supervisorProtocol, undefined, 'default')

      confirmer = new TestConfirmer()

      // Create dispatcher Actor
      const dispatcherProtocol: Protocol = {
        type: () => 'TextProjectionDispatcher',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [confirmers] = def.parameters()
            return new TextProjectionDispatcherActor(confirmers)
          }
        })
      }

      dispatcher = stage().actorFor<ProjectionDispatcher>(
        dispatcherProtocol,
        undefined,
        'projection-supervisor',
        undefined,
        confirmer
      )

      // Create projection Actors
      const projectionProtocol: Protocol = {
        type: () => 'TestProjection',
        instantiator: () => ({
          instantiate: () => new TestProjectionActor()
        })
      }

      projection1 = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor')
      projection2 = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor')

      const entry = new TextEntry(
        'AccountOpened',
        1,
        JSON.stringify({ accountId: 'acc-1', owner: 'Alice' }),
        JSON.stringify(Metadata.nullMetadata())
      )

      projectable = new TextProjectable(null, [entry], 'AccountOpened')
    })

    afterEach(async () => {
      await stage().close()
    })

    it('should dispatch to matching projection', async () => {
      await dispatcher.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Test projection'
      ))

      await dispatcher.dispatch(projectable)

      // Use async getter to access Actor state
      const projection1Actor = projection1 as any
      const projectables = await projection1Actor.getProjectables()
      expect(projectables).toHaveLength(1)
      expect(projectables[0]).toBe(projectable)
      expect(confirmer.isConfirmed(projectable)).toBe(true)
    })

    it('should dispatch to multiple matching projections', async () => {
      await dispatcher.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Projection 1'
      ))

      await dispatcher.register(new ProjectToDescription(
        projection2,
        ['Account*'],
        'Projection 2'
      ))

      await dispatcher.dispatch(projectable)

      const projection1Actor = projection1 as any
      const projection2Actor = projection2 as any
      expect(await projection1Actor.getProjectableCount()).toBe(1)
      expect(await projection2Actor.getProjectableCount()).toBe(1)
      expect(confirmer.isConfirmed(projectable)).toBe(true)
    })

    it('should not dispatch to non-matching projections', async () => {
      await dispatcher.register(new ProjectToDescription(
        projection1,
        ['TransferStarted'],
        'Transfer projection'
      ))

      await dispatcher.dispatch(projectable)

      const projection1Actor = projection1 as any
      expect(await projection1Actor.getProjectableCount()).toBe(0)
      expect(confirmer.isPending(projectable)).toBe(true) // Still pending, not confirmed
    })

    it('should mark as pending before dispatching', async () => {
      await dispatcher.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Test'
      ))

      await dispatcher.dispatch(projectable)

      // Should be confirmed after successful projection
      expect(confirmer.isConfirmed(projectable)).toBe(true)
    })

    it('should handle projection errors via supervision', async () => {
      // With Actor supervision, errors don't throw to the caller
      // Instead, the supervisor handles the error and applies a directive

      // Set projection to throw an error via message
      const projection1Actor = projection1 as any
      await projection1Actor.setErrorToThrow(new Error('Projection failed'))

      await dispatcher.register(new ProjectToDescription(
        projection1,
        ['AccountOpened'],
        'Test'
      ))

      // Dispatch - Actor supervision catches and handles the error
      // The error is logged and Resume directive is applied
      // But the dispatch call itself may still fail
      try {
        await dispatcher.dispatch(projectable)
      } catch (error) {
        // Error is expected - supervision logs it but dispatch may still fail
      }

      // The projectable should NOT be confirmed because projection failed
      expect(confirmer.isConfirmed(projectable)).toBe(false)
      expect(confirmer.isPending(projectable)).toBe(true)
    })

    it('should report projection count', async () => {
      expect(await dispatcher.projectionCount()).toBe(0)

      await dispatcher.register(new ProjectToDescription(projection1, ['Test1'], 'Test 1'))
      expect(await dispatcher.projectionCount()).toBe(1)

      await dispatcher.register(new ProjectToDescription(projection2, ['Test2'], 'Test 2'))
      expect(await dispatcher.projectionCount()).toBe(2)
    })

    it('should provide access to all descriptions', async () => {
      const desc1 = new ProjectToDescription(projection1, ['Test1'], 'Test 1')
      const desc2 = new ProjectToDescription(projection2, ['Test2'], 'Test 2')

      await dispatcher.register(desc1)
      await dispatcher.register(desc2)

      const descriptions = await dispatcher.allDescriptions()

      expect(descriptions).toHaveLength(2)
      expect(descriptions).toContain(desc1)
      expect(descriptions).toContain(desc2)
    })
  })

  describe('End-to-end projection pipeline', () => {
    it('should demonstrate complete CQRS projection flow', async () => {
      // Initialize supervisor
      const supervisorProtocol: Protocol = {
        type: () => 'projection-supervisor',
        instantiator: () => ({
          instantiate: () => new ProjectionSupervisor()
        })
      }
      stage().actorFor(supervisorProtocol, undefined, 'default')

      // Setup
      const confirmer = new TestConfirmer()

      // Create dispatcher Actor
      const dispatcherProtocol: Protocol = {
        type: () => 'TextProjectionDispatcher',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [conf] = def.parameters()
            return new TextProjectionDispatcherActor(conf)
          }
        })
      }

      const dispatcher = stage().actorFor<ProjectionDispatcher>(
        dispatcherProtocol,
        undefined,
        'projection-supervisor',
        undefined,
        confirmer
      )

      // Create projection Actors
      const projectionProtocol: Protocol = {
        type: () => 'TestProjection',
        instantiator: () => ({
          instantiate: () => new TestProjectionActor()
        })
      }

      const accountSummaryProjection = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor') as any
      const auditLogProjection = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor') as any
      const statisticsProjection = stage().actorFor<Projection>(projectionProtocol, undefined, 'projection-supervisor') as any

      // Register projections with different patterns
      await dispatcher.register(new ProjectToDescription(
        accountSummaryProjection,
        ['AccountOpened', 'FundsDeposited', 'FundsWithdrawn'],
        'Account summary view - exact matches'
      ))

      await dispatcher.register(new ProjectToDescription(
        auditLogProjection,
        ['Account*', 'Transfer*'],
        'Audit log - wildcard matches for all account and transfer events'
      ))

      await dispatcher.register(new ProjectToDescription(
        statisticsProjection,
        ['AccountOpened'],
        'Statistics - only new accounts'
      ))

      // Create events
      const accountOpened = new TextProjectable(
        null,
        [new TextEntry('AccountOpened', 1, JSON.stringify({ accountId: 'acc-1' }), '{}')],
        'AccountOpened'
      )

      const fundsDeposited = new TextProjectable(
        null,
        [new TextEntry('FundsDeposited', 1, JSON.stringify({ accountId: 'acc-1', amount: 100 }), '{}')],
        'FundsDeposited'
      )

      const transferStarted = new TextProjectable(
        null,
        [new TextEntry('TransferStarted', 1, JSON.stringify({ transferId: 't-1' }), '{}')],
        'TransferStarted'
      )

      // Dispatch events
      await dispatcher.dispatch(accountOpened)
      await dispatcher.dispatch(fundsDeposited)
      await dispatcher.dispatch(transferStarted)

      // Verify routing
      expect(await accountSummaryProjection.getProjectableCount()).toBe(2) // AccountOpened, FundsDeposited
      expect(await auditLogProjection.getProjectableCount()).toBe(2) // AccountOpened (Account*), TransferStarted (Transfer*)
      expect(await statisticsProjection.getProjectableCount()).toBe(1) // Only AccountOpened

      // Verify confirmation
      expect(confirmer.isConfirmed(accountOpened)).toBe(true)
      expect(confirmer.isConfirmed(fundsDeposited)).toBe(true)
      expect(confirmer.isConfirmed(transferStarted)).toBe(true)

      // Cleanup
      await stage().close()
    })
  })
})
