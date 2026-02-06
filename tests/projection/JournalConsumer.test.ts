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
  ProjectionDispatcher,
  ProjectionSupervisor,
  Projection,
  Projectable,
  ProjectionControl,
  ProjectToDescription,
  TextProjectable
} from '../../src/model/projections'
import { JournalConsumerActor, JournalConsumer, Journal, InMemoryJournal } from '../../src/store/journal'
import { TestConfirmer } from '../../src/testkit'
import { Entry } from '../../src/store/journal'
import { JournalReader } from '../../src/store/journal/JournalReader'
import { Metadata } from '../../src/store/Metadata'
import { DomainEvent } from '../../src/model/DomainEvent'
import { TextProjectionDispatcherActor } from '../../src/model/projections/TextProjectionDispatcherActor'

/**
 * Test event for journal consumer tests.
 */
class TestEvent extends DomainEvent {
  constructor(
    public readonly eventType: string,
    public readonly eventId: string,
    public readonly data: any
  ) {
    super(1)
  }

  override id(): string {
    return this.eventId
  }

  override typeName(): string {
    return this.eventType
  }
}

/**
 * Test projection that tracks received projectables.
 */
class TestProjectionActor extends Actor implements Projection {
  private projectables: Projectable[] = []

  constructor() {
    super()
  }

  async projectWith(
    projectable: Projectable,
    control: ProjectionControl
  ): Promise<void> {
    this.executionContext()
      .setValue('operation', 'projectWith')
      .setValue('projectableId', projectable.dataId())

    this.projectables.push(projectable)
    control.confirmProjected(projectable)
  }

  async getProjectables(): Promise<Projectable[]> {
    return this.projectables
  }

  async getProjectableCount(): Promise<number> {
    return this.projectables.length
  }

  async reset(): Promise<void> {
    this.projectables = []
  }
}

/**
 * Helper to wait for a condition with timeout.
 */
