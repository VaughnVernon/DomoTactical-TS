# Changelog

All notable changes to DomoTactical-TS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-01-27

### Breaking Changes

#### Actor-Based Storage Components

All storage interfaces (`Journal`, `DocumentStore`, `JournalReader`, `StreamReader`) now extend `ActorProtocol` from domo-actors. Storage components must be created via `stage().actorFor()` instead of direct instantiation.

**Before (0.1.x):**
```typescript
// Direct instantiation - NO LONGER WORKS
const journal = new InMemoryJournal<string>()
const documentStore = new InMemoryDocumentStore()
```

**After (0.2.0):**
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

#### JournalReader Methods Now Async

`JournalReader.position()` and `JournalReader.name()` are now async methods that return `Promise`:

**Before (0.1.x):**
```typescript
const pos = reader.position()    // number
const name = reader.name()       // string
```

**After (0.2.0):**
```typescript
const pos = await reader.position()    // Promise<number>
const name = await reader.name()       // Promise<string>
```

### Added

#### Bounded Context Support

New factory functions to create bounded context-specific entity base classes:

```typescript
import { eventSourcedEntityTypeFor, commandSourcedEntityTypeFor } from 'domo-tactical/model/sourcing'

// Create a base class for the "bank" bounded context
const BankEventSourcedEntity = eventSourcedEntityTypeFor('bank')
const BankCommandSourcedEntity = commandSourcedEntityTypeFor('bank')

// Use as the base for your entities
class AccountActor extends BankEventSourcedEntity implements Account {
  // This entity uses the journal at 'domo-tactical:bank.journal'
}

class TransferCoordinator extends BankCommandSourcedEntity {
  // This entity uses the journal at 'domo-tactical:bank.journal'
}
```

The `SourcedEntity` base class now includes:
- `contextName()` - Override to specify bounded context (default: `'default'`)
- `journalKey()` - Returns `'domo-tactical:<contextName>.journal'`

Register journals for bounded contexts:
```typescript
stage().registerValue('domo-tactical:bank.journal', journal)
stage().registerValue('domo-tactical:bank.documentStore', documentStore)
```

#### TestSupervisor Interface

New `TestSupervisor` interface extends `Supervisor` with error tracking methods for testing:

```typescript
import { TestSupervisor, TestJournalSupervisor } from 'domo-tactical/testkit'

export interface TestSupervisor extends Supervisor {
  errorRecoveryCount(): Promise<number>  // Number of errors handled
  lastError(): Promise<string | null>    // Message of last error
  reset(): Promise<void>                 // Reset tracking state
}
```

#### TestJournalSupervisor

New supervisor implementation for tracking error recovery in tests:

```typescript
const SUPERVISOR_NAME = 'test-supervisor'

// IMPORTANT: type() must match the supervisor name
const supervisorProtocol: Protocol = {
  type: () => SUPERVISOR_NAME,
  instantiator: () => ({ instantiate: () => new TestJournalSupervisor() })
}
const supervisor = stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default')

// Create actors under this supervisor
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME)

// Wait for error recovery in tests
async function waitForErrorRecovery(supervisor: TestSupervisor, expectedCount: number) {
  while (await supervisor.errorRecoveryCount() < expectedCount) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}
```

**Important:** The supervisor's protocol `type()` must match the supervisor name used when creating other actors, because `Environment.supervisor()` looks up supervisors by type in the actor directory.

#### Supervisor Inheritance

JournalReader and StreamReader actors now inherit the supervisor from their parent Journal. This means errors in child actors are handled by the same supervisor that handles the Journal.

```typescript
// InMemoryJournal propagates its supervisor to child actors
private supervisorName(): string {
  return this.environment().supervisorName()
}
```

### Changed

#### Exports

- `JournalReader` is now exported from the main `domo-tactical` package
- `TestSupervisor` and `TestJournalSupervisor` are exported from `domo-tactical/testkit`

#### Documentation

- Updated `docs/DomoTactical.md` with:
  - Actor-based storage documentation
  - Custom supervisor usage
  - Bounded context support
  - TestSupervisor/TestJournalSupervisor documentation
  - Updated JournalReader interface (async methods)
  - Updated project structure
  - Updated test count (177 tests)

- API documentation now includes testkit types:
  - `interfaces/testkit.TestSupervisor.html`
  - `classes/testkit.TestJournalSupervisor.html`
  - `classes/testkit.TestConfirmer.html`
  - `interfaces/JournalReader.html`

### Migration Guide

#### 1. Update Storage Creation

Replace direct instantiation with actor creation:

```typescript
// Old
const journal = new InMemoryJournal<string>()

// New
const journalProtocol: Protocol = {
  type: () => 'Journal',
  instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
}
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, 'default')
```

#### 2. Update JournalReader Usage

Add `await` to `position()` and `name()` calls:

```typescript
// Old
const pos = reader.position()

// New
const pos = await reader.position()
```

#### 3. Register Journals for Bounded Contexts

If using bounded context-specific entities:

```typescript
// Create and register journal for your bounded context
stage().registerValue('domo-tactical:mycontext.journal', journal)

// Create entity using context-specific base class
const MyContextEntity = eventSourcedEntityTypeFor('mycontext')
class MyEntity extends MyContextEntity {
  // ...
}
```

#### 4. Update Test Supervisors (Optional)

If you need to track error recovery in tests:

```typescript
import { TestJournalSupervisor, TestSupervisor } from 'domo-tactical/testkit'

const SUPERVISOR_NAME = 'test-supervisor'

const supervisorProtocol: Protocol = {
  type: () => SUPERVISOR_NAME,  // Must match supervisor name
  instantiator: () => ({ instantiate: () => new TestJournalSupervisor() })
}
const supervisor = stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default')

// Create actors under this supervisor
const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME)
```

## [0.1.2] - 2025-11-21

### Fixed
- Fixed off-by-one total transactions count

## [0.1.1] - 2025-11-21

### Fixed
- Patch to fix npm release information
- Corrected badges

## [0.1.0] - 2025-11-21

### Added
- Initial release
- Event Sourcing with `EventSourcedEntity`
- Command Sourcing with `CommandSourcedEntity`
- `InMemoryJournal` with stream readers
- `InMemoryDocumentStore` for query models
- Complete CQRS projection pipeline
- Entry adapters for schema evolution
- Test utilities (`TestJournal`, `TestDocumentStore`, `TestConfirmer`)
- Snapshot support
- Pattern-based projection matching
- At-least-once projection delivery
- Actor-based entities with DomoActors integration
