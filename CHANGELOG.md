# Changelog

All notable changes to DomoTactical-TS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-02-05

### Added

#### StoreTypeMapper - Storage Type Name Mapping

New `StoreTypeMapper` class provides bidirectional mapping between type/class names and symbolic storage names. This enables storage abstraction and protects against class renaming.

**Key Features:**
- Single registration creates bidirectional mapping (type ↔ symbolic)
- Convention-based fallback (PascalCase ↔ kebab-case) when no mapping registered
- Works for both Entry types (events/commands) and State types (documents)
- Fluent API for chaining registrations

**Usage:**

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
```

**Convention-Based Fallback (no registration needed):**

```typescript
mapper.toSymbolicName('UserRegistered')  // 'user-registered'
mapper.toTypeName('user-registered')     // 'UserRegistered'
mapper.toSymbolicName('XMLParser')       // 'xml-parser'
mapper.toTypeName('name')                // 'Name'
```

**New Exports:**
- `StoreTypeMapper` class from `domo-tactical` and `domo-tactical/store`

#### Default Adapters Now Use StoreTypeMapper

`DefaultTextEntryAdapter` and `DefaultTextStateAdapter` now automatically use `StoreTypeMapper` for bidirectional type name conversion:

- **`toEntry()` / `toRawState()`**: Converts PascalCase type names to kebab-case symbolic names for storage
- **`fromEntry()` / `fromRawState()`**: Converts kebab-case symbolic names back to PascalCase type names for adapter lookup and upcasting

**Why This Matters:**
- Entries stored in the journal now use consistent kebab-case type names (e.g., `user-registered` instead of `UserRegistered`)
- States stored in the document store use kebab-case type names (e.g., `account-state` instead of `AccountState`)
- Schema evolution logic receives the proper PascalCase type name for adapter lookup

**Custom Adapters:**

Custom adapters are NOT required to use `StoreTypeMapper`. However, if you want consistent naming with the default adapters, you can use it:

```typescript
class UserRegisteredAdapter extends DefaultTextEntryAdapter<UserRegistered> {
  override toEntry(source: UserRegistered, streamVersion: number, metadata: Metadata): TextEntry {
    // Map type name to symbolic name for storage (best practice)
    const symbolicType = StoreTypeMapper.instance().toSymbolicName('UserRegistered')

    return new TextEntry(
      source.id(),
      symbolicType,  // 'user-registered'
      2,             // typeVersion
      JSON.stringify({ ... }),
      streamVersion,
      JSON.stringify(metadata)
    )
  }
}
```

### Changed

#### State Constructor Simplified (Breaking Change for Custom Adapters)

The `State` class (and subclasses `TextState`, `ObjectState`, `BinaryState`) constructor signature has been simplified to align with how `Entry` works:

**Before:**
```typescript
new TextState(id, stateType: Function, typeVersion, data, dataVersion, metadata?, symbolicType?)
```

**After:**
```typescript
new TextState(id, type: string, typeVersion, data, dataVersion, metadata?)
```

**Key Changes:**
- The `type` parameter is now a `string` instead of a `Function` (class constructor)
- The `symbolicType` parameter has been removed - the adapter passes the type name directly
- The `stateType` field has been removed from State (it was never used)

**Migration:**
If you have custom `StateAdapter` implementations, update `toRawState()` to pass a string type:

```typescript
// Before
return new TextState(id, AccountState, 2, data, stateVersion, metadata, 'account-state')

// After - pass type string directly (adapter decides the name)
return new TextState(id, 'account-state', 2, data, stateVersion, metadata)
```

This change makes `State` consistent with `Entry`, where the adapter is fully responsible for deciding what type name to use (symbolic or concrete).

#### InMemoryDocumentStore Now Uses StateAdapterProvider

`InMemoryDocumentStore` now uses `StateAdapterProvider` for state serialization and deserialization, matching the pattern used by `InMemoryJournal` with `EntryAdapterProvider`.

**Benefits:**
- Consistent adapter pattern across Journal and DocumentStore
- Enables custom state adapters with schema evolution
- Uses `DefaultTextStateAdapter` as fallback when no custom adapter registered

**Impact:**
- No breaking changes - default behavior unchanged
- Custom `StateAdapter` implementations are now applied during `read()` and `write()` operations

#### Bank Example Updates

The Bank example (`examples/bank/bank.ts`) now demonstrates `StoreTypeMapper` usage:

```typescript
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

### Documentation

- Added `StoreTypeMapper` section to `docs/DomoTactical.md`
- Updated import documentation to include `StoreTypeMapper`
- Added Bank example code showing type mapping registration
- Added **Stream Evolution Patterns** section to `docs/DomoTactical.md`:
  - Stream Branching (Splitting): Soft delete + replay, truncate + continue patterns
  - Stream Merging (Joining): Replay to new stream, redirect pattern (no data movement)
  - Best practices table for different scenarios
  - Metadata for traceability examples

## [0.4.0] - 2026-02-03

### Added

#### Default Supervisors

New built-in supervisors with comprehensive error handling for different actor types, following the "let it crash" philosophy.

