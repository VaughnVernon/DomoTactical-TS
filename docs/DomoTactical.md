# DomoTactical-TS Documentation ✅

**DomoTactical-TS** is a comprehensive TypeScript implementation of Domain-Driven Design (DDD) tactical patterns based on the VLINGO/XOOM Lattice library. It provides a complete CQRS/Event Sourcing framework built on the DomoActors actor model, with production-ready abstractions and in-memory implementations for rapid development.

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
  NoTypeStore
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
}
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

  isSuccess(): boolean
  isFailure(): boolean
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
Interface for reading journal entries sequentially (for projections).

**Key Features:**
- Sequential entry reading
- Position tracking
- Seek and rewind support
- Named readers with independent positions

```typescript
export interface JournalReader<T> {
  name(): string
  position(): number
  readNext(max: number): Promise<Entry<T>[]>
  rewind(): Promise<void>
  seek(position: number): Promise<void>
}

// Usage
const reader = await journal.journalReader('my-projection')
let entries = await reader.readNext(100)  // Read first batch
entries = await reader.readNext(100)      // Read next batch
await reader.rewind()                     // Start over
```

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
EntryAdapterProvider.getInstance()
  .registerAdapter(UserRegistered, new UserRegisteredAdapter())
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
  EntryAdapterProvider
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
  CommandSourcedEntity
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
  TestJournal,
  TestDocumentStore
} from 'domo-tactical/testkit'
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

  isSuccess(): boolean
  isFailure(): boolean
}
```

### 3. Modern TypeScript Patterns
- Proper generics for type safety
- Discriminated unions (Outcome type)
- Abstract classes with protected constructors
- Method overloading where appropriate
- Null handling without Java's Optional

### 4. DomoActors Integration
EntityActor extends Actor from domo-actors@1.0.2:

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

The project includes comprehensive tests using Vitest (171 tests passing):

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

### Production
- **domo-actors@^1.0.2** - Actor model foundation

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