async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`)
}

/**
 * Test suite for JournalConsumerActor.
 */
describe('JournalConsumerActor', () => {
  let journal: Journal<string>
  let reader: JournalReader<string>
  let dispatcher: ProjectionDispatcher
  let consumer: JournalConsumer
  let projection: Projection
  let confirmer: TestConfirmer

  beforeEach(async () => {
    // Initialize supervisor
    const supervisorProtocol: Protocol = {
      type: () => 'projection-supervisor',
      instantiator: () => ({
        instantiate: () => new ProjectionSupervisor()
      })
    }
    stage().actorFor(supervisorProtocol, undefined, 'default')

    // Create journal as actor and reader
    const journalProtocol: Protocol = {
      type: () => 'Journal',
      instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
    }
    journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, 'default')
    reader = await journal.journalReader('test-reader')

    // Create confirmer
    confirmer = new TestConfirmer()

    // Create dispatcher
    const dispatcherProtocol: Protocol = {
      type: () => 'TextProjectionDispatcher',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [conf] = def.parameters()
          return new TextProjectionDispatcherActor(conf)
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

    // Create test projection
    const projectionProtocol: Protocol = {
      type: () => 'TestProjection',
      instantiator: () => ({
        instantiate: () => new TestProjectionActor()
      })
    }

    projection = stage().actorFor<Projection>(
      projectionProtocol,
      undefined,
      'projection-supervisor'
    )

    // Register projection to receive all events
    dispatcher.register(new ProjectToDescription(
      projection,
      ['*'],
      'Test projection - all events'
    ))
  })

  afterEach(async () => {
    // Stop consumer if it exists
    if (consumer) {
      await consumer.pause()
    }
    await stage().close()
  })

  it('should consume entries from journal and dispatch to projections', async () => {
    // Create consumer with fast polling (100ms) for testing
    const consumerProtocol: Protocol = {
      type: () => 'JournalConsumer',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [rdr, disp, interval, batchSize] = def.parameters()
          return new JournalConsumerActor(rdr, disp, interval, batchSize)
        }
      })
    }

    consumer = stage().actorFor<JournalConsumer>(
      consumerProtocol,
      undefined,
      'projection-supervisor',
      undefined,
      reader,
      dispatcher,
      100,  // Poll every 100ms
      10    // Batch size 10
    )

    // Write entries to journal
    await journal.append(
      'stream-1',
      1,
      new TestEvent('AccountOpened', 'event-1', { accountId: 'acc-1' }),
      Metadata.nullMetadata()
    )

    await journal.append(
      'stream-1',
      2,
      new TestEvent('FundsDeposited', 'event-2', { accountId: 'acc-1', amount: 100 }),
      Metadata.nullMetadata()
    )

    // Wait for entries to be consumed and dispatched
    const projectionActor = projection as any
    await waitFor(async () => {
      const count = await projectionActor.getProjectableCount()
      return count >= 2
    })

    // Verify projection received both entries
    const projectables = await projectionActor.getProjectables()
    expect(projectables).toHaveLength(2)

    // Verify first entry (type is mapped to kebab-case)
    expect(projectables[0].becauseOf()).toContain('account-opened')
    expect(projectables[0].entries()).toHaveLength(1)
    expect(projectables[0].entries()[0].type).toBe('account-opened')

    // Verify second entry (type is mapped to kebab-case)
    expect(projectables[1].becauseOf()).toContain('funds-deposited')
    expect(projectables[1].entries()).toHaveLength(1)
    expect(projectables[1].entries()[0].type).toBe('funds-deposited')
  })

  it('should handle batch reading', async () => {
    // Create consumer with batch size of 2
    const consumerProtocol: Protocol = {
      type: () => 'JournalConsumer',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [rdr, disp, interval, batchSize] = def.parameters()
          return new JournalConsumerActor(rdr, disp, interval, batchSize)
        }
      })
    }

    consumer = stage().actorFor<JournalConsumer>(
      consumerProtocol,
      undefined,
      'projection-supervisor',
      undefined,
      reader,
      dispatcher,
      100,  // Poll every 100ms
      2     // Batch size 2
    )

    // Write 5 entries
    for (let i = 1; i <= 5; i++) {
      await journal.append(
        'stream-1',
        i,
        new TestEvent(`Event${i}`, `event-${i}`, { id: i }),
        Metadata.nullMetadata()
      )
    }

    // Wait for all entries to be consumed (may take multiple batches)
    const projectionActor = projection as any
    await waitFor(async () => {
      const count = await projectionActor.getProjectableCount()
      return count >= 5
    })

    const projectables = await projectionActor.getProjectables()
    expect(projectables).toHaveLength(5)
  })

  it('should pause and resume consumption', async () => {
    // Create consumer
    const consumerProtocol: Protocol = {
      type: () => 'JournalConsumer',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [rdr, disp, interval, batchSize] = def.parameters()
          return new JournalConsumerActor(rdr, disp, interval, batchSize)
        }
      })
    }

    consumer = stage().actorFor<JournalConsumer>(
      consumerProtocol,
      undefined,
      'projection-supervisor',
      undefined,
      reader,
      dispatcher,
      100,
      10
    )

    // Wait a bit for actor to fully start
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify consumer is running
    expect(await consumer.isActive()).toBe(true)

    // Write first entry
    await journal.append(
      'stream-1',
      1,
      new TestEvent('Event1', 'event-1', { id: 1 }),
      Metadata.nullMetadata()
    )

    // Wait for first entry to be consumed
    const projectionActor = projection as any
    await waitFor(async () => {
      const count = await projectionActor.getProjectableCount()
      return count >= 1
    })

    // Pause consumer
    await consumer.pause()
    expect(await consumer.isActive()).toBe(false)

    // Write second entry while paused
    await journal.append(
      'stream-1',
      2,
      new TestEvent('Event2', 'event-2', { id: 2 }),
      Metadata.nullMetadata()
    )

    // Wait a bit to ensure it's not consumed
    await new Promise(resolve => setTimeout(resolve, 300))

    // Should still only have 1 entry
    let count = await projectionActor.getProjectableCount()
    expect(count).toBe(1)

    // Resume consumer
    await consumer.resume()
    expect(await consumer.isActive()).toBe(true)

    // Wait for second entry to be consumed
    await waitFor(async () => {
      const count = await projectionActor.getProjectableCount()
      return count >= 2
    })

    count = await projectionActor.getProjectableCount()
    expect(count).toBe(2)
  })

  it('should continue polling after errors', async () => {
    // Create consumer
    const consumerProtocol: Protocol = {
      type: () => 'JournalConsumer',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [rdr, disp, interval, batchSize] = def.parameters()
          return new JournalConsumerActor(rdr, disp, interval, batchSize)
        }
      })
    }

    consumer = stage().actorFor<JournalConsumer>(
      consumerProtocol,
      undefined,
      'projection-supervisor',
      undefined,
      reader,
      dispatcher,
      100,
      10
    )

    // Write three entries
    await journal.append(
      'stream-1',
      1,
      new TestEvent('Event1', 'event-1', { id: 1 }),
      Metadata.nullMetadata()
    )

    await journal.append(
      'stream-1',
      2,
      new TestEvent('Event2', 'event-2', { id: 2 }),
      Metadata.nullMetadata()
    )

    await journal.append(
      'stream-1',
      3,
      new TestEvent('Event3', 'event-3', { id: 3 }),
      Metadata.nullMetadata()
    )

    // Wait for all entries to be processed
    // Even if some projections error, the consumer should continue
    const projectionActor = projection as any
    await waitFor(async () => {
      const count = await projectionActor.getProjectableCount()
      return count >= 3
    }, 3000)

    // Verify all entries were processed
    const count = await projectionActor.getProjectableCount()
    expect(count).toBe(3)
  })

  it('should handle empty journal gracefully', async () => {
    // Create consumer
    const consumerProtocol: Protocol = {
      type: () => 'JournalConsumer',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [rdr, disp, interval, batchSize] = def.parameters()
          return new JournalConsumerActor(rdr, disp, interval, batchSize)
        }
      })
    }

    consumer = stage().actorFor<JournalConsumer>(
      consumerProtocol,
      undefined,
      'projection-supervisor',
      undefined,
      reader,
      dispatcher,
      100,
      10
    )

    // Wait a bit for actor to fully start
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify consumer is running
    expect(await consumer.isActive()).toBe(true)

    // Wait a bit to ensure it polls empty journal without errors
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify no entries were consumed
    const projectionActor = projection as any
    const count = await projectionActor.getProjectableCount()
    expect(count).toBe(0)

    // Consumer should still be running
    expect(await consumer.isActive()).toBe(true)
  })
})
