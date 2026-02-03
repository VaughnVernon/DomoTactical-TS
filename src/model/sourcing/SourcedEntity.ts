// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { EntityActor } from '../EntityActor.js'
import { ApplyFailedError, Applicable } from '../ApplyFailedError.js'
import { Source } from '../../store/Source.js'
import { Metadata } from '../../store/Metadata.js'
import { Journal } from '../../store/journal/Journal.js'
import { Result } from '../../store/Result.js'
import { StorageException } from '../../store/StorageException.js'
import { EntryAdapterProvider } from '../../store/EntryAdapterProvider.js'
import { ContextProfile } from '../../store/ContextProfile.js'
import { StateAdapterProvider } from '../../store/StateAdapterProvider.js'
import { State } from '../../store/State.js'

/**
 * Type for source consumer functions that apply sources to entities.
 */
type SourceConsumer<SOURCED, SOURCE> = (entity: SOURCED, source: SOURCE) => void

/**
 * Registry of source consumers for each sourced entity type.
 */
const registeredConsumers = new Map<
  Function,
  Map<Function, SourceConsumer<unknown, Source<unknown>>>
>()

/**
 * Abstract base for all concrete types that support journaling and application of
 * Source<T> instances. Provides abstracted Journal and state transition control.
 *
 * @template T the concrete type that is being sourced
 */
export abstract class SourcedEntity<T> extends EntityActor {
  /** The stream name for this sourced entity */
  protected readonly streamName: string

  /** Current version of the entity's event stream */
  private _currentVersion: number = 0

  /** The journal for persisting sources */
  private _journal: Journal<string> | null = null

  /**
   * Answer the bounded context name for this entity.
   * Default returns 'default'. Override to specify your bounded context.
   */
  protected contextName(): string {
    return 'default'
  }

  /**
   * Answer the journal registration key for this bounded context.
   */
  protected journalKey(): string {
    return `domo-tactical:${this.contextName()}.journal`
  }

  /**
   * Answer the EntryAdapterProvider for this bounded context.
   * Returns the context-specific provider if registered via ContextProfile,
   * otherwise falls back to the global singleton.
   */
  protected entryAdapterProvider(): EntryAdapterProvider {
    const contextName = this.contextName()
    const profile = ContextProfile.get(contextName)
    if (profile) {
      return profile.entryAdapterProvider()
    }
    return EntryAdapterProvider.instance()
  }

  /**
   * Register the means to apply sourceType instances for state transition
   * of sourcedType by means of a given consumer.
   * @param sourcedType the concrete class type to which sourceType instances are applied
   * @param sourceType the concrete class type to apply
   * @param consumer the function used to perform the application of sourceType
   */
  static registerConsumer<SOURCED extends SourcedEntity<unknown>, SOURCE extends Source<unknown>>(
    sourcedType: new (...args: any[]) => SOURCED,
    sourceType: new (...args: any[]) => SOURCE,
    consumer: (entity: SOURCED, source: SOURCE) => void
  ): void {
    let sourcedTypeMap = registeredConsumers.get(sourcedType)

    if (!sourcedTypeMap) {
      sourcedTypeMap = new Map()
      registeredConsumers.set(sourcedType, sourcedTypeMap)
    }

    sourcedTypeMap.set(sourceType, consumer as SourceConsumer<unknown, Source<unknown>>)
  }

  /**
   * Construct my default state using my address as my streamName.
   */
  protected constructor()

  /**
   * Construct my default state.
   * @param streamName the String unique identity of this entity
   */
  protected constructor(streamName: string | null)

  /**
   * Constructor implementation.
   */
  protected constructor(streamName?: string | null) {
    super()
    this.streamName = streamName != null ? streamName : this.address().valueAsString()

    // Automatically retrieve journal from Stage if registered
    try {
      this._journal = this.stage().registeredValue<Journal<string>>(this.journalKey())
    } catch (error) {
      // Journal not registered on Stage yet, will be set manually via setJournal()
    }
  }

  /**
   * Set the journal for this sourced entity.
   * This should be called during initialization.
   * Best for tests or when there are multiple
   * Journal instances in a single context.
   * @param journal the Journal instance
   */
  protected setJournal(journal: Journal<string>): void {
    this._journal = journal
  }

