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
Error type for failed source application.

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
- Default text-based adapter

```typescript
// Define custom adapter
class UserRegisteredAdapter implements EntryAdapter<UserRegistered, string> {
  toEntry(source: UserRegistered, metadata: Metadata): Entry<string> {
    return {
      type: 'UserRegistered',
      typeVersion: source.sourceTypeVersion,
      entryData: JSON.stringify({
        userId: source.userId,
        username: source.username,
        email: source.email
      }),
      metadata: JSON.stringify(metadata)
    }
  }

  fromEntry(entry: Entry<string>): UserRegistered {
    const data = JSON.parse(entry.entryData as string)
    return new UserRegistered(data.userId, data.username, data.email)
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
import { StateAdapter, TextState, Metadata } from 'domo-tactical'

class AccountStateAdapter implements StateAdapter<AccountState, TextState> {
  toRawState(id: string, state: AccountState, stateVersion: number, metadata: Metadata): TextState {
    return new TextState(id, JSON.stringify({
      accountId: state.accountId,
      balance: state.balance,
      status: state.status
    }), stateVersion, metadata, 'AccountState', 1)
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
  EntryRegistry, ContextProfile,

  // Journal types
  Journal, AppendResult, Entry, EntityStream, Outcome,
  InMemoryJournal,

  // Document store types
  DocumentStore, InMemoryDocumentStore,

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
  EntryRegistry, ContextProfile
} from 'domo-tactical/store'
```

### Journal Subpath
```typescript
import {
  Journal, JournalReader, AppendResult,
  Entry, EntityStream, Outcome,
  InMemoryJournal,
  JournalConsumer, JournalConsumerActor
} from 'domo-tactical/store/journal'
```

### Document Store Subpath
```typescript
import {
  DocumentStore, DocumentBundle,
  ReadResult, WriteResult,
  InMemoryDocumentStore
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
  ProjectToDescription, MatchableProjections
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
  ProjectionSupervisor, ProjectToDescription
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

// Create projection supervisor
const supervisor = stage().actorFor(
  { type: () => 'ProjectionSupervisor',
    instantiator: () => ({ instantiate: () => new ProjectionSupervisor() })
  },
  undefined,
  'default'
)

// Create projection
const projection = stage().actorFor(
  { type: () => 'UserProfileProjection',
    instantiator: () => ({ instantiate: () => new UserProfileProjection() })
  },
  undefined,
  'projection-supervisor'
)

// Create dispatcher
const dispatcher = stage().actorFor(
  { type: () => 'Dispatcher',
    instantiator: () => ({
      instantiate: (def) => new TextProjectionDispatcherActor(def.parameters()[0])
    })
  },
  undefined,
  'projection-supervisor',
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
  'projection-supervisor',
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