**DefaultJournalSupervisor** - For journal-backed actors (event/command sourced entities):
- Resume for concurrency conflicts (optimistic locking violations)
- Resume for business logic errors (validation, not found, insufficient funds)
- Restart for state corruption or internal consistency errors
- Resume for storage failures (external recovery by k8s, admins, etc.)

**DefaultDocumentStoreSupervisor** - For document store-backed actors (stateful entities, projections):
- Resume for storage failures (external recovery)
- Restart for serialization/schema/JSON errors
- Restart for state corruption
- Resume for concurrency conflicts
- Resume for business logic errors

**Convenience Functions:**
```typescript
import {
  defaultJournalSupervisor,
  DEFAULT_JOURNAL_SUPERVISOR,
  defaultDocumentStoreSupervisor,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR,
  defaultProjectionSupervisor,
  DEFAULT_PROJECTION_SUPERVISOR
} from 'domo-tactical'

// Create supervisors with standard names
defaultJournalSupervisor()
defaultDocumentStoreSupervisor()
defaultProjectionSupervisor()

// Create actors under these supervisors
const journal = stage().actorFor<Journal<string>>(
  journalProtocol,
  undefined,
  DEFAULT_JOURNAL_SUPERVISOR
)

const projection = stage().actorFor<Projection>(
  projectionProtocol,
  undefined,
  DEFAULT_PROJECTION_SUPERVISOR
)
```

**New Exports:**
- `DefaultJournalSupervisor` class
- `defaultJournalSupervisor()` function
- `DEFAULT_JOURNAL_SUPERVISOR` constant (`'default-journal-supervisor'`)
- `DefaultDocumentStoreSupervisor` class
- `defaultDocumentStoreSupervisor()` function
- `DEFAULT_DOCUMENT_STORE_SUPERVISOR` constant (`'default-document-store-supervisor'`)
- `defaultProjectionSupervisor()` function
- `DEFAULT_PROJECTION_SUPERVISOR` constant (`'default-projection-supervisor'`)

**Note:** `defaultProjectionSupervisor()` creates a `DefaultDocumentStoreSupervisor` with the name `'default-projection-supervisor'`, allowing users to create custom projection supervisors if needed.

### Fixed

#### SourcedEntity Snapshot Bug

Fixed a bug in `SourcedEntity.ts` where `Applicable` was always instantiated with `null` for state instead of passing the actual snapshot. This affected error handling in `afterApplyFailed()` when snapshots were present.

### Changed

#### Documentation

- Added comprehensive documentation for default supervisors in `docs/DomoTactical.md`
- Added directive decision tables showing error handling behavior
- Added "Note on Storage Failures" explaining Resume rationale for storage errors
- Added complete usage examples for supervisor creation
- Updated `afterApplyFailed()` documentation to recommend using custom Supervisors

## [0.3.0] - 2026-01-29

### Changed

#### ESM Module Resolution

All TypeScript source files now use explicit `.js` extensions in imports for proper ECMAScript Module (ESM) compatibility. This enables the compiled JavaScript to run directly in Node.js without bundlers.

**What Changed:**
- All relative imports now include `.js` extensions (e.g., `import { Foo } from './Foo.js'`)
- Directory imports now use explicit `/index.js` paths (e.g., `import { Bar } from './store/index.js'`)
- Updated `domo-actors` dependency to `^1.2.0` (which also has ESM fixes)

**Why This Matters:**
- Compiled JavaScript now works with direct `node` execution
- No longer requires bundlers (webpack, esbuild, etc.) or tsx for ESM resolution
- Better compatibility with modern Node.js ESM requirements

**No Breaking Changes:**
- Import paths in your code remain the same (e.g., `import { EventSourcedEntity } from 'domo-tactical'`)
- Only internal imports were updated

### Added

#### Stream Lifecycle Management

New stream lifecycle management features based on EventStoreDB/KurrentDB patterns.

**New Stream Operations:**

- `journal.tombstone(streamName)` - Permanently delete a stream (hard delete). Stream cannot be reopened.
- `journal.softDelete(streamName)` - Mark stream as deleted but allow reopening by appending.
- `journal.truncateBefore(streamName, beforeVersion)` - Hide events before a version.
- `journal.streamInfo(streamName)` - Get stream state information.

**New Types:**

- `StreamState` enum - Expected version states for optimistic concurrency:
  - `StreamState.Any` (-2) - Skip version check
  - `StreamState.NoStream` (-1) - Expect stream doesn't exist
  - `StreamState.StreamExists` (-4) - Expect stream exists
- `StreamInfo` interface - Stream state information
- `TombstoneResult` - Result of tombstone operations
- `DeleteResult` - Result of soft delete operations
- `TruncateResult` - Result of truncate operations

**Optimistic Concurrency:**

Expected version validation is now enforced on all append operations:
- Concrete version (e.g., `5`) expects stream to be at version 4
- `StreamState.Any` bypasses version checking
- `StreamState.NoStream` requires stream to not exist
- `StreamState.StreamExists` requires stream to have at least one event

**EntryStream Enhancements:**