  /**
   * Answer my journal.
   * @returns the Journal instance
   */
  protected journal(): Journal<string> {
    if (!this._journal) {
      throw new Error('Journal not set. Call setJournal() first.')
    }
    return this._journal
  }

  /**
   * Automatically restore state from journal when actor starts.
   * Override and call super.start() if additional initialization is needed.
   */
  override async start(): Promise<void> {
    await this.restore()
  }

  /**
   * Apply all of the given sources to myself, which includes appending
   * them to my journal and reflecting the representative changes to my state.
   * @param sources the list of Source<T> to apply or a single Source<T>
   * @param metadataOrAndThen optional Metadata or callback function
   * @param andThen optional callback function
   */
  protected async apply(
    sources: Source<T> | Source<T>[],
    metadataOrAndThen?: Metadata | (() => Promise<void>),
    andThen?: () => Promise<void>
  ): Promise<void> {
    const sourcesArray = Array.isArray(sources) ? sources : [sources]
    const metadata =
      metadataOrAndThen instanceof Metadata ? metadataOrAndThen : this.metadata()
    const callback =
      typeof metadataOrAndThen === 'function' ? metadataOrAndThen : andThen

    await this.applyInternal(sourcesArray, metadata, callback)
  }

  /**
   * Answer a list of Source<T> from the varargs sources.
   * @param sources the varargs Source<T> of sources to answer as a list
   * @returns Source<T>[]
   */
  protected asList(...sources: Source<T>[]): Source<T>[] {
    return sources
  }

  /**
   * Received after the full asynchronous evaluation of each apply().
   * Override if notification is desired.
   */
  protected async afterApply(): Promise<void> {}

  /**
   * Answer an error that should be thrown and handled by my Supervisor,
   * or null if the error should not be thrown. The default behavior is
   * to return the given exception. Must override to change default behavior.
   * @param error the ApplyFailedError
   * @returns ApplyFailedError or null
   */
  protected async afterApplyFailed(error: ApplyFailedError): Promise<ApplyFailedError | null> {
    return error
  }

  /**
   * Received prior to the evaluation of each apply().
   * The concrete extender may override to implement different or additional behavior.
   * @param sources the list of Source<T> ready to be applied
   */
  protected async beforeApply(sources: Source<T>[]): Promise<void> {
    // Override to be informed prior to apply evaluation
  }

  /**
   * Answer my currentVersion, which if zero indicates that the receiver
   * is being initially constructed or reconstituted.
   * @returns number
   */
  protected currentVersion(): number {
    return this._currentVersion
  }

  /**
   * Answer my Metadata. Must override if Metadata is to be supported.
   * @returns Metadata
   */
  protected metadata(): Metadata {
    return Metadata.nullMetadata()
  }

  /**
   * Answer my next version, which is one greater than my currentVersion.
   * @returns number
   */
  protected nextVersion(): number {
    return this._currentVersion + 1
  }

  /**
   * Restores the initial state of the receiver by means of the snapshot.
   * Must override if snapshots are to be supported.
   * @param snapshot the snapshot holding the initial state
   * @param currentVersion the int current version of the receiver
   */
  protected async restoreSnapshot<SNAPSHOT>(
    snapshot: SNAPSHOT,
    currentVersion: number
  ): Promise<void> {
    // OVERRIDE FOR SNAPSHOT SUPPORT
  }

  /**
   * Answer a valid snapshot state instance if a snapshot should
   * be taken and persisted along with applied Source<T> instance(s).
   * Must override if snapshots are to be supported.
   * @returns SNAPSHOT or null
   */
  protected snapshot<SNAPSHOT>(): SNAPSHOT | null {
    return null
  }

