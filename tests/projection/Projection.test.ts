// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach } from 'vitest'
import {
  TextProjectable,
  Projection,
  BasicProjectionControl,
  Projectable,
  ProjectionControl
} from '../../src/model/projections'
import { TestConfirmer } from '../../src/testkit'
import { TextState } from '../../src/store/State'
import { TextEntry } from '../../src/store/TextEntry'
import { Metadata } from '../../src/store/Metadata'

/**
 * Test suite for Projection core components.
 */
describe('Projection Core Components', () => {
  describe('TextProjectable', () => {
    it('should create projectable from state', () => {
      const state = new TextState(
        'account-1',
        'Object',
        1,
        JSON.stringify({ balance: 100 }),
        5,
        Metadata.nullMetadata()
      )

      const projectable = new TextProjectable(state, [], 'AccountSummary')

      expect(projectable.type()).toBe('Object')
      expect(projectable.typeVersion()).toBe(1)
      expect(projectable.dataId()).toBe('account-1')
      expect(projectable.dataVersion()).toBe(5)
      expect(projectable.hasObject()).toBe(true)
      expect(projectable.hasEntries()).toBe(false)
      expect(projectable.becauseOf()).toEqual(['AccountSummary'])
    })

    it('should create projectable from entries', () => {
      const entry1 = new TextEntry(
        'acc-1',
        'AccountOpened',
        1,
        JSON.stringify({ accountId: 'acc-1', owner: 'Alice' }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const entry2 = new TextEntry(
        'acc-1',
        'FundsDeposited',
        1,
        JSON.stringify({ accountId: 'acc-1', amount: 100 }),
        2,
        JSON.stringify(Metadata.nullMetadata())
      )

      const projectable = new TextProjectable(null, [entry1, entry2], 'Account.*')

      expect(projectable.hasObject()).toBe(false)
      expect(projectable.hasEntries()).toBe(true)
      expect(projectable.entries()).toHaveLength(2)
      expect(projectable.becauseOf()).toEqual(['Account.*'])
      expect(projectable.type()).toBe('Account.*')
      expect(projectable.dataVersion()).toBe(0)
      expect(projectable.dataId()).toBe('')
    })

    it('should provide text data access', () => {
      const state = new TextState(
        'account-1',
        'Object',
        1,
        JSON.stringify({ balance: 100, owner: 'Alice' }),
        1,
        Metadata.nullMetadata()
      )

      const projectable = new TextProjectable(state, [], 'AccountSummary')

      const text = projectable.dataAsText()
      expect(text).toBe(JSON.stringify({ balance: 100, owner: 'Alice' }))

      const obj = projectable.object<{ balance: number; owner: string }>()
      expect(obj.balance).toBe(100)
      expect(obj.owner).toBe('Alice')
    })

    it('should provide bytes data access', () => {
      const state = new TextState(
        'account-1',
        'Object',
        1,
        'test data',
        1,
        Metadata.nullMetadata()
      )

      const projectable = new TextProjectable(state, [], 'Test')

      const bytes = projectable.dataAsBytes()
      expect(bytes).toBeInstanceOf(Uint8Array)

      const decoded = new TextDecoder().decode(bytes)
      expect(decoded).toBe('test data')
    })

    it('should handle empty projectable', () => {
      const projectable = new TextProjectable(null, [], 'Empty')

      expect(projectable.hasObject()).toBe(false)
      expect(projectable.hasEntries()).toBe(false)
      expect(projectable.dataAsText()).toBe('')
      expect(projectable.object()).toEqual({})
      expect(projectable.dataVersion()).toBe(0)
      expect(projectable.dataId()).toBe('')
    })

    it('should provide metadata access', () => {
      const properties = new Map([
        ['key1', 'value1'],
        ['key2', 'value2']
      ])
      const metadata = Metadata.with(properties, 'test-value', 'CREATE')

      const state = new TextState(
        'account-1',
        'Object',
        1,
        'data',
        1,
        metadata
      )

      const projectable = new TextProjectable(state, [], 'Test')

      const metadataStr = projectable.metadata()
      expect(metadataStr).toContain('test-value')
      expect(metadataStr).toContain('CREATE')
    })
  })

  describe('InMemoryConfirmer', () => {
    let confirmer: InMemoryConfirmer
    let projectable: Projectable

    beforeEach(() => {
      confirmer = new TestConfirmer(1000) // 1 second threshold

      const state = new TextState(
        'account-1',
        'Object',
        1,
        'data',
        5,
        Metadata.nullMetadata()
      )
      projectable = new TextProjectable(state, [], 'Test')
    })

    it('should track pending projectables', async () => {
      await confirmer.pending(projectable)

      expect(confirmer.isPending(projectable)).toBe(true)
      expect(confirmer.isConfirmed(projectable)).toBe(false)
      expect(confirmer.pendingCount()).toBe(1)
      expect(confirmer.confirmedCount()).toBe(0)
    })

    it('should confirm projectables', async () => {
      await confirmer.pending(projectable)
      await confirmer.confirm(projectable)

      expect(confirmer.isPending(projectable)).toBe(false)
      expect(confirmer.isConfirmed(projectable)).toBe(true)
      expect(confirmer.pendingCount()).toBe(0)
      expect(confirmer.confirmedCount()).toBe(1)
    })

    it('should not add pending if already confirmed', async () => {
      await confirmer.confirm(projectable)
      await confirmer.pending(projectable)

      expect(confirmer.isPending(projectable)).toBe(false)
      expect(confirmer.isConfirmed(projectable)).toBe(true)
      expect(confirmer.pendingCount()).toBe(0)
    })

    it('should detect unconfirmed projectables after threshold', async () => {
      // Use very short threshold for testing
      const fastConfirmer = new TestConfirmer(10) // 10ms threshold

      await fastConfirmer.pending(projectable)

      // Check immediately - should not be unconfirmed yet
      let unconfirmed = await fastConfirmer.checkUnconfirmed()
      expect(unconfirmed).toHaveLength(0)

      // Wait for threshold to pass
      await new Promise(resolve => setTimeout(resolve, 50))

      // Check again - should be unconfirmed now
      unconfirmed = await fastConfirmer.checkUnconfirmed()
      expect(unconfirmed).toHaveLength(1)
      expect(unconfirmed[0]).toBe(projectable)
    })

    it('should reset all state', async () => {
      await confirmer.pending(projectable)
      await confirmer.confirm(projectable)

      expect(confirmer.confirmedCount()).toBe(1)

      confirmer.reset()

      expect(confirmer.isPending(projectable)).toBe(false)
      expect(confirmer.isConfirmed(projectable)).toBe(false)
      expect(confirmer.pendingCount()).toBe(0)
      expect(confirmer.confirmedCount()).toBe(0)
    })

    it('should handle multiple different projectables', async () => {
      const state1 = new TextState('id-1', 'Object', 1, 'data1', 1, Metadata.nullMetadata())
      const state2 = new TextState('id-2', 'Object', 1, 'data2', 1, Metadata.nullMetadata())
      const state3 = new TextState('id-3', 'Object', 1, 'data3', 1, Metadata.nullMetadata())

      const proj1 = new TextProjectable(state1, [], 'Test')
      const proj2 = new TextProjectable(state2, [], 'Test')
      const proj3 = new TextProjectable(state3, [], 'Test')

      await confirmer.pending(proj1)
      await confirmer.pending(proj2)
      await confirmer.pending(proj3)

      expect(confirmer.pendingCount()).toBe(3)

      await confirmer.confirm(proj1)
      await confirmer.confirm(proj3)

      expect(confirmer.confirmedCount()).toBe(2)
      expect(confirmer.pendingCount()).toBe(1)
      expect(confirmer.isPending(proj2)).toBe(true)
      expect(confirmer.isConfirmed(proj1)).toBe(true)
      expect(confirmer.isConfirmed(proj3)).toBe(true)
    })
  })

  describe('BasicProjectionControl', () => {
    let confirmer: InMemoryConfirmer
    let control: BasicProjectionControl
    let projectable: Projectable

    beforeEach(() => {
      confirmer = new TestConfirmer()

      const state = new TextState(
        'account-1',
        'Object',
        1,
        'data',
        1,
        Metadata.nullMetadata()
      )
      projectable = new TextProjectable(state, [], 'Test')

      control = new BasicProjectionControl(confirmer)
    })

    it('should confirm projection', () => {
      control.confirmProjected(projectable)

      expect(confirmer.isConfirmed(projectable)).toBe(true)
    })

    it('should track errors', () => {
      const error1 = new Error('Test error 1')
      const error2 = new Error('Test error 2')

      control.error(error1)
      control.error(error2)

      expect(control.hasErrors()).toBe(true)
      expect(control.getErrors()).toHaveLength(2)
      expect(control.getErrors()[0]).toBe(error1)
      expect(control.getErrors()[1]).toBe(error2)
    })

    it('should call error handler on error', () => {
      const errors: Error[] = []

      const controlWithHandler = new BasicProjectionControl(
        confirmer,
        (error) => errors.push(error)
      )

      const testError = new Error('Test error')
      controlWithHandler.error(testError)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toBe(testError)
    })

    it('should not have errors initially', () => {
      expect(control.hasErrors()).toBe(false)
      expect(control.getErrors()).toHaveLength(0)
    })
  })

  describe('Projection integration', () => {
    it('should demonstrate full projection workflow', async () => {
      // Setup
      const confirmer = new TestConfirmer()
      const control = new BasicProjectionControl(confirmer)

      // Create projectable from entry (6-arg form: id, type, typeVersion, entryData, streamVersion, metadata)
      const entry = new TextEntry(
        'acc-1',
        'AccountOpened',
        1,
        JSON.stringify({ accountId: 'acc-1', owner: 'Alice', initialBalance: 100 }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const projectable = new TextProjectable(null, [entry], 'AccountOpened')

      // Track as pending
      await confirmer.pending(projectable)

      // Simulate projection
      class TestProjection implements Projection {
        public projected: any[] = []

        async projectWith(
          projectable: Projectable,
          control: ProjectionControl
        ): Promise<void> {
          const entries = projectable.entries()

          for (const entry of entries) {
            const data = JSON.parse(entry.entryData as string)
            this.projected.push(data)
          }

          control.confirmProjected(projectable)
        }
      }

      const projection = new TestProjection()
      await projection.projectWith(projectable, control)

      // Verify
      expect(projection.projected).toHaveLength(1)
      expect(projection.projected[0].accountId).toBe('acc-1')
      expect(projection.projected[0].owner).toBe('Alice')
      expect(confirmer.isConfirmed(projectable)).toBe(true)
      expect(confirmer.isPending(projectable)).toBe(false)
    })

    it('should handle projection errors', async () => {
      const confirmer = new TestConfirmer()
      const control = new BasicProjectionControl(confirmer)

      const entry = new TextEntry(
        'bad-1',
        'BadEvent',
        1,
        'invalid json',
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      const projectable = new TextProjectable(null, [entry], 'BadEvent')

      class FailingProjection implements Projection {
        async projectWith(
          projectable: Projectable,
          control: ProjectionControl
        ): Promise<void> {
          try {
            const entries = projectable.entries()
            // This will fail due to invalid JSON
            JSON.parse(entries[0].entryData as string)
          } catch (error) {
            control.error(error as Error)
            throw error
          }
        }
      }

      const projection = new FailingProjection()

      await expect(projection.projectWith(projectable, control)).rejects.toThrow()
      expect(control.hasErrors()).toBe(true)
      expect(confirmer.isConfirmed(projectable)).toBe(false)
    })
  })
})
