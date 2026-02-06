# DomoTactical-TS Documentation ✅

**DomoTactical-TS** is a comprehensive TypeScript implementation of Domain-Driven Design (DDD) tactical patterns based on the VLINGO/XOOM Lattice library. It provides DDD-friendly tactical modeling tools and CQRS/Event Sourcing abstractions built on the DomoActors actor model.

## Project Overview

DomoTactical-TS provides an implementation of the following DDD-friendly:

**Write Side (Command/Event Sourcing)**
- **Event Sourcing** - Persist entity state as domain events with full history
- **Command Sourcing** - Alternative sourcing strategy using commands
- **Journal Storage** - Append-only event/command streams with snapshots
- **Schema Evolution** - Versioned events with custom adapters

**Query Model (CQRS Projections / Read Side)**
- **Projection Pipeline** - Build query models from event/command streams
- **Document Store** - Key-value storage for documents, query models, and serialized state with type-safe operations
- **Pattern Matching** - Route events to projections by type patterns
- **Journal Consumers** - Continuous polling with batch processing
- **Confirmation Tracking** - At-least-once delivery guarantees

**Infrastructure**
- **Actor-Based Entities** - Built on DomoActors for concurrency and fault tolerance
- **Type-Safe APIs** - Full TypeScript type safety throughout
- **Zero Dependencies** - Pure V8 JavaScript, runs anywhere
- **Test Utilities** - Complete testkit with in-memory implementations

## Getting Started

```bash
# Install
npm install domo-tactical domo-actors

# Import core types
import { EventSourcedEntity, DomainEvent } from 'domo-tactical'

# Import test utilities
import { TestJournal, TestDocumentStore } from 'domo-tactical/testkit'

// Create your domain model!
```

### Quick Example