- `isTombstoned` flag - true if stream is permanently deleted
- `isSoftDeleted` flag - true if stream is soft-deleted
- `isDeleted()` method - true if either deleted flag is set
- Static factory methods: `tombstoned()`, `softDeleted()`, `empty()`

**AppendResult Enhancements:**

- `isConcurrencyViolation()` - Check if append failed due to version mismatch
- `isStreamDeleted()` - Check if append failed because stream was deleted
- `isSuccess()` now returns false for concurrency violations and stream deleted

**Result Enum:**

- Added `Result.StreamDeleted` value

**Usage Examples:**

```typescript
// Tombstone (hard delete)
const result = await journal.tombstone('user-123')
if (result.isSuccess()) {
  console.log('Stream permanently deleted')
}

// Soft delete
await journal.softDelete('order-456')
// Reopen by appending
await journal.append('order-456', nextVersion, event, metadata)

// Truncate old events
await journal.truncateBefore('account-789', 100)

// Check stream state
const info = await journal.streamInfo('stream-name')
if (info.isTombstoned) {
  console.log('Stream was permanently deleted')
}

// Optimistic concurrency
const result = await journal.append('stream', StreamState.NoStream, event, metadata)
if (result.isConcurrencyViolation()) {
  console.log('Stream already exists')
}
```

#### ContextProfile - Context-Scoped Source Registration

New `ContextProfile` class provides context-scoped EntryAdapterProvider instances with a fluent registration API. This solves two problems:

1. **Boilerplate Reduction**: Simple fluent API for registering Source types
2. **Test Isolation**: Each context has its own adapter registry, avoiding singleton issues

**New Classes:**

- `ContextProfile` - Context-scoped EntryAdapterProvider with fluent registration API
- `EntryRegistry` - Simple global registry (delegates to `ContextProfile.forContext('default')`)

**New Types:**

- `PropertyTransforms` - Record type for property transformation functions
- `SourceTypeSpec` - Configuration for a Source type with optional transforms
- `ContextSourceTypes` - Configuration for context factory functions

**New Source Date Utilities:**

- `Source.asDate(value)` - Static helper to convert number/string to Date (use as transform)
- `source.dateSourced()` - Instance method to get dateTimeSourced as Date
- `source.dateOf(propertyName)` - Instance method to get any property as Date

**Updated Context Functions:**

- `eventSourcedContextFor(contextName, config?)` - Now registers sources to context-specific EntryAdapterProvider
- `commandSourcedContextFor(contextName, config?)` - Now registers sources to context-specific EntryAdapterProvider

### Changed

- `EntryRegistry.register()` now delegates to `ContextProfile.forContext('default')`
- `SourcedEntity.entryAdapterProvider()` now returns context-specific provider if available
- `EntryAdapterProvider` constructor is now public for context-scoped instantiation
- Added `EntryAdapterProvider.defaultProvider()` convenience method for accessing the default context's provider
- Renamed `EntryAdapterProvider.getInstance()` to `EntryAdapterProvider.instance()`
- Added `StateAdapterProvider.instance()` (`getInstance()` deprecated but available for backward compatibility)
- `StateAdapterProvider` is now exported as a public API for custom state serialization

### Renamed (from earlier 0.3.0 development)

- `SourceConfig` → `SourceTypeSpec`
- `ContextConfiguration` → `ContextSourceTypes`

### Usage Examples

**Simple Global Registration:**
```typescript
EntryRegistry.register(AccountOpened)
EntryRegistry.register(FundsDeposited, { depositedAt: Source.asDate })
```

**Context-Scoped Registration (Fluent API):**
```typescript
ContextProfile.forContext('bank')
  .register(AccountOpened)
  .register(FundsDeposited, { depositedAt: Source.asDate })
  .register(AccountClosed, { closedAt: Source.asDate })

// Or with registerAll for simple types
ContextProfile.forContext('bank')
  .registerAll(AccountOpened, FundsTransferred)
  .register(FundsDeposited, { depositedAt: Source.asDate })
```

**Context Factory with Sources:**
```typescript
const BankEventSourcedEntity = eventSourcedContextFor('bank', {
  sources: [
    { type: AccountOpened },
    { type: FundsDeposited, transforms: { depositedAt: Source.asDate } }
  ]
})
```

**Test Isolation:**
```typescript
beforeEach(() => {
  ContextProfile.reset()
  EntryAdapterProvider.reset()
})
```

### Documentation

- Updated `docs/DomoTactical.md` with ContextProfile documentation
- Added fluent API examples
- Added test isolation workflow

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

#### Context Support

New factory functions to create context-specific entity base classes:

```typescript
import { eventSourcedEntityTypeFor, commandSourcedEntityTypeFor } from 'domo-tactical/model/sourcing'

// Create a base class for the "bank" context
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
- `contextName()` - Override to specify context (default: `'default'`)
- `journalKey()` - Returns `'domo-tactical:<contextName>.journal'`

Register journals for contexts:
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
  - Context support
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

#### 3. Register Journals for Contexts

If using context-specific entities:

```typescript
// Create and register journal for your context
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
