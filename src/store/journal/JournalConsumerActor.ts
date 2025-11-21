// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor } from 'domo-actors'
import { JournalReader } from './JournalReader'
import { Entry } from './Entry'
import { ProjectionDispatcher } from '../../model/projections/ProjectionDispatcher'
import { Projectable } from '../../model/projections/Projectable'
import { TextProjectable } from '../../model/projections/Projectable'

/**
 * Actor that periodically reads from a Journal and dispatches entries to projections.
 *
 * The JournalConsumerActor bridges the write side (Journal) and read side (Projections)
 * in a CQRS architecture:
 *
 * 1. Uses a timer to periodically poll the Journal for new entries
 * 2. Reads entries in configurable batches for efficiency
 * 3. Converts Journal entries to Projectables
 * 4. Dispatches to the ProjectionDispatcher for routing to projections
 *
 * This simple timer-based approach is suitable for:
 * - Development and testing
 * - Low to medium throughput scenarios
 * - Systems where slight delay in projection updates is acceptable
 *
 * For high-throughput or real-time requirements, consider a reactive stream-based
 * consumer with backpressure support (future enhancement).
 *
 * @example
 * ```typescript
 * // Create journal and reader
 * const journal = new InMemoryJournal()
 * const reader = journal.streamReader('projection-stream')
 *
 * // Create dispatcher
 * const dispatcher = stage().actorFor<ProjectionDispatcher>(...)
 *
 * // Create consumer protocol
 * const consumerProtocol: Protocol = {
 *   type: () => 'JournalConsumer',
 *   instantiator: () => ({
 *     instantiate: (def: Definition) => {
 *       const [reader, dispatcher, interval, batchSize] = def.parameters()
 *       return new JournalConsumerActor(reader, dispatcher, interval, batchSize)
 *     }
 *   })
 * }
 *
 * // Start consumer
 * const consumer = stage().actorFor<JournalConsumer>(
 *   consumerProtocol,
 *   undefined,
 *   'projection-supervisor',
 *   undefined,
 *   reader,
 *   dispatcher,
 *   1000,  // Poll every 1 second
 *   100    // Read 100 entries per batch
 * )
 * ```
 */
export class JournalConsumerActor extends Actor {
  private readonly reader: JournalReader<string>
  private readonly dispatcher: ProjectionDispatcher
  private readonly intervalMs: number
  private readonly batchSize: number
  private isRunning: boolean = false

  /**
   * Construct a JournalConsumerActor.
   *
   * @param reader the JournalReader to read entries from
   * @param dispatcher the ProjectionDispatcher to send Projectables to
   * @param intervalMs polling interval in milliseconds (default: 1000ms)
   * @param batchSize number of entries to read per poll (default: 100)
   */
  constructor(
    reader: JournalReader<string>,
    dispatcher: ProjectionDispatcher,
    intervalMs: number = 100,
    batchSize: number = 100
  ) {
    super()
    this.reader = reader
    this.dispatcher = dispatcher
    this.intervalMs = intervalMs
    this.batchSize = batchSize
  }

  /**
   * Lifecycle hook called before Actor starts.
   * Schedules the periodic journal reading.
   */
  async beforeStart(): Promise<void> {
    await super.beforeStart()
    this.isRunning = true

    // Schedule periodic reading using Actor scheduler
    // Note: domo-actors scheduler API may differ - this follows the pattern
    // from the planning document
    this.scheduleNext()
  }

  /**
   * Lifecycle hook called before Actor stops.
   * Stops the periodic reading.
   */
  async beforeStop(): Promise<void> {
    this.isRunning = false
    await super.beforeStop()
  }

  /**
   * Schedule the next read operation.
   * This is called initially and after each successful read.
   */
  private scheduleNext(): void {
    if (!this.isRunning) {
      return
    }

    // Schedule next read after intervalMs
    setTimeout(() => {
      if (this.isRunning) {
        this.readAndDispatch().catch(error => {
          console.error('Error in journal consumer read cycle:', error)
          // Continue polling even after errors
          this.scheduleNext()
        })
      }
    }, this.intervalMs)
  }

  /**
   * Read a batch of entries from the journal and dispatch them.
   * This is the core polling loop.
   *
   * Errors are handled by supervision - if a dispatch fails, the supervisor
   * will apply the appropriate directive (Resume, Restart, etc.).
   */
  private async readAndDispatch(): Promise<void> {
    // Set execution context for supervision
    this.executionContext()
      .setValue('operation', 'readAndDispatch')
      .setValue('batchSize', this.batchSize.toString())

    // Read next batch of entries
    const entries = await this.reader.readNext(this.batchSize)

    if (entries.length === 0) {
      // No new entries - schedule next poll
      this.scheduleNext()
      return
    }

    // Convert and dispatch each entry
    for (const entry of entries) {
      const projectable = this.toProjectable(entry)

      // Dispatch to projections
      // Errors will be caught by Actor supervision
      await this.dispatcher.dispatch(projectable)
    }

    // Schedule next poll
    this.scheduleNext()
  }

  /**
   * Convert a Journal entry to a Projectable.
   *
   * This implementation creates a TextProjectable with the entry type
   * as the "becauseOf" reason. Subclasses can override this to customize
   * the conversion logic.
   *
   * @param entry the journal entry to convert
   * @returns Projectable the projectable for dispatching
   */
  protected toProjectable(entry: Entry<string>): Projectable {
    // Create a TextProjectable with:
    // - null state (projections work with entries, not state snapshots)
    // - single entry in array
    // - entry type as the reason (for pattern matching)
    return new TextProjectable(null, [entry], entry.type)
  }

  /**
   * Message handler to pause the consumer.
   * Useful for testing or manual control.
   */
  async pause(): Promise<void> {
    this.isRunning = false
  }

  /**
   * Message handler to resume the consumer.
   * Useful for testing or manual control.
   */
  async resume(): Promise<void> {
    if (!this.isRunning) {
      this.isRunning = true
      this.scheduleNext()
    }
  }

  /**
   * Message handler to check if consumer is running.
   * Useful for testing and monitoring.
   *
   * @returns Promise<boolean> true if running
   */
  async isActive(): Promise<boolean> {
    return this.isRunning
  }
}

/**
 * Protocol interface for JournalConsumer messages.
 * Defines the public API for controlling the journal consumer.
 */
export interface JournalConsumer {
  /**
   * Pause journal consumption.
   * The consumer will stop polling until resumed.
   */
  pause(): Promise<void>

  /**
   * Resume journal consumption.
   * The consumer will start polling again.
   */
  resume(): Promise<void>

  /**
   * Check if consumer is actively polling.
   *
   * @returns Promise<boolean> true if consumer is running
   */
  isActive(): Promise<boolean>
}