  /**
   * Restore my state from persistence.
   * This is called automatically during actor initialization.
   */
  protected async restore(): Promise<void> {
    if (!this._journal) {
      this.logger().error('Journal not set for SourcedEntity')
      return
    }

    try {
      const reader = await this._journal!.streamReader(this.constructor.name)
      const stream = await reader.streamFor(this.streamName)

      // Restore snapshot if available
      let snapshotVersion = 0
      if (stream.snapshot) {
        await this.restoreSnapshotInternal(stream.snapshot, stream.streamVersion)
        snapshotVersion = this._currentVersion
      }

      // Apply only entries AFTER the snapshot version
      const provider = this.entryAdapterProvider()
      const allSources = provider.asSources(stream.entries)

      // Filter out events at or before snapshot version
      const sourcesToApply = snapshotVersion > 0
        ? allSources.slice(snapshotVersion) // Skip first N events already in snapshot
        : allSources

      await this.restoreFrom(sourcesToApply, stream.streamVersion)
    } catch (error) {
      this.logger().error(`Stream not recovered for: ${this.type()}(${this.streamName})`, error)
      throw new StorageException(Result.Failure, `Stream recovery failed: ${error}`, error as Error)
    }
  }

  /**
   * Internal helper to adapt raw State<unknown> to concrete SNAPSHOT type
   * and call the protected restoreSnapshot() method.
   * @param rawSnapshot the raw State from the journal
   * @param streamVersion the version of the stream at which the snapshot was taken
   */
  private async restoreSnapshotInternal(rawSnapshot: State<unknown>, streamVersion: number): Promise<void> {
    if (!rawSnapshot || rawSnapshot.isEmpty()) {
      return
    }

    // Use StateAdapterProvider to convert raw State → concrete snapshot type
    const provider = StateAdapterProvider.instance()
    const snapshot = provider.fromRawState(rawSnapshot, rawSnapshot.type)

    // Call the protected overridable method with the stream version
    await this.restoreSnapshot(snapshot, streamVersion)

    // Set the current version after snapshot restoration
    this._currentVersion = streamVersion
  }

  /**
   * Internal apply implementation.
   */
  private async applyInternal(
    sources: Source<T>[],
    metadata: Metadata,
    andThen?: () => Promise<void>
  ): Promise<void> {
    await this.beforeApply(sources)

    if (!this._journal) {
      throw new Error('Journal not set for SourcedEntity')
    }

    const snapshot = this.snapshot()

    try {
      const result = snapshot
        ? await this._journal!.appendAllWith(this.streamName, this.nextVersion(), sources, metadata, snapshot)
        : await this._journal!.appendAll(this.streamName, this.nextVersion(), sources, metadata)

      if (result.isSuccess()) {
        // Apply sources to update local state
        for (const source of sources) {
          this.applySource(source)
          ++this._currentVersion
        }

        await this.afterApply()

        if (andThen) {
          await andThen()
        }
      } else {
        const applicable = new Applicable(snapshot ?? null, sources, metadata)
        const message = `Source (count ${sources.length}) not appended for: ${this.type()}(${this.streamName})`
        const error = new ApplyFailedError(applicable, message)
        const maybeError = await this.afterApplyFailed(error)

        if (maybeError) {
          this.logger().error(message, maybeError)
          throw maybeError
        }
      }
    } catch (error) {
      const applicable = new Applicable(snapshot ?? null, sources, metadata)
      const message = `Source append failed for: ${this.type()}(${this.streamName})`
      const applyError = new ApplyFailedError(applicable, message, error as Error)
      const maybeError = await this.afterApplyFailed(applyError)

      if (maybeError) {
        this.logger().error(message, maybeError)
        throw maybeError
      }
    }
  }

  /**
   * Apply an individual source onto my concrete extender by means of
   * the consumer registered for its type.
   */
  private applySource(source: Source<unknown>): void {
    let type: Function | null = this.constructor

    while (type && type !== SourcedEntity) {
      const sourcedTypeMap = registeredConsumers.get(type)

      if (sourcedTypeMap) {
        const consumer = sourcedTypeMap.get(source.constructor)
        if (consumer) {
          consumer(this, source)
          return
        }
      }

      type = Object.getPrototypeOf(type)
    }

    throw new Error(`No consumer registered for source type: ${source.constructor.name}`)
  }

  /**
   * Restore the state from a stream of sources.
   */
  private async restoreFrom(stream: Source<unknown>[], currentVersion: number): Promise<void> {
    for (const source of stream) {
      this.applySource(source)
    }

    this._currentVersion = currentVersion
  }
}