See the [Usage Examples](#usage-examples) section below for complete working code, or check out the [Bank Example](../examples/bank/bank.ts) for a full CQRS pipeline with projections.

## Project Structure

```
DomoTactical-TS/
├── src/
│   ├── store/                      # Storage module (persistence)
│   │   ├── journal/                # Event/Command streams
│   │   │   ├── inmemory/
│   │   │   │   ├── InMemoryJournal.ts
│   │   │   │   └── InMemoryJournalReader.ts
│   │   │   ├── Entry.ts
│   │   │   ├── EntryAdapter.ts
│   │   │   ├── EntryAdapterProvider.ts
│   │   │   ├── EntityStream.ts
│   │   │   ├── Journal.ts
│   │   │   ├── JournalReader.ts
│   │   │   ├── JournalConsumerActor.ts
│   │   │   ├── AppendResult.ts
│   │   │   ├── Outcome.ts
│   │   │   ├── StreamState.ts
│   │   │   ├── StreamInfo.ts
│   │   │   ├── TombstoneResult.ts
│   │   │   ├── DeleteResult.ts
│   │   │   ├── TruncateResult.ts
│   │   │   └── index.ts
│   │   ├── document/               # Document/key-value storage
│   │   │   ├── inmemory/
│   │   │   │   └── InMemoryDocumentStore.ts
│   │   │   ├── DocumentStore.ts
│   │   │   ├── DocumentBundle.ts
│   │   │   └── index.ts
│   │   ├── Source.ts
│   │   ├── Metadata.ts
│   │   ├── State.ts
│   │   ├── Result.ts
│   │   ├── StorageException.ts
│   │   └── index.ts
│   ├── model/                      # Domain model module
│   │   ├── sourcing/               # Event/Command sourcing
│   │   │   ├── SourcedEntity.ts
│   │   │   ├── EventSourcedEntity.ts
│   │   │   ├── CommandSourcedEntity.ts
│   │   │   ├── ContextualEntity.ts   # Context factory functions
│   │   │   └── index.ts
│   │   ├── projections/            # CQRS projection pipeline
│   │   │   ├── Projectable.ts
│   │   │   ├── Projection.ts
│   │   │   ├── ProjectionControl.ts
│   │   │   ├── Confirmer.ts
│   │   │   ├── ProjectionDispatcher.ts
│   │   │   ├── ProjectionSupervisor.ts
│   │   │   ├── MatchableProjections.ts
│   │   │   └── index.ts
│   │   ├── Command.ts
│   │   ├── DomainEvent.ts
│   │   ├── IdentifiedCommand.ts
│   │   ├── IdentifiedDomainEvent.ts
│   │   ├── EntityActor.ts
│   │   ├── ApplyFailedError.ts
│   │   └── index.ts
│   ├── testkit/                    # Test utilities
│   │   ├── TestConfirmer.ts
│   │   ├── TestJournalSupervisor.ts  # Custom supervisor for error tracking
│   │   └── index.ts
│   └── index.ts
├── tests/                          # Test suites
│   ├── store/
│   │   ├── journal/
│   │   ├── document/
│   │   └── adapters/
│   ├── projection/
│   ├── model/
│   └── fixtures/
├── examples/                       # Working examples
│   └── bank/
│       └── bank.ts
├── docs/
│   ├── DomoTactical.md
│   └── api/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── tsconfig.test.json
├── vitest.config.ts
└── typedoc.json
```

## Key Components

The components provided include domain modeling tools and storage mechanisms (currently limited to event and command sourcing).

### Domain Modeling Components (`/src/model/`)

The model module provides domain modeling primitives.

#### **Command.ts**
Abstract base for commands (intentions to change state).

```typescript
export abstract class Command extends Source<Command> {
  protected constructor(commandTypeVersion: number = 1)
}
```

#### **DomainEvent.ts**
Abstract base for domain events (facts that occurred).

```typescript
export abstract class DomainEvent extends Source<DomainEvent> {
  protected constructor(eventTypeVersion: number = 1)
}
```

#### **IdentifiedCommand.ts** and **IdentifiedDomainEvent.ts**
Commands and events with identity support.

```typescript
export abstract class IdentifiedCommand extends Command {
  abstract identity(): string
}

export abstract class IdentifiedDomainEvent extends DomainEvent {
  abstract identity(): string
  parentIdentity(): string  // Optional parent identity
}
```

#### **EntityActor.ts**
Actor base for all entity types (extends DomoActors).

```typescript
export abstract class EntityActor extends Actor {
  protected abstract restore(): Promise<void>
}
```

#### **ApplyFailedError.ts**
Error type for failed source application, providing context about what was being applied when the failure occurred.

```typescript
export class Applicable<T> {
  constructor(
    public readonly state: T | null,
    public readonly sources: Source<unknown>[],
    public readonly metadata: Metadata
  )
}

export class ApplyFailedError extends Error {
  public readonly applicable: Applicable<unknown>
}
```

When a `SourcedEntity` fails to apply sources (e.g., journal append fails), it creates an `Applicable` instance containing:
- **state**: The current snapshot state of the entity (or `null` if no snapshot exists)
- **sources**: The sources that failed to be applied
- **metadata**: The metadata associated with the operation

This context is wrapped in an `ApplyFailedError` and passed to the `afterApplyFailed()` hook:

```typescript
// Inside SourcedEntity.applyInternal():
const snapshot = this.snapshot()

try {
  const result = await this._journal.appendAll(this.streamName, this.nextVersion(), sources, metadata)

  if (!result.isSuccess()) {
    const applicable = new Applicable(snapshot ?? null, sources, metadata)
    const error = new ApplyFailedError(applicable, `Source not appended for: ${this.type()}`)
    await this.afterApplyFailed(error)
  }
} catch (error) {
  const applicable = new Applicable(snapshot ?? null, sources, metadata)
  const applyError = new ApplyFailedError(applicable, `Source append failed`, error as Error)
  await this.afterApplyFailed(applyError)
}
```

You can override `afterApplyFailed()` in your entity to handle failures:

```typescript
class Order extends EventSourcedEntity<OrderState> {
  protected async afterApplyFailed(error: ApplyFailedError): Promise<Error | undefined> {
    // Access the snapshot state at time of failure
    const state = error.applicable.state as OrderState | null

    // Access the sources that failed to apply
    const sources = error.applicable.sources

    // Log, retry, compensate, or rethrow
    this.logger().warn(`Failed to apply ${sources.length} sources`, { state })

    return error // Return to propagate, undefined to suppress
  }
}
```

**Recommended: Use a Custom Supervisor**

While overriding `afterApplyFailed()` works for simple cases, a better approach is to create a custom Supervisor. Supervisors provide centralized error handling following the "let it crash" philosophy, allowing your entities to remain focused on business logic while the supervisor handles failure recovery across all supervised actors.

DomoTactical provides two built-in supervisors: `DefaultJournalSupervisor` (documented in the Journal module) for event/command sourced entities, and `DefaultDocumentStoreSupervisor` (documented in the Document Store module) for document-backed actors. You can also create your own by extending `DefaultSupervisor` from `domo-actors`.

### Sourcing Module (`/src/model/sourcing/`)

The sourcing module provides event/command sourcing entity base classes.

#### **SourcedEntity.ts**
Complex base class for all sourced entities.

**Key Features:**
- Journal integration
- Source application via registered consumers
- Snapshot support
- State restoration from streams
- Async apply methods with optional callbacks
- Before/after apply hooks
- Version tracking
- Metadata support

```typescript
export abstract class SourcedEntity<T> extends EntityActor {
  protected readonly streamName: string

  // Context support
  protected contextName(): string          // Override to specify context (default: 'default')
  protected journalKey(): string           // Returns 'domo-tactical:<contextName>.journal'

  // Register source consumers for state transitions
  static registerConsumer<SOURCED, SOURCE>(
    sourcedType: new (...args: any[]) => SOURCED,
    sourceType: new (...args: any[]) => SOURCE,
    consumer: (entity: SOURCED, source: SOURCE) => void
  ): void

  // Apply sources (single or multiple)
  protected async apply(
    sources: Source<T> | Source<T>[],
    metadataOrAndThen?: Metadata | (() => Promise<void>),
    andThen?: () => Promise<void>
  ): Promise<void>

  // Lifecycle hooks
  protected async beforeApply(sources: Source<T>[]): Promise<void>
  protected async afterApply(): Promise<void>
  protected async afterApplyFailed(error: ApplyFailedError): Promise<ApplyFailedError | null>

  // Snapshot support
  protected async restoreSnapshot<SNAPSHOT>(snapshot: SNAPSHOT, currentVersion: number): Promise<void>
  protected snapshot<SNAPSHOT>(): SNAPSHOT | null

  // State access
  protected currentVersion(): number
  protected nextVersion(): number
  protected metadata(): Metadata
}
```

#### **EventSourcedEntity.ts**
Specialization for domain event sourcing.

```typescript
export abstract class EventSourcedEntity extends SourcedEntity<DomainEvent> {
  protected constructor(streamName?: string)
}
```

#### **CommandSourcedEntity.ts**
Specialization for command sourcing.

```typescript
export abstract class CommandSourcedEntity extends SourcedEntity<Command> {
  protected constructor(streamName?: string)
}
```

### Storage Components (`/src/store/`)

The store components provide the persistence abstraction for sources and states.

#### **Source.ts**
Abstract base class for all sources of truth (events and commands).

**Key Features:**
- Immutable with timestamp and type version
- Null object pattern support
- Equality based on ID
- Helper methods for collections

```typescript
export abstract class Source<T> {
  public readonly dateTimeSourced: number
  public readonly sourceTypeVersion: number

  id(): string
  isNull(): boolean
  typeName(): string
  equals(other: unknown): boolean
}
```

#### **Metadata.ts**
Metadata associated with Sources and States.

**Key Features:**
- Key-value properties map
- Operation and value fields
- Immutable design
- Factory methods for common patterns

```typescript
export class Metadata {
  public readonly properties: ReadonlyMap<string, string>
  public readonly operation: string
  public readonly value: string

  static nullMetadata(): Metadata
  static withProperties(properties: Map<string, string>): Metadata
  static with(value: string, operation: string): Metadata
}
```

#### **State.ts**
State persistence with three concrete implementations.

**Key Features:**
- Abstract base with common behavior
- Three variants: Binary, Text, Object
- Snapshot support for event sourcing
- Version tracking

```typescript
export abstract class State<T> {
  public readonly id: string
  public readonly data: T
  public readonly dataVersion: number
  public readonly metadata: Metadata
  public readonly type: string
  public readonly typeVersion: number
}

export class BinaryState extends State<Uint8Array>
export class TextState extends State<string>
export class ObjectState<T> extends State<T>
```

#### **Result.ts** and **StorageException.ts**
Storage operation result types and error handling.

```typescript
export enum Result {
  Success,
  Failure,
  Error,
  ConcurrencyViolation,
  NotFound,
  NotAllFound,
  NoTypeStore,       // The document type/category itself doesn't exist
  StreamDeleted      // Stream was tombstoned (hard deleted)
}

export class StorageException extends Error {
  public readonly result: Result
}
```

### Journal Components (`/src/store/journal/`)

The journal components provide event/command stream persistence.

#### **Journal.ts**
Async journal interface for appending sources and reading streams.

**Key Features:**
- Promise-based async operations
- AppendResult return type (no callbacks!)
- Support for single and batch appends
- Optional snapshot persistence
- Stream reader access

```typescript
export interface Journal<T> {
  append<S, ST>(
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    metadata: Metadata
  ): Promise<AppendResult<S, ST>>

  appendWith<S, ST>(
    streamName: string,
    streamVersion: number,
    source: Source<S>,
    metadata: Metadata,
    snapshot: ST
  ): Promise<AppendResult<S, ST>>

  appendAll<S, ST>(
    streamName: string,
    fromStreamVersion: number,
    sources: Source<S>[],
    metadata: Metadata
  ): Promise<AppendResult<S, ST>>

  appendAllWith<S, ST>(
    streamName: string,
    fromStreamVersion: number,
    sources: Source<S>[],
    metadata: Metadata,
    snapshot: ST
  ): Promise<AppendResult<S, ST>>

  streamReader(name: string): Promise<StreamReader<T>>

  // Stream Lifecycle Management
  tombstone(streamName: string): Promise<TombstoneResult>
  softDelete(streamName: string): Promise<DeleteResult>
  truncateBefore(streamName: string, beforeVersion: number): Promise<TruncateResult>
  streamInfo(streamName: string): Promise<StreamInfo>
}
```

#### **Stream Lifecycle Management**

The Journal interface provides stream lifecycle operations based on EventStoreDB/KurrentDB patterns.

**Tombstone (Hard Delete):**
```typescript
// Permanently delete a stream - cannot be reopened
const result = await journal.tombstone('user-123')
if (result.isSuccess()) {
  console.log(`Stream permanently deleted at position ${result.journalPosition}`)
}
// Subsequent appends will fail with Result.StreamDeleted
// Reads will return EntryStream with isTombstoned=true
```

**Soft Delete:**
```typescript
// Mark stream as deleted, can be reopened
const result = await journal.softDelete('order-456')

// Events become invisible to reads
const stream = await reader.streamFor('order-456')
// stream.isSoftDeleted === true, stream.entries === []

// Reopen by appending (version continues from where it left off)
await journal.append('order-456', nextVersion, newEvent, metadata)
```

**Truncate Before:**
```typescript
// Hide events before a version (similar to EventStoreDB's $tb)
await journal.truncateBefore('account-789', 100)

// Subsequent reads only return events from version 100 onwards
const stream = await reader.streamFor('account-789')
// Only events with version >= 100 are included
```

**Stream Info:**
```typescript
const info = await journal.streamInfo('stream-name')

if (!info.exists) {
  console.log('Stream does not exist')
} else if (info.isTombstoned) {
  console.log('Stream has been permanently deleted')
} else if (info.isSoftDeleted) {
  console.log('Stream is soft-deleted but can be reopened')
} else {
  console.log(`Stream at version ${info.currentVersion}`)
  console.log(`Visible entries: ${info.entryCount}`)
  console.log(`Truncated before: ${info.truncateBefore}`)
}
```

#### **Stream Evolution Patterns**

As domain models evolve, you may need to restructure how events are organized into streams. Two common patterns are **stream branching** (splitting one stream into multiple) and **stream merging** (combining multiple streams into one).

##### Stream Branching (Splitting)

Splitting occurs when a single aggregate needs to become multiple aggregates. For example, splitting a monolithic `Customer` stream into separate `CustomerProfile` and `CustomerBilling` streams.

**Pattern 1: Soft Delete + Replay with Linking Events**

```typescript
// Information about each new stream created from the split
interface SplitTarget {
  streamName: string
  eventCount: number      // How many events were replayed to this stream
  firstVersion: number    // Starting version in new stream
  lastVersion: number     // Ending version in new stream
}

// Domain event to mark the split point in the ORIGINAL stream
class StreamSplit extends DomainEvent {
  constructor(
    public readonly sourceStreamName: string,
    public readonly sourceStreamVersion: number,  // Version at which split occurred
    public readonly targets: SplitTarget[],       // All new streams created
    public readonly splitReason: string,
    public readonly splitAt: Date = new Date()
  ) { super() }
  override id() { return this.sourceStreamName }
}

// Domain event to mark the origin in each NEW stream
class StreamBranchedFrom extends DomainEvent {
  constructor(
    public readonly sourceStreamName: string,
    public readonly sourceStreamVersion: number,  // Version of source at split time
    public readonly branchName: string,           // This stream's role (e.g., 'profile', 'billing')
    public readonly siblingStreams: string[],     // Other streams created in same split
    public readonly branchedAt: Date = new Date()
  ) { super() }
  override id() { return this.sourceStreamName }
}

// 1. Read all events from the original stream
const reader = await journal.streamReader('customer-reader')
const stream = await reader.streamFor('customer-123')
const splitVersion = stream.streamVersion

// 2. Replay relevant events to new streams with complete linking metadata
const profileEvents: Entry<string>[] = []
const billingEvents: Entry<string>[] = []

for (const entry of stream.entries) {
  const event = entryAdapterProvider.asSource(entry)
  if (isProfileEvent(event)) profileEvents.push(entry)
  if (isBillingEvent(event)) billingEvents.push(entry)
}

// Replay to profile stream
let profileVersion = 1
for (const entry of profileEvents) {
  const event = entryAdapterProvider.asSource(entry)
  const linkingMetadata = Metadata.withProperties(new Map([
    ['splitFrom', 'customer-123'],
    ['splitFromVersion', String(splitVersion)],      // Source stream version at split
    ['originalStreamVersion', String(entry.streamVersion)],
    ['splitAt', new Date().toISOString()]
  ]))
  await journal.append('customer-profile-123', profileVersion++, event, linkingMetadata)
}

// Replay to billing stream
let billingVersion = 1
for (const entry of billingEvents) {
  const event = entryAdapterProvider.asSource(entry)
  const linkingMetadata = Metadata.withProperties(new Map([
    ['splitFrom', 'customer-123'],
    ['splitFromVersion', String(splitVersion)],
    ['originalStreamVersion', String(entry.streamVersion)],
    ['splitAt', new Date().toISOString()]
  ]))
  await journal.append('customer-billing-123', billingVersion++, event, linkingMetadata)
}

// 3. Append origin marker to each NEW stream (first event visible to new consumers)
const profileOrigin = new StreamBranchedFrom(
  'customer-123',
  splitVersion,
  'profile',
  ['customer-billing-123']
)
await journal.append('customer-profile-123', profileVersion++, profileOrigin, Metadata.nullMetadata())

const billingOrigin = new StreamBranchedFrom(
  'customer-123',
  splitVersion,
  'billing',
  ['customer-profile-123']
)
await journal.append('customer-billing-123', billingVersion++, billingOrigin, Metadata.nullMetadata())

// 4. Append split marker to ORIGINAL stream (documents where events went)
const splitMarker = new StreamSplit(
  'customer-123',
  splitVersion,
  [
    { streamName: 'customer-profile-123', eventCount: profileEvents.length, firstVersion: 1, lastVersion: profileVersion - 1 },
    { streamName: 'customer-billing-123', eventCount: billingEvents.length, firstVersion: 1, lastVersion: billingVersion - 1 }
  ],
  'aggregate-decomposition'
)
await journal.append('customer-123', splitVersion + 1, splitMarker, Metadata.nullMetadata())

// 5. Soft delete the original stream
await journal.softDelete('customer-123')
```

**Pattern 2: Truncate + Continue with New Streams**

Use this when you want the original stream to remain active but start fresh:

```typescript
// 1. Record current version
const info = await journal.streamInfo('monolith-stream')
const splitVersion = info.currentVersion

// 2. Replay events to new streams with linking metadata (as above)

// 3. Append split marker to original stream
const splitMarker = new StreamSplit('monolith-stream', splitVersion, targets, 'decomposition')
await journal.append('monolith-stream', splitVersion + 1, splitMarker, Metadata.nullMetadata())

// 4. Truncate the original stream to hide old events
// New reads only see the split marker and any future events
await journal.truncateBefore('monolith-stream', splitVersion + 1)
```

##### Stream Merging (Joining)

Merging combines multiple streams into one. For example, consolidating regional `Order-US`, `Order-EU` streams into a single global `Order` stream.

**Pattern 1: Create New Stream + Soft Delete Originals**

```typescript
// Information about each source stream being merged
interface MergeSource {
  streamName: string
  streamVersion: number   // Version at time of merge
  eventCount: number      // Events contributed to merged stream
  firstTargetVersion: number  // Where this stream's events start in merged stream
  lastTargetVersion: number   // Where this stream's events end in merged stream
}

// Domain event to mark merge completion in the NEW stream
class StreamMergedFrom extends DomainEvent {
  constructor(
    public readonly targetStreamName: string,
    public readonly sources: MergeSource[],       // Complete info for all source streams
    public readonly totalEventsMerged: number,
    public readonly mergeReason: string,
    public readonly mergedAt: Date = new Date()
  ) { super() }
  override id() { return this.targetStreamName }
}

// Domain event to mark deprecation in each OLD stream
class StreamMergedInto extends DomainEvent {
  constructor(
    public readonly sourceStreamName: string,
    public readonly sourceStreamVersion: number,  // This stream's version at merge
    public readonly targetStreamName: string,
    public readonly targetVersionRange: { first: number, last: number },  // Where events landed
    public readonly otherSourceStreams: string[], // Other streams also merged
    public readonly mergedAt: Date = new Date()
  ) { super() }
  override id() { return this.sourceStreamName }
}

// 1. Read all source streams and capture their versions
const usStream = await reader.streamFor('order-us')
const euStream = await reader.streamFor('order-eu')

const sourceInfo = [
  { stream: usStream, name: 'order-us' },
  { stream: euStream, name: 'order-eu' }
]

// 2. Combine and sort events by timestamp
const allEntries = [...usStream.entries, ...euStream.entries]
  .map(entry => ({
    entry,
    streamName: entry.streamName || (usStream.entries.includes(entry) ? 'order-us' : 'order-eu'),
    timestamp: JSON.parse(entry.entryData).dateTimeSourced
  }))
  .sort((a, b) => a.timestamp - b.timestamp)

// 3. Replay to new merged stream, tracking where each source's events land
const sourceTracking = new Map<string, { first: number, last: number, count: number }>()
let version = 1

for (const { entry, streamName } of allEntries) {
  const event = entryAdapterProvider.asSource(entry)

  // Track version range for this source stream
  if (!sourceTracking.has(streamName)) {
    sourceTracking.set(streamName, { first: version, last: version, count: 0 })
  }
  const tracking = sourceTracking.get(streamName)!
  tracking.last = version
  tracking.count++

  const linkingMetadata = Metadata.withProperties(new Map([
    ['mergedFrom', streamName],
    ['mergedFromVersion', String(sourceInfo.find(s => s.name === streamName)!.stream.streamVersion)],
    ['originalStreamVersion', String(entry.streamVersion)],
    ['mergedAt', new Date().toISOString()]
  ]))
  await journal.append('order-global', version++, event, linkingMetadata)
}

// 4. Build complete source information
const mergeSources: MergeSource[] = sourceInfo.map(({ stream, name }) => {
  const tracking = sourceTracking.get(name)!
  return {
    streamName: name,
    streamVersion: stream.streamVersion,
    eventCount: tracking.count,
    firstTargetVersion: tracking.first,
    lastTargetVersion: tracking.last
  }
})

// 5. Append merge marker to NEW stream
const mergeMarker = new StreamMergedFrom(
  'order-global',
  mergeSources,
  allEntries.length,
  'regional-consolidation'
)
await journal.append('order-global', version++, mergeMarker, Metadata.nullMetadata())

// 6. Append deprecation markers to EACH OLD stream
for (const { stream, name } of sourceInfo) {
  const tracking = sourceTracking.get(name)!
  const otherSources = sourceInfo.filter(s => s.name !== name).map(s => s.name)

  const deprecationMarker = new StreamMergedInto(
    name,
    stream.streamVersion,
    'order-global',
    { first: tracking.first, last: tracking.last },
    otherSources
  )
  await journal.append(name, stream.streamVersion + 1, deprecationMarker, Metadata.nullMetadata())
}

// 7. Soft delete original streams
await journal.softDelete('order-us')
await journal.softDelete('order-eu')
```

**Pattern 2: Redirect Pattern (No Data Movement)**

For high-volume streams where copying data is prohibitive, use redirect markers:

```typescript
// Domain event for stream redirection (enriched)
class StreamRedirectedTo extends DomainEvent {
  constructor(
    public readonly sourceStreamName: string,
    public readonly sourceStreamVersion: number,  // This stream's version at redirect
    public readonly targetStreamName: string,
    public readonly otherRedirectedStreams: string[],  // Other streams also redirecting
    public readonly redirectReason: string,
    public readonly effectiveAt: Date = new Date()
  ) { super() }
  override id() { return this.sourceStreamName }
}

// 1. Get current versions
const usInfo = await journal.streamInfo('order-us')
const euInfo = await journal.streamInfo('order-eu')

// 2. Mark source streams as redirected with complete information
const usRedirect = new StreamRedirectedTo(
  'order-us',
  usInfo.currentVersion,
  'order-global',
  ['order-eu'],
  'regional-consolidation'
)
await journal.append('order-us', usInfo.currentVersion + 1, usRedirect, Metadata.nullMetadata())

const euRedirect = new StreamRedirectedTo(
  'order-eu',
  euInfo.currentVersion,
  'order-global',
  ['order-us'],
  'regional-consolidation'
)
await journal.append('order-eu', euInfo.currentVersion + 1, euRedirect, Metadata.nullMetadata())

// 3. Soft delete source streams
await journal.softDelete('order-us')
await journal.softDelete('order-eu')

// 4. Application code checks for redirects when loading
async function loadOrderStream(streamName: string): Promise<EntityStream<string>> {
  const stream = await reader.streamFor(streamName)

  // Check for redirect marker
  const lastEntry = stream.entries[stream.entries.length - 1]
  if (lastEntry) {
    const event = entryAdapterProvider.asSource(lastEntry)
    if (event instanceof StreamRedirectedTo) {
      return loadOrderStream(event.targetStreamName) // Follow redirect
    }
  }

  return stream
}
```

##### Best Practices for Stream Evolution

| Scenario | Recommended Approach |
|----------|---------------------|
| Split aggregate into multiple | Soft delete original + replay to new streams |
| Merge aggregates into one | Replay to new stream + soft delete originals |
| Archive old events | `truncateBefore()` to hide, keep recent visible |
| Permanent removal (GDPR) | `tombstone()` for hard delete |
| Temporary deactivation | `softDelete()` + reopen later by appending |
| High-volume merge | Redirect pattern (no data movement) |

##### Complete Provenance Information

**For Splits - Marker Events:**

| Location | Event | Key Fields |
|----------|-------|------------|
| Original stream | `StreamSplit` | `sourceStreamVersion`, `targets[]` with stream names and version ranges |
| Each new stream | `StreamBranchedFrom` | `sourceStreamName`, `sourceStreamVersion`, `siblingStreams[]` |

**For Splits - Linking Metadata (on each replayed event):**

```typescript
Metadata.withProperties(new Map([
  ['splitFrom', 'original-stream-name'],
  ['splitFromVersion', String(splitVersion)],       // Source stream version at split
  ['originalStreamVersion', String(entry.streamVersion)],  // Event's original version
  ['splitAt', new Date().toISOString()]
]))
```

**For Merges - Marker Events:**

| Location | Event | Key Fields |
|----------|-------|------------|
| New merged stream | `StreamMergedFrom` | `sources[]` with stream names, versions, and target version ranges |
| Each old stream | `StreamMergedInto` | `sourceStreamVersion`, `targetStreamName`, `targetVersionRange`, `otherSourceStreams[]` |

**For Merges - Linking Metadata (on each replayed event):**

```typescript
Metadata.withProperties(new Map([
  ['mergedFrom', 'source-stream-name'],
  ['mergedFromVersion', String(sourceStreamVersion)],  // Source stream version at merge
  ['originalStreamVersion', String(entry.streamVersion)],
  ['mergedAt', new Date().toISOString()]
]))
```

This complete provenance information enables:
- **Forward navigation**: From old stream, find where events went
- **Backward navigation**: From new stream, find where events came from
- **Sibling discovery**: Find all streams involved in the same split/merge
- **Point-in-time recovery**: Know exact versions at evolution time if stream is reopened
- **Audit compliance**: Full traceability for regulatory requirements

#### **Optimistic Concurrency with StreamState**

Use `StreamState` enum values for optimistic concurrency control:

```typescript
import { StreamState } from 'domo-tactical'

// Create new stream only (fails if stream exists)
const result = await journal.append('new-stream', StreamState.NoStream, event, metadata)
if (result.isConcurrencyViolation()) {
  console.log('Stream already exists!')
}

// Append to existing stream only (fails if stream empty)
await journal.append('existing-stream', StreamState.StreamExists, event, metadata)

// Append regardless of version (disable concurrency check)
await journal.append('any-stream', StreamState.Any, event, metadata)

// Expect specific version (version 5 implies stream is at version 4)
await journal.append('stream', 5, event, metadata)
```

#### **AppendResult**
Result type containing all append operation context.

```typescript
export class AppendResult<S, ST> {
  constructor(
    public readonly outcome: Outcome<StorageException, Result>,
    public readonly streamName: string,
    public readonly streamVersion: number,
    public readonly source: Source<S> | null,
    public readonly sources: Source<S>[] | null,
    public readonly snapshot: ST | null
  )

  isSuccess(): boolean              // True only if result is Result.Success
  isFailure(): boolean              // True for any non-success outcome
  isConcurrencyViolation(): boolean // True if version mismatch
  isStreamDeleted(): boolean        // True if stream was tombstoned
}
```

#### **EntityStream.ts**
Represents a stream of events/commands with optional snapshot.

```typescript
export class EntityStream<T> {
  public readonly snapshot: State<unknown> | null
  public readonly entries: Entry<T>[]
  public readonly streamName: string
  public readonly streamVersion: number

  hasSnapshot(): boolean
  size(): number
}
```

#### **Outcome.ts**
Success/Failure discriminated union type (similar to Rust's Result).

```typescript
export type Outcome<F, S> = Success<F, S> | Failure<F, S>

export class Success<F, S> {
  readonly kind: 'success' = 'success'
  constructor(public readonly value: S)
}

export class Failure<F, S> {
  readonly kind: 'failure' = 'failure'
  constructor(public readonly error: F)
}
```

#### **InMemoryJournal.ts**
Map-based in-memory journal implementation using JSON storage.

**Key Features:**
- No external dependencies
- JSON serialization for entries
- Stream indexing by version
- Snapshot storage
- JournalReader support

```typescript
const journal = new InMemoryJournal<string>()

// Append single event
await journal.append('account-1', 1, event, metadata)

// Append with snapshot
await journal.appendWith('account-1', 5, event, metadata, snapshot)

// Get stream reader
const reader = await journal.journalReader('projection-reader')
const entries = await reader.readNext(10)
```

#### **DefaultJournalSupervisor.ts**
Default supervisor for Journal-backed actors (SourcedEntity instances).

**Key Features:**
- Comprehensive error handling for event/command sourced entities
- Resume for business logic errors (validation failures, business rule violations)
- Resume for concurrency conflicts (optimistic locking violations)
- Restart for state corruption or internal consistency errors
- Resume for storage failures (allowing recovery when storage is restored)
- Extracts context from ApplyFailedError when available

**Directive Decision Logic:**
| Error Type | Directive | Rationale |
|------------|-----------|-----------|
| Concurrency, version conflict | Resume | Entity can retry |
| Validation, invalid, not found | Resume | Business errors, expected |
| Insufficient, already exists | Resume | Business rule violations |
| Corrupt, inconsistent, state error | Restart | Rebuild from event stream |
| Storage unavailable, connection lost | Resume | External recovery (see note) |
| Unknown | Resume | System continues |

**Note on Storage Failures:** Storage failures use `Resume` rather than `Stop` because the storage mechanism recovery is handled externally (by Kubernetes, administrators, etc.). The journal will recover gracefully once storage becomes available again. Stopping the actor would require a service restart to recover, which is undesirable when the storage issue is transient or externally managed. The application remains running and can process requests once storage is restored.

**Usage Example:**

```typescript
import { stage, Protocol, Definition } from 'domo-actors'
import {
  defaultJournalSupervisor,
  DEFAULT_JOURNAL_SUPERVISOR,
  InMemoryJournal,
  Journal,
  EventSourcedEntity
} from 'domo-tactical'

// Step 1: Create the supervisor using the convenience function
// This creates a supervisor named 'default-journal-supervisor'
defaultJournalSupervisor()

// Step 2: Create the journal under the default-journal-supervisor
// Use the DEFAULT_JOURNAL_SUPERVISOR constant for the supervisor name
const journalProtocol: Protocol = {
  type: () => 'Journal',
  instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
}
const journal = stage().actorFor<Journal<string>>(
  journalProtocol,
  undefined,
  DEFAULT_JOURNAL_SUPERVISOR  // <-- References the supervisor by its type name
)

// Register the journal for sourced entities to find
stage().registerValue('domo-tactical:default.journal', journal)

// Step 3: Create sourced entities under the same supervisor
const orderProtocol: Protocol = {
  type: () => 'Order',
  instantiator: () => ({
    instantiate: (definition: Definition) => new Order(definition.parameters()[0])
  })
}
const order = stage().actorFor<Order>(
  orderProtocol,
  ['order-123'],              // Constructor parameters
  DEFAULT_JOURNAL_SUPERVISOR  // <-- Same supervisor handles errors for this entity
)

// Now when the Order entity throws errors (validation, concurrency, etc.),
// the DefaultJournalSupervisor will handle them according to its directive logic
```

#### **JournalReader.ts**
Interface for reading journal entries sequentially (for projections). JournalReader extends ActorProtocol and is created as an actor by the Journal.

**Key Features:**
- Sequential entry reading
- Position tracking (async)
- Seek and rewind support
- Named readers with independent positions
- Actor-based with supervisor inheritance from Journal

```typescript
export interface JournalReader<T> extends ActorProtocol {
  name(): Promise<string>           // Async - actor method
  position(): Promise<number>       // Async - actor method
  readNext(max: number): Promise<Entry<T>[]>
  rewind(): Promise<void>
  seek(position: number): Promise<void>
}

// Usage
const reader = await journal.journalReader('my-projection')
let entries = await reader.readNext(100)  // Read first batch
entries = await reader.readNext(100)      // Read next batch
await reader.rewind()                     // Start over

// Position and name are now async
const pos = await reader.position()
const name = await reader.name()
```

**Note:** JournalReader actors inherit the supervisor from their parent Journal. This means errors in JournalReader are handled by the same supervisor that handles the Journal.

#### **Entry Adapters**
Custom serialization for schema evolution and versioning.

**Key Features:**
- Version-specific serialization
- Schema migration support
- Custom JSON handling
- Default text-based adapter with automatic type name mapping

**Default Adapter Behavior:**

`DefaultTextEntryAdapter` automatically uses `StoreTypeMapper` for bidirectional type name conversion:

- **`toEntry()`**: Converts PascalCase type names to kebab-case symbolic names (e.g., `UserRegistered` → `user-registered`)
- **`fromEntry()`**: Converts kebab-case back to PascalCase for adapter lookup and upcasting

This means entries stored in the journal use consistent kebab-case type names.

**Custom Adapter Example:**

Custom adapters can use `StoreTypeMapper` for consistent naming (recommended), or use their own naming scheme:

```typescript
import { DefaultTextEntryAdapter, StoreTypeMapper, Metadata, TextEntry } from 'domo-tactical'

// Custom adapter with StoreTypeMapper (recommended for consistency)
class UserRegisteredAdapter extends DefaultTextEntryAdapter<UserRegistered> {
  override toEntry(source: UserRegistered, streamVersion: number, metadata: Metadata): TextEntry {
    // Map type name to symbolic name for storage (best practice)
    const symbolicType = StoreTypeMapper.instance().toSymbolicName('UserRegistered')

    return new TextEntry(
      source.id(),
      symbolicType,  // 'user-registered'
      2,             // typeVersion
      JSON.stringify({
        userId: source.userId,
        username: source.username,
        email: source.email
      }),
      streamVersion,
      JSON.stringify(metadata)
    )
  }

  protected override upcastIfNeeded(data: any, type: string, typeVersion: number): UserRegistered {
    // type is the PascalCase type name (converted by fromEntry)
    if (typeVersion === 2) {
      return new UserRegistered(data.userId, data.username, data.email)
    }
    // Upcast from v1
    return new UserRegistered(data.userId, data.username, `${data.username}@legacy.com`)
  }
}

// Register adapter
EntryAdapterProvider.instance()
  .registerAdapter(UserRegistered, new UserRegisteredAdapter())
```

#### **EntryRegistry - Simple Source Type Registration**

The default `DefaultTextEntryAdapter` uses `JSON.parse()` which returns plain objects with `constructor === Object`. When `SourcedEntity.applySource()` looks up consumers via `source.constructor`, it fails because consumers are registered with specific class constructors (e.g., `AccountCreated`), not `Object`.

`EntryRegistry` solves this with a simple registration API that works for any `Source<T>` type (DomainEvent, Command, etc.):

**Simple Registration (no transforms needed)**

```typescript
// Register Source types for reconstruction
EntryRegistry.register(AccountOpened)
EntryRegistry.register(FundsDeposited)
EntryRegistry.register(ProcessPayment)  // Commands work too
```

**With Date Transforms**

For properties that need transformation (e.g., Date fields stored as strings):

```typescript
// Use Source.asDate for Date conversion
EntryRegistry.register(OrderShipped, { shippedAt: Source.asDate })

// Multiple Date fields
EntryRegistry.register(TransferCompleted, {
  initiatedAt: Source.asDate,
  completedAt: Source.asDate
})

// Custom transforms
EntryRegistry.register(OrderPlaced, {
  amount: (v) => Math.round(Number(v) * 100)  // Convert to cents
})
```

**Context Registration (all sources at once)**

Register all sources when creating a context:

```typescript
const BankEventSourcedEntity = eventSourcedContextFor('bank', {
  sources: [
    { type: AccountOpened },
    { type: FundsDeposited, transforms: { depositedAt: Source.asDate } },
    { type: AccountClosed, transforms: { closedAt: Source.asDate } }
  ]
})

class AccountActor extends BankEventSourcedEntity {
  // All sources are automatically reconstructed when restoring from journal
}
```

**Source Date Utilities**

`Source<T>` provides built-in date conversion utilities:

```typescript
// Instance method - convert dateTimeSourced to Date
const event = new AccountOpened('123', 'Alice', 1000)
const createdAt = event.dateSourced()  // Date instance

// Static helper - use as transform function
EntryRegistry.register(OrderShipped, { shippedAt: Source.asDate })

// Instance method - convert any property to Date
const when = event.dateOf('occurredAt')  // Date instance
```

**Migration from Manual Adapters**

Replace verbose adapter classes:

```typescript
// Before (50+ lines)
class AccountOpenedAdapter extends DefaultTextEntryAdapter<AccountOpened> {
  protected override upcastIfNeeded(data: any, type: string, version: number): AccountOpened {
    return new AccountOpened(data.accountId, data.owner, data.initialBalance)
  }
}
provider.registerAdapter(AccountOpened, new AccountOpenedAdapter())

// After (1 line)
EntryRegistry.register(AccountOpened)
```

#### **ContextProfile - Context-Scoped Registration**

`ContextProfile` provides context-scoped Source registration with a fluent API. Each context gets its own `EntryAdapterProvider`, solving the singleton testing problem.

**Types**

- `SourceTypeSpec` - Configuration for a Source type with optional transforms:
  ```typescript
  interface SourceTypeSpec {
    type: new (...args: unknown[]) => Source<unknown>
    transforms?: PropertyTransforms
  }
  ```

- `ContextSourceTypes` - Configuration for context factory functions:
  ```typescript
  interface ContextSourceTypes {
    sources?: SourceTypeSpec[]
  }
  ```

**Fluent Registration API**

```typescript
// Create and register sources for a context
ContextProfile.forContext('bank')
  .register(AccountOpened)
  .register(FundsDeposited, { depositedAt: Source.asDate })
  .register(AccountClosed, { closedAt: Source.asDate })

// Or use registerAll for types without transforms
ContextProfile.forContext('bank')
  .registerAll(AccountOpened, FundsTransferred, AccountClosed)

// Or use registerSources for batch registration
ContextProfile.forContext('bank').registerSources([
  { type: AccountOpened },
  { type: FundsDeposited, transforms: { depositedAt: Source.asDate } }
])
```

**Context Isolation**

Each context has its own `EntryAdapterProvider`:

```typescript
// Bank context
ContextProfile.forContext('bank')
  .register(AccountOpened)

// Order context (completely independent)
ContextProfile.forContext('orders')
  .register(OrderPlaced)

// Get context-specific provider
const bankProvider = ContextProfile.get('bank')!.entryAdapterProvider()
const event = bankProvider.asSource<AccountOpened>(entry)
```

**Test Isolation**

Use `ContextProfile.reset()` in test setup/teardown:

```typescript
beforeEach(() => {
  ContextProfile.reset()
  EntryAdapterProvider.reset()
})

afterEach(() => {
  ContextProfile.reset()
  EntryAdapterProvider.reset()
})
```

**Integration with Context Factories**

`eventSourcedContextFor()` and `commandSourcedContextFor()` automatically use `ContextProfile`:

```typescript
// Sources are registered to 'bank' context's EntryAdapterProvider
const BankEntity = eventSourcedContextFor('bank', {
  sources: [
    { type: AccountOpened },
    { type: FundsDeposited, transforms: { depositedAt: Source.asDate } }
  ]
})

// Entity automatically uses context-specific provider during restore
class AccountActor extends BankEntity {
  // Sources reconstructed using ContextProfile.get('bank').entryAdapterProvider()
}
```

**Global vs Context-Scoped**

- `EntryRegistry.register()` → delegates to `ContextProfile.forContext('default')`
- `ContextProfile.forContext(name)` → creates/gets context-specific profile
- `SourcedEntity.entryAdapterProvider()` → returns context-specific provider if exists, otherwise global singleton
- `EntryAdapterProvider.defaultProvider()` → convenience method to get the default context's provider

```typescript
// After registering with EntryRegistry
EntryRegistry.register(AccountOpened)

// Access the provider where it was registered
const provider = EntryAdapterProvider.defaultProvider()
expect(provider.hasAdapter(AccountOpened)).toBe(true)
```

#### **StateAdapterProvider - State Serialization Registry**

`StateAdapterProvider` manages the serialization and deserialization of state objects for the DocumentStore. It provides a registry for custom state adapters and a default JSON-based serialization strategy.

**Key Features:**
- Singleton registry for state adapters
- Custom adapter registration per state type
- Default JSON serialization for unregistered types
- Schema evolution support via adapter upcasting

```typescript
import { StateAdapterProvider } from 'domo-tactical'

// Get the singleton instance
const provider = StateAdapterProvider.instance()

// Register a custom adapter for a state type
provider.registerAdapter('AccountState', new AccountStateAdapter())

// Check if adapter is registered
if (provider.hasAdapter('AccountState')) {
  console.log('Custom serialization for AccountState')
}

// Convert native state to raw State (used by DocumentStore.write())
const rawState = provider.asRawState('account-123', accountState, 1, metadata)

// Convert raw State back to native state (used by DocumentStore.read())
const state = provider.fromRawState(rawState, 'AccountState')
```

**Test Isolation:**

```typescript
beforeEach(() => {
  StateAdapterProvider.reset()  // Clear all registered adapters
})
```

**Custom State Adapters:**

For custom serialization or schema evolution, implement `StateAdapter<S, RS>`:

```typescript
import { StateAdapter, TextState, Metadata, StoreTypeMapper } from 'domo-tactical'

class AccountStateAdapter implements StateAdapter<AccountState, TextState> {
  typeVersion(): number { return 2 }

  toRawState(id: string, state: AccountState, stateVersion: number, metadata: Metadata): TextState {
    const data = JSON.stringify({
      accountId: state.accountId,
      balance: state.balance,
      status: state.status
    })
    // Map type name to symbolic name for storage (best practice)
    const symbolicType = StoreTypeMapper.instance().toSymbolicName('AccountState')
    return new TextState(id, symbolicType, this.typeVersion(), data, stateVersion, metadata)
  }

  fromRawState(raw: TextState): AccountState {
    const data = JSON.parse(raw.data)
    // Upcast from older versions if needed
    if (raw.typeVersion === 1 && !data.status) {
      data.status = 'active'  // Default for v1 → v2 migration
    }
    return new AccountState(data.accountId, data.balance, data.status)
  }
}

// Register the adapter
StateAdapterProvider.instance().registerAdapter('AccountState', new AccountStateAdapter())
```

#### **StoreTypeMapper - Storage Type Name Mapping**

`StoreTypeMapper` provides bidirectional mapping between type/class names and symbolic storage names. This enables storage abstraction and protects against class renaming.

**Key Features:**
- Single registration creates bidirectional mapping (type ↔ symbolic)
- Convention-based fallback (PascalCase ↔ kebab-case)
- Works for both Entry types (events/commands) and State types (documents)
- Fluent API for chaining registrations
- **Used automatically by `DefaultTextEntryAdapter` and `DefaultTextStateAdapter`**

**Automatic Usage in Default Adapters:**

The default adapters use `StoreTypeMapper` internally:
- `DefaultTextEntryAdapter.toEntry()` → calls `toSymbolicName()` to convert type names for storage
- `DefaultTextEntryAdapter.fromEntry()` → calls `toTypeName()` for adapter lookup and upcasting
- `DefaultTextStateAdapter.toRawState()` → calls `toSymbolicName()` for document type names

Custom adapters are NOT required to use `StoreTypeMapper`, but can do so for consistent naming.

**Basic Usage:**

```typescript
import { StoreTypeMapper } from 'domo-tactical'

const mapper = StoreTypeMapper.instance()

// Register explicit bidirectional mappings
mapper
  .mapping('AccountOpened', 'account-opened')
  .mapping('FundsDeposited', 'funds-deposited')
  .mapping('AccountSummary', 'account-summary')

// Convert type name to symbolic name (for writing)
mapper.toSymbolicName('AccountOpened')  // 'account-opened'

// Convert symbolic name to type name (for reading)
mapper.toTypeName('account-opened')     // 'AccountOpened'

// Check if explicit mapping exists
mapper.hasTypeMapping('AccountOpened')     // true
mapper.hasSymbolicMapping('account-opened') // true
```

**Convention-Based Fallback:**

When no explicit mapping is registered, StoreTypeMapper uses convention-based conversion:

```typescript
// No registration needed - automatic conversion
mapper.toSymbolicName('UserRegistered')    // 'user-registered'
mapper.toTypeName('user-registered')       // 'UserRegistered'

// Handles acronyms
mapper.toSymbolicName('XMLParser')         // 'xml-parser'
mapper.toTypeName('xml-parser')            // 'XmlParser'

// Single words
mapper.toSymbolicName('Name')              // 'name'
mapper.toTypeName('name')                  // 'Name'
```

**Why Use Explicit Mappings:**

While convention-based conversion works automatically, explicit mappings provide:

1. **Documentation** - The storage schema is explicitly documented in code
2. **Refactoring Protection** - Class can be renamed without breaking stored data
3. **Custom Naming** - Use any symbolic name you prefer:
   ```typescript
   mapper.mapping('AccountOpened', 'acct-open')  // Custom symbolic name
   ```

**Complete Bank Example:**

```typescript
import { StoreTypeMapper } from 'domo-tactical'

function registerTypeMappings(): void {
  const typeMapper = StoreTypeMapper.instance()

  // Source/Entry type mappings (domain events → journal entries)
  typeMapper
    .mapping('AccountOpened', 'account-opened')
    .mapping('FundsDeposited', 'funds-deposited')
    .mapping('FundsWithdrawn', 'funds-withdrawn')
    .mapping('FundsRefunded', 'funds-refunded')

  // State type mappings (documents → document store)
  typeMapper
    .mapping('AccountSummary', 'account-summary')
    .mapping('TransactionHistory', 'transaction-history')
    .mapping('BankStatistics', 'bank-statistics')
}
```

**Test Isolation:**

```typescript
beforeEach(() => {
  StoreTypeMapper.reset()  // Clear all registered mappings
})
```

### Document Store Components (`/src/store/document/`)

The document store provides a general-purpose key-value storage abstraction for documents, query/read models, and serialized object state.

#### **DocumentStore.ts**
Interface for storing and querying documents by ID and type.

**Key Features:**
- Write documents by ID and type
- Read single or multiple documents
- Query all documents of a type
- Async operations
- Suitable for CQRS query/read models, caching, and general document storage

```typescript
export interface DocumentStore {
  write(
    id: string,
    state: any,
    type: string,
    stateVersion: number
  ): Promise<WriteResult>

  read(id: string, type: string): Promise<ReadResult>

  readAll(type: string): Promise<ReadAllResult>
}

// Usage
await documentStore.write('user-123', userProfile, 'UserProfile', 1)
const result = await documentStore.read('user-123', 'UserProfile')
const allUsers = await documentStore.readAll('UserProfile')
```

#### **InMemoryDocumentStore.ts**
In-memory document store implementation.

**Key Features:**
- Map-based storage by type and ID
- Immediate consistency
- Perfect for testing, development, and single-instance applications
- Suitable for caching, query/read models, and general document storage

```typescript
const store = new InMemoryDocumentStore()

// Write document
await store.write('user-1', { name: 'Alice', email: 'alice@example.com' }, 'UserProfile', 1)

// Read document
const result = await store.read('user-1', 'UserProfile')
if (result.outcome.success) {
  console.log(result.state)  // { name: 'Alice', email: 'alice@example.com' }
}

// Query all documents of type
const allProfiles = await store.readAll('UserProfile')
console.log(allProfiles.states)  // Array of all UserProfile documents
```

#### **DefaultDocumentStoreSupervisor.ts**
Default supervisor for DocumentStore-backed actors (stateful entities, projections).

**Key Features:**
- Comprehensive error handling for document-based storage
- Resume for business logic errors (validation failures, not found)
- Resume for concurrency conflicts (optimistic locking violations)
- Restart for state corruption, serialization, or schema errors
- Resume for storage failures (allowing recovery when storage is restored)

**Directive Decision Logic:**
| Error Type | Directive | Rationale |
|------------|-----------|-----------|
| Concurrency, version conflict | Resume | Actor can retry |
| Validation, invalid, not found | Resume | Business errors, expected |
| Already exists, duplicate | Resume | Business rule violations |
| Serialization, deserialization | Restart | Clear corrupted state |
| Schema, parse error, JSON | Restart | Schema mismatch |
| Corrupt, inconsistent, state error | Restart | Reload from store |
| Storage unavailable, connection lost | Resume | External recovery (see note) |
| Unknown | Resume | System continues |

**Note on Storage Failures:** Storage failures use `Resume` rather than `Stop` because the storage mechanism recovery is handled externally (by Kubernetes, administrators, etc.). The document store will recover gracefully once storage becomes available again. Stopping the actor would require a service restart to recover, which is undesirable when the storage issue is transient or externally managed. The application remains running and can process requests once storage is restored.

**Usage Example:**

```typescript
import { stage, Protocol, Definition } from 'domo-actors'
import {
  defaultDocumentStoreSupervisor,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR,
  InMemoryDocumentStore,
  DocumentStore,
  Projection
} from 'domo-tactical'

// Step 1: Create the supervisor using the convenience function
// This creates a supervisor named 'default-document-store-supervisor'
defaultDocumentStoreSupervisor()

// Step 2: Create the document store under the default-document-store-supervisor
// Use the DEFAULT_DOCUMENT_STORE_SUPERVISOR constant for the supervisor name
const documentStoreProtocol: Protocol = {
  type: () => 'DocumentStore',
  instantiator: () => ({ instantiate: () => new InMemoryDocumentStore() })
}
const documentStore = stage().actorFor<DocumentStore>(
  documentStoreProtocol,
  undefined,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR  // <-- References the supervisor by its type name
)

// Register the document store for projections to find
stage().registerValue('domo-tactical:default.documentStore', documentStore)

// Step 3: Create projections under the same supervisor
const userProfileProjectionProtocol: Protocol = {
  type: () => 'UserProfileProjection',
  instantiator: () => ({
    instantiate: () => new UserProfileProjection()
  })
}
const projection = stage().actorFor<Projection>(
  userProfileProjectionProtocol,
  undefined,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR  // <-- Same supervisor handles errors for this projection
)

// Now when the projection throws errors (serialization, validation, etc.),
// the DefaultDocumentStoreSupervisor will handle them according to its directive logic
```

**Combining Both Supervisors:**

In a typical CQRS application, you might use both supervisors - one for the write side (journal/sourced entities) and one for the read side (document store/projections):

```typescript
import {
  defaultJournalSupervisor,
  DEFAULT_JOURNAL_SUPERVISOR,
  defaultDocumentStoreSupervisor,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR
} from 'domo-tactical'

// Create both supervisors using convenience functions
defaultJournalSupervisor()
defaultDocumentStoreSupervisor()

// Journal and entities under default-journal-supervisor
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, DEFAULT_JOURNAL_SUPERVISOR)
const order = stage().actorFor<Order>(orderProtocol, ['order-1'], DEFAULT_JOURNAL_SUPERVISOR)

// Document store and projections under default-document-store-supervisor
const docStore = stage().actorFor<DocumentStore>(storeProtocol, undefined, DEFAULT_DOCUMENT_STORE_SUPERVISOR)
const projection = stage().actorFor<Projection>(projProtocol, undefined, DEFAULT_DOCUMENT_STORE_SUPERVISOR)
```

### Projection Components (`/src/model/projections/`)

The projections module implements the CQRS read-side, building query models from event/command streams.

#### **Projection.ts**
Core projection interface for handling projectables.

```typescript
export interface Projection {
  projectWith(
    projectable: Projectable,
    control: ProjectionControl
  ): Promise<void>
}

// Example projection
class UserProfileProjection implements Projection {
  async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
    const entries = projectable.entries()

    for (const entry of entries) {
      const event = JSON.parse(entry.entryData as string)

      if (entry.type === 'UserRegistered') {
        // Create user profile in document store
        await documentStore.write(event.userId, {
          userId: event.userId,
          username: event.username,
          email: event.email
        }, 'UserProfile', 1)
      }
    }

    control.confirmProjected(projectable)
  }
}
```

#### **Projectable.ts**
Data wrapper for projection operations.

**Key Features:**
- Contains state or entries to project
- Tracks causation (becauseOf)
- Provides typed data access
- Metadata support

```typescript
export interface Projectable {
  dataId(): string
  dataVersion(): number
  type(): string
  typeVersion(): number

  // Data access
  dataAsText(): string
  dataAsBytes(): Uint8Array
  object<T>(): T

  // Entry access
  entries(): Entry<any>[]
  hasEntries(): boolean
  hasObject(): boolean

  // Metadata
  becauseOf(): string[]
  metadata(): string
}
```

#### **ProjectionDispatcher.ts**
Routes projectables to matching projections.

**Key Features:**
- Pattern-based projection matching
- Multiple projections per event type
- Actor-based for fault tolerance
- Confirmation tracking

```typescript
// Register projections with patterns
await dispatcher.register(new ProjectToDescription(
  userProfileProjection,
  ['UserRegistered', 'UserUpdated', 'UserDeactivated'],
  'User profile query model'
))

await dispatcher.register(new ProjectToDescription(
  userStatsProjection,
  ['User*'],  // Wildcard pattern
  'User activity statistics'
))

// Dispatch projectable to all matching projections
await dispatcher.dispatch(projectable)
```

#### **JournalConsumerActor.ts** (in `/src/store/journal/`)
Consumes journal entries and dispatches to projections. Bridges the journal (write side) and projections (query model).

**Key Features:**
- Continuous polling of journal
- Batch processing
- Pause/resume support
- Configurable poll interval

```typescript
// Create journal consumer
const reader = await journal.journalReader('projection-consumer')
const consumer = new JournalConsumerActor(
  reader,
  dispatcher,
  100,  // Poll interval (ms)
  10    // Batch size
)

// Consumer automatically:
// 1. Polls journal for new entries
// 2. Creates Projectables from entries
// 3. Dispatches to matching projections
// 4. Tracks confirmation

await consumer.pause()   // Stop consuming
await consumer.resume()  // Resume consuming
```

#### **Confirmer.ts**
Tracks projection completion for at-least-once delivery.

```typescript
export interface Confirmer {
  pending(projectable: Projectable): Promise<void>
  confirm(projectable: Projectable): Promise<void>
  checkUnconfirmed(): Promise<Projectable[]>
}

// Usage with TestConfirmer
const confirmer = new TestConfirmer(5000)  // 5 second threshold

await confirmer.pending(projectable)
// ... projection processing ...
await confirmer.confirm(projectable)

// Check for stuck projections
const stuck = await confirmer.checkUnconfirmed()
if (stuck.length > 0) {
  console.warn('Unconfirmed projectables:', stuck)
}
```

### Test Utilities (`/src/testkit/`)

The testkit provides in-memory implementations and utilities for testing.

#### **TestConfirmer**
In-memory projection confirmation tracker.

```typescript
import { TestConfirmer } from 'domo-tactical/testkit'

const confirmer = new TestConfirmer(1000)  // 1 second threshold

await confirmer.pending(projectable)
expect(confirmer.isPending(projectable)).toBe(true)

await confirmer.confirm(projectable)
expect(confirmer.isConfirmed(projectable)).toBe(true)
```

#### **TestSupervisor and TestJournalSupervisor**
Custom supervisor for tracking error recovery in tests.

The `TestSupervisor` interface extends `Supervisor` with methods to track error handling:

```typescript
import { TestSupervisor, TestJournalSupervisor } from 'domo-tactical/testkit'

export interface TestSupervisor extends Supervisor {
  errorRecoveryCount(): Promise<number>  // Number of errors handled
  lastError(): Promise<string | null>    // Message of last error
  reset(): Promise<void>                 // Reset tracking state
}
```

**Usage in tests:**

```typescript
import { stage, Protocol } from 'domo-actors'
import { TestJournalSupervisor, TestSupervisor } from 'domo-tactical/testkit'

const SUPERVISOR_NAME = 'test-supervisor'

// Create supervisor - IMPORTANT: type() must match the supervisor name
// because Environment.supervisor() looks up supervisors by type in the directory
const supervisorProtocol: Protocol = {
  type: () => SUPERVISOR_NAME,  // Must match the supervisor name used below
  instantiator: () => ({ instantiate: () => new TestJournalSupervisor() })
}
const supervisor = stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default')

// Create actors under this supervisor
const journalProtocol: Protocol = {
  type: () => 'Journal',
  instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
}
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME)

// After triggering an error, wait for supervision to complete
async function waitForErrorRecovery(supervisor: TestSupervisor, expectedCount: number) {
  const timeoutMs = 5000
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const count = await supervisor.errorRecoveryCount()
    if (count >= expectedCount) return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error(`Timeout waiting for ${expectedCount} error recoveries`)
}

// In your test
await waitForErrorRecovery(supervisor, 1)
```

**Important:** The supervisor's protocol `type()` must match the supervisor name used when creating other actors. This is because `Environment.supervisor()` looks up supervisors by type in the actor directory.

#### **TestJournal and TestDocumentStore**
Convenient aliases for test code.

```typescript
import { TestJournal, TestDocumentStore } from 'domo-tactical/testkit'

// These are aliases to InMemoryJournal and InMemoryDocumentStore
// Use Test* in tests for consistency, InMemory* in examples
const journal = new TestJournal<string>()
const store = new TestDocumentStore()
```

**Why two names?**
- **InMemory\*** - Descriptive names for examples and production use cases
- **Test\*** - Consistent naming for test code, imported from testkit module


## Import Structure

The package provides clean, organized exports through subpath imports.

### Main Exports
```typescript
import {
  // Store types
  Source, Metadata, State, Result, StorageException,
  BinaryState, TextState, ObjectState,
  EntryAdapter, EntryAdapterProvider,
  StateAdapter, StateAdapterProvider,
  EntryRegistry, ContextProfile, StoreTypeMapper,

  // Journal types
  Journal, AppendResult, Entry, EntityStream, Outcome,
  InMemoryJournal, DefaultJournalSupervisor,
  defaultJournalSupervisor, DEFAULT_JOURNAL_SUPERVISOR,

  // Document store types
  DocumentStore, InMemoryDocumentStore, DefaultDocumentStoreSupervisor,
  defaultDocumentStoreSupervisor, DEFAULT_DOCUMENT_STORE_SUPERVISOR,
  defaultProjectionSupervisor, DEFAULT_PROJECTION_SUPERVISOR,

  // Model types
  Command, DomainEvent, EntityActor,
  IdentifiedCommand, IdentifiedDomainEvent,
  ApplyFailedError, Applicable,

  // Sourcing types
  SourcedEntity, EventSourcedEntity, CommandSourcedEntity,

  // Projection types
  Projection, Projectable, ProjectionControl,
  ProjectionDispatcher, JournalConsumer,
  ProjectionSupervisor
} from 'domo-tactical'
```

### Store Subpath
```typescript
import {
  Source, Metadata, State, Result, StorageException,
  BinaryState, TextState, ObjectState,
  EntryAdapter, EntryAdapterProvider,
  StateAdapter, StateAdapterProvider,
  EntryRegistry, ContextProfile, StoreTypeMapper
} from 'domo-tactical/store'
```

### Journal Subpath
```typescript
import {
  Journal, JournalReader, AppendResult,
  Entry, EntityStream, Outcome,
  InMemoryJournal,
  JournalConsumer, JournalConsumerActor,
  DefaultJournalSupervisor,
  defaultJournalSupervisor,
  DEFAULT_JOURNAL_SUPERVISOR
} from 'domo-tactical/store/journal'
```

### Document Store Subpath
```typescript
import {
  DocumentStore, DocumentBundle,
  ReadResult, WriteResult,
  InMemoryDocumentStore,
  DefaultDocumentStoreSupervisor,
  defaultDocumentStoreSupervisor,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR,
  defaultProjectionSupervisor,
  DEFAULT_PROJECTION_SUPERVISOR
} from 'domo-tactical/store/document'
```

### Model Subpath
```typescript
import {
  Command, DomainEvent, EntityActor,
  IdentifiedCommand, IdentifiedDomainEvent,
  ApplyFailedError, Applicable
} from 'domo-tactical/model'
```

### Sourcing Subpath
```typescript
import {
  SourcedEntity,
  EventSourcedEntity,
  CommandSourcedEntity,
  eventSourcedEntityTypeFor,
  commandSourcedEntityTypeFor
} from 'domo-tactical/model/sourcing'
```

### Projections Subpath
```typescript
import {
  Projection, Projectable, ProjectionControl,
  ProjectionDispatcher, JournalConsumer,
  ProjectionSupervisor, Confirmer,
  ProjectToDescription, MatchableProjections,
  defaultProjectionSupervisor, DEFAULT_PROJECTION_SUPERVISOR
} from 'domo-tactical/model/projections'
```

### Testkit Subpath
```typescript
import {
  TestConfirmer,
  TestSupervisor,           // Interface for test supervisors
  TestJournalSupervisor,    // Implementation for tracking error recovery
  TestJournal,
  TestDocumentStore
} from 'domo-tactical/testkit'
```

## Actor-Based Storage

All storage interfaces (`Journal`, `DocumentStore`, `JournalReader`, `JournalConsumer`) extend `ActorProtocol` from domo-actors. This means storage components are actors and must be created via `stage().actorFor()`.

### Creating Storage Actors

```typescript
import { stage, Protocol } from 'domo-actors'
import { Journal, InMemoryJournal, DocumentStore, InMemoryDocumentStore } from 'domo-tactical'

// Create journal as an actor
const journalProtocol: Protocol = {
  type: () => 'Journal',
  instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
}
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, 'default')

// Create document store as an actor
const storeProtocol: Protocol = {
  type: () => 'DocumentStore',
  instantiator: () => ({ instantiate: () => new InMemoryDocumentStore() })
}
const documentStore = stage().actorFor<DocumentStore>(storeProtocol, undefined, 'default')
```

### Custom Supervisors for Storage Actors

Storage actors (Journal, JournalReader, StreamReader) can use custom supervisors for specialized error handling. Child actors created by the Journal inherit its supervisor.

**Important:** When using custom supervisors, the supervisor's protocol `type()` must match the supervisor name used when creating actors. This is because `Environment.supervisor()` looks up supervisors by type in the actor directory.

```typescript
import { stage, Protocol } from 'domo-actors'
import { TestJournalSupervisor, TestSupervisor } from 'domo-tactical/testkit'

const SUPERVISOR_NAME = 'my-supervisor'

// The type() MUST match the supervisor name
const supervisorProtocol: Protocol = {
  type: () => SUPERVISOR_NAME,  // <-- Must match
  instantiator: () => ({ instantiate: () => new TestJournalSupervisor() })
}
const supervisor = stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default')

// Create journal under this supervisor
const journalProtocol: Protocol = {
  type: () => 'Journal',
  instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
}
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME)

// JournalReader and StreamReader actors created by the journal will inherit this supervisor
```

### Registering Storage for Contexts

Sourced entities look up their journal using a context key pattern:

```
domo-tactical:<contextName>.journal
domo-tactical:<contextName>.documentStore
```

Register storage for a context:

```typescript
// Register journal for the "bank" context
stage().registerValue('domo-tactical:bank.journal', journal)

// Register document store for the "bank" context
stage().registerValue('domo-tactical:bank.documentStore', documentStore)
```

## Context Support

### Context-Specific Entity Base Classes

Use factory functions to create context-specific entity base classes:

```typescript
import { eventSourcedEntityTypeFor, commandSourcedEntityTypeFor } from 'domo-tactical/model/sourcing'

// Create a base class for the "bank" context
const BankEventSourcedEntity = eventSourcedEntityTypeFor('bank')

// Use it as the base for your entity
class AccountActor extends BankEventSourcedEntity implements Account {
  // ... entity implementation
  // This entity uses the journal at 'domo-tactical:bank.journal'
}

// Similarly for command-sourced entities
const BankCommandSourcedEntity = commandSourcedEntityTypeFor('bank')

class TransferCoordinator extends BankCommandSourcedEntity {
  // ... entity implementation
}
```

### The `contextName()` Method

The `SourcedEntity` base class provides a `contextName()` method that returns the context name. By default it returns `'default'`:

```typescript
export abstract class SourcedEntity<T> extends EntityActor {
  // Override to specify your context
  protected contextName(): string {
    return 'default'
  }

  // The journal key is derived from the context name
  protected journalKey(): string {
    return `domo-tactical:${this.contextName()}.journal`
  }
}
```

The factory functions (`eventSourcedEntityTypeFor`, `commandSourcedEntityTypeFor`) create subclasses that override `contextName()` to return the specified context name.

### Complete Context Example

```typescript
import { stage, Protocol } from 'domo-actors'
import { eventSourcedEntityTypeFor, DomainEvent, InMemoryJournal, Journal } from 'domo-tactical'

// 1. Create the context base class
const BankEventSourcedEntity = eventSourcedEntityTypeFor('bank')

// 2. Define your domain events
class AccountOpened extends DomainEvent {
  constructor(public accountId: string, public balance: number) { super() }
  override id() { return this.accountId }
}

// 3. Define your entity using the context base
class AccountActor extends BankEventSourcedEntity {
  private balance = 0

  static {
    BankEventSourcedEntity.registerConsumer(AccountActor, AccountOpened,
      (account, event) => account.balance = event.balance)
  }

  async open(initialBalance: number) {
    await this.apply(new AccountOpened(this.streamName, initialBalance))
  }
}

// 4. Set up the infrastructure
const journalProtocol: Protocol = {
  type: () => 'Journal',
  instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
}
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, 'default')

// 5. Register journal for the context
stage().registerValue('domo-tactical:bank.journal', journal)

// 6. Create entities as actors - they will automatically find their journal
const accountProtocol: Protocol = {
  type: () => 'Account',
  instantiator: () => ({ instantiate: () => new AccountActor('account-123') })
}
const account = stage().actorFor<AccountActor>(accountProtocol, undefined, 'default')

await account.open(1000)
```

## Usage Examples

### Basic Event Sourcing

```typescript
import { EventSourcedEntity, DomainEvent } from 'domo-tactical'
import { TestJournal } from 'domo-tactical/testkit'

// Define domain events
class AccountOpened extends DomainEvent {
  constructor(public accountId: string, public balance: number) { super() }
  override id() { return this.accountId }
}

class FundsDeposited extends DomainEvent {
  constructor(public accountId: string, public amount: number) { super() }
  override id() { return this.accountId }
}

// Define entity
class BankAccount extends EventSourcedEntity {
  private balance = 0

  static {
    // Register event handlers
    EventSourcedEntity.registerConsumer(BankAccount, AccountOpened,
      (account, event) => account.balance = event.balance)
    EventSourcedEntity.registerConsumer(BankAccount, FundsDeposited,
      (account, event) => account.balance += event.amount)
  }

  async open(initialBalance: number) {
    await this.apply(new AccountOpened(this.streamName, initialBalance))
  }

  async deposit(amount: number) {
    await this.apply(new FundsDeposited(this.streamName, amount))
  }

  getBalance() { return this.balance }
}

// Usage
const journal = new TestJournal<string>()
const account = new BankAccount('account-123')

await account.open(1000)
await account.deposit(500)
console.log(account.getBalance())  // 1500
```

### Complete CQRS Pipeline

```typescript
import { stage } from 'domo-actors'
import {
  EventSourcedEntity, DomainEvent, Metadata,
  Projection, Projectable, ProjectionControl,
  TextProjectionDispatcherActor, JournalConsumerActor,
  defaultProjectionSupervisor, DEFAULT_PROJECTION_SUPERVISOR,
  ProjectToDescription
} from 'domo-tactical'
import { TestJournal, TestDocumentStore, TestConfirmer } from 'domo-tactical/testkit'

// 1. Define Events
class UserRegistered extends DomainEvent {
  constructor(
    public userId: string,
    public username: string,
    public email: string
  ) { super() }
  override id() { return this.userId }
}

class UserAuthenticated extends DomainEvent {
  constructor(
    public userId: string,
    public sessionId: string,
    public timestamp: Date
  ) { super() }
  override id() { return this.userId }
}

// 2. Define Event-Sourced Entity
class User extends EventSourcedEntity {
  private username = ''
  private email = ''
  private sessionCount = 0

  static {
    EventSourcedEntity.registerConsumer(User, UserRegistered,
      (user, event) => {
        user.username = event.username
        user.email = event.email
      })
    EventSourcedEntity.registerConsumer(User, UserAuthenticated,
      (user, event) => user.sessionCount++)
  }

  async register(username: string, email: string) {
    await this.apply(new UserRegistered(this.streamName, username, email))
  }

  async authenticate(sessionId: string) {
    await this.apply(new UserAuthenticated(this.streamName, sessionId, new Date()))
  }
}

// 3. Define Query Model Projection
class UserProfileProjection extends Actor implements Projection {
  async projectWith(projectable: Projectable, control: ProjectionControl) {
    const documentStore = stage().retrieveValue('documentStore')
    const entries = projectable.entries()

    for (const entry of entries) {
      const data = JSON.parse(entry.entryData as string)

      if (entry.type === 'UserRegistered') {
        await documentStore.write(data.userId, {
          userId: data.userId,
          username: data.username,
          email: data.email,
          sessionCount: 0
        }, 'UserProfile', 1)
      }

      if (entry.type === 'UserAuthenticated') {
        const result = await documentStore.read(data.userId, 'UserProfile')
        if (result.state) {
          result.state.sessionCount++
          await documentStore.write(data.userId, result.state, 'UserProfile', 2)
        }
      }
    }

    control.confirmProjected(projectable)
  }
}

// 4. Wire up CQRS Pipeline
const journal = new TestJournal<string>()
const documentStore = new TestDocumentStore()
const confirmer = new TestConfirmer()

stage().registerValue('documentStore', documentStore)

// Create projection supervisor using convenience function
defaultProjectionSupervisor()

// Create projection
const projection = stage().actorFor(
  { type: () => 'UserProfileProjection',
    instantiator: () => ({ instantiate: () => new UserProfileProjection() })
  },
  undefined,
  DEFAULT_PROJECTION_SUPERVISOR
)

// Create dispatcher
const dispatcher = stage().actorFor(
  { type: () => 'Dispatcher',
    instantiator: () => ({
      instantiate: (def) => new TextProjectionDispatcherActor(def.parameters()[0])
    })
  },
  undefined,
  DEFAULT_PROJECTION_SUPERVISOR,
  undefined,
  confirmer
)

// Register projection
await dispatcher.register(new ProjectToDescription(
  projection,
  ['UserRegistered', 'UserAuthenticated'],
  'User profile projection'
))

// Create journal consumer
const reader = await journal.journalReader('projection-consumer')
const consumer = stage().actorFor(
  { type: () => 'Consumer',
    instantiator: () => ({
      instantiate: (def) => new JournalConsumerActor(...def.parameters())
    })
  },
  undefined,
  DEFAULT_PROJECTION_SUPERVISOR,
  undefined,
  reader,
  dispatcher,
  100,  // Poll interval
  10    // Batch size
)

// 5. Use the system
const user = new User('user-123')

// setJournal() is not recommended for production; best for tests
// or when there are multiple Journal instance for a single context.
// see: stage().registerValue('domo-tactical:bank.journal', journal)
user.setJournal(journal)

// Write side: Event sourcing
await user.register('alice', 'alice@example.com')
await user.authenticate('session-1')
await user.authenticate('session-2')

// Wait for projections to process
await new Promise(resolve => setTimeout(resolve, 200))

// Query Model (Read Side)
const profile = await documentStore.read('user-123', 'UserProfile')
console.log(profile.state)
// { userId: 'user-123', username: 'alice', email: 'alice@example.com', sessionCount: 2 }
```

## Key Design Decisions

### 1. Async-First Architecture
All store operations return `Promise` for consistent async patterns:

```typescript
// Before (Java/callback style)
journal.append(streamName, version, source, metadata, interest, object)

// After (TypeScript/Promise style)
const result = await journal.append(streamName, version, source, metadata)
```

### 2. AppendResult Return Type
Replaced callback pattern with rich result type:

```typescript
export class AppendResult<S, ST> {
  outcome: Outcome<StorageException, Result>
  streamName: string
  streamVersion: number
  source: Source<S> | null
  sources: Source<S>[] | null
  snapshot: ST | null

  isSuccess(): boolean              // True only if result is Result.Success
  isFailure(): boolean              // True for any non-success outcome
  isConcurrencyViolation(): boolean // True if version mismatch
  isStreamDeleted(): boolean        // True if stream was tombstoned
}
```

### 3. Modern TypeScript Patterns
- Proper generics for type safety
- Discriminated unions (Outcome type)
- Abstract classes with protected constructors
- Method overloading where appropriate
- Null handling without Java's Optional

### 4. DomoActors Integration
EntityActor extends Actor from domo-actors@1.2.0:

```typescript
import { Actor } from 'domo-actors'

export abstract class EntityActor extends Actor {
  protected abstract restore(): Promise<void>
}
```

### 5. JSON-Based InMemory Storage
Simple and effective for development/testing:

```typescript
private sourceToEntry<S>(source: Source<S>, ...): Entry<T> {
  return {
    id: String(this.nextEntryId++),
    type: source.typeName(),
    typeVersion: source.sourceTypeVersion,
    entryData: JSON.stringify(source) as T,
    metadata: JSON.stringify({...})
  }
}
```

## Testing

The project includes comprehensive tests using Vitest (284 tests passing):

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test Coverage

**Store Module**
- ✅ Source creation, equality, and null pattern
- ✅ State types (Binary, Text, Object)
- ✅ Metadata creation and properties
- ✅ Schema evolution with entry adapters
- ✅ Entry adapter provider registration

**Journal Storage**
- ✅ InMemoryJournal single/batch append
- ✅ Stream reading with snapshots
- ✅ JournalReader sequential reading
- ✅ Position tracking, seek, rewind
- ✅ Multiple independent readers

**Document Store**
- ✅ InMemoryDocumentStore write/read
- ✅ Query all documents by type
- ✅ Update and overwrite semantics
- ✅ Type isolation

**Projection Pipeline**
- ✅ Projectable creation and data access
- ✅ Projection control and confirmation
- ✅ Pattern matching and dispatching
- ✅ JournalConsumer polling and batch processing
- ✅ Complete CQRS integration tests
- ✅ Multi-projection dispatching

**Domain Modeling**
- ✅ EventSourcedEntity state transitions
- ✅ CommandSourcedEntity operations
- ✅ Consumer registration and application
- ✅ Snapshot save and restore
- ✅ Version tracking

**Test Utilities**
- ✅ TestConfirmer pending/confirm tracking
- ✅ Unconfirmed detection
- ✅ TestJournal and TestDocumentStore aliases
- ✅ TestSupervisor/TestJournalSupervisor error tracking

### Example Test

```typescript
import { describe, it, expect } from 'vitest'
import { TestJournal, TestDocumentStore, TestConfirmer } from 'domo-tactical/testkit'
import { EventSourcedEntity, DomainEvent } from 'domo-tactical'

describe('Bank Account', () => {
  it('should track balance through events', async () => {
    const journal = new TestJournal<string>()
    const account = new BankAccount('acc-1')
    account.setJournal(journal) // best for tests

    await account.open(1000)
    await account.deposit(500)
    await account.withdraw(200)

    expect(account.getBalance()).toBe(1300)

    // Verify events were persisted
    const stream = await journal.streamReader('acc-1').readStream('acc-1')
    expect(stream.entries).toHaveLength(3)
  })
})
```

## Building and Publishing

### Build
```bash
npm run build    # Compile TypeScript to dist/
npm run clean    # Remove dist/
```

### Documentation
```bash
npm run docs        # Generate TypeDoc
npm run docs:serve  # Serve docs locally
```

### Publishing
```bash
npm version patch   # Bump version
npm publish        # Publish to npm
```

## Dependencies

- **domo-actors@^1.2.0** - Actor model foundation

### Development
- **typescript@^5.7.2** - TypeScript compiler
- **vitest@^2.1.8** - Test framework
- **typedoc@^0.28.14** - Documentation generator
- **@vitest/coverage-v8@^2.1.8** - Coverage reporting

## Comparison with XOOM/Lattice

| Feature | XOOM/Lattice (Java) | DomoTactical-TS |
|---------|---------------------|-----------------|
| Base Actor | `io.vlingo.xoom.actors.Actor` | `domo-actors.Actor` |
| Async Pattern | `Completes<T>` + callbacks | `Promise<T>` |
| Result Type | `Outcome<F, S>` | `Outcome<F, S>` |
| Null Safety | `Optional<T>` | `T \| null` |
| Versioning | `SemanticVersion` | `number` (int) |
| Metadata | Object + Map | Map only (simpler) |
| State Types | Binary, Text | Binary, Text, Object |
| Generics | Java generics | TypeScript generics |
| Error Handling | Checked exceptions | Unchecked errors + Promises |

## Current Status & Roadmap

### ✅ Implemented

- ✅ Event Sourcing with EventSourcedEntity
- ✅ Command Sourcing with CommandSourcedEntity
- ✅ InMemoryJournal with stream readers
- ✅ Document Store for query models
- ✅ Complete CQRS projection pipeline
- ✅ Entry adapters for schema evolution
- ✅ Test utilities (TestJournal, TestDocumentStore, TestConfirmer)
- ✅ Snapshot support
- ✅ Pattern-based projection matching
- ✅ At-least-once projection delivery
- ✅ Actor-based entities with DomoActors integration

### 🚧 Future Enhancements

1. **Additional Journal Implementations**
   - PostgreSQL event store
   - MongoDB event store
   - SQLite event store
   - EventStoreDB adapter

   **Messaging and Dispatching**
   - Redis streams integration
   - Kafka log and streams integration

2. **Document Store Implementations**
   - PostgreSQL document store
   - MongoDB document store
   - Redis document cache
   - Elasticsearch for full-text search

3. **Query Optimizations**
   - Indexed queries
   - Computed projections
   - Projection caching strategies
   - Read-through caching

4. **Snapshot Strategies**
   - Configurable snapshot intervals
   - Snapshot compression
   - Snapshot migration utilities
   - Automatic snapshot cleanup

5. **Advanced Patterns**
   - Saga/Process Manager support
   - Aggregate root helpers
   - Domain event publishing to message brokers
   - Distributed tracing integration
   - Outbox pattern implementation

6. **Developer Tooling**
   - Event migration tools
   - Stream debugging utilities
   - Performance profiling
   - Event replay utilities
   - Projection monitoring dashboard

7. **Production Features**
   - Health checks for projections
   - Projection lag monitoring
   - Dead letter queue for failed projections
   - Projection versioning
   - Blue-green projection deployments

## License

Licensed under the Reciprocal Public License 1.5 (RPL-1.5)

See LICENSE.md for details.

## Credits

Based on:
- **VLINGO/XOOM Lattice** - Original Java implementation
- **DomoActors-TS** - Actor model foundation
- Authored by Vaughn Vernon

---

**DomoTactical-TS** - _Use it!_


## About the Creator and Author

**Vaughn Vernon**

- **Creator of the XOOM Platform**
  - [Product conceived 10 years before GenAI was hip hype](https://kalele.io/xoom-platform/)
  - [Docs](https://docs.vlingo.io)
  - [Modeling Tools Docs](https://docs.vlingo.io/xoom-lattice)
  - [Actors Docs](https://docs.vlingo.io/xoom-actors)
  - [Reference implementation in Java](https://github.com/vlingo)
- **Books**:
  - [_Implementing Domain-Driven Design_](https://www.informit.com/store/implementing-domain-driven-design-9780321834577)
  - [_Reactive Messaging Patterns with the Actor Model_](https://www.informit.com/store/reactive-messaging-patterns-with-the-actor-model-applications-9780133846881)
  - [_Domain-Driven Design Distilled_](https://www.informit.com/store/domain-driven-design-distilled-9780134434421)
  - [_Strategic Monoliths and Microservices_](https://www.informit.com/store/strategic-monoliths-and-microservices-driving-innovation-9780137355464)
- **Live and In-Person Training**:
  - [_Implementing Domain-Driven Design_ and others](https://kalele.io/training/)
- *__LiveLessons__* video training:
  - [_Domain-Driven Design Distilled_](https://www.informit.com/store/domain-driven-design-livelessons-video-training-9780134597324)
    - Available on the [O'Reilly Learning Platform](https://www.oreilly.com/videos/domain-driven-design-distilled/9780134593449/)
