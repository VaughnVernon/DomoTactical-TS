# DomoTactical-TS Bank Example

This example demonstrates a complete banking system using **DomoTactical-TS** with event sourcing, showcasing the key patterns and capabilities of the library.

## Overview

An interactive command-line banking application featuring:
- **Event Sourcing** - All entities use `EventSourcedEntity` with domain events
- **Shared Journal** - Single `InMemoryJournal` for all event-sourced entities
- **Actor Model** - Parent-child hierarchies, supervision, and message passing
- **Domain Events** - Rich events for Account, Bank, and TransferCoordinator
- **CQRS Pattern** - Commands modify state, queries use read models
- **Transfer Coordination** - Multi-step asynchronous transfers with retry logic
- **Supervision** - "Let it crash" with contextual error reporting

## Architecture

### Project Structure

```
examples/bank/
├── bank.ts                                  # Interactive CLI application
├── README.md                                # This file
│
├── model/                                   # Domain Model (Command Model/Write Side)
│   ├── AccountActor.ts                      # EventSourcedEntity for accounts
│   ├── AccountEvents.ts                     # Account domain events
│   ├── BankActor.ts                         # EventSourcedEntity for bank
│   ├── BankEvents.ts                        # Bank domain events
│   ├── BankTypes.ts                         # Protocol interfaces
│   ├── TellerActor.ts                       # Plain Actor (service layer)
│   ├── TransferCoordinatorActor.ts          # EventSourcedEntity for transfers
│   ├── TransferEvents.ts                    # Transfer lifecycle events
│   ├── index.ts
│   └── supervisors/                         # Supervision Strategies
│       ├── AccountSupervisor.ts             # Supervises Account actors
│       ├── BankSupervisor.ts                # Supervises Bank and Teller actors
│       ├── TransferSupervisor.ts            # Supervises TransferCoordinator
│       └── FailureInformant.ts              # Context-aware error formatting
│
├── infra/                                   # Infrastructure Layer
│   ├── adapters/                            # Entry Adapters (Schema Evolution)
│   │   ├── AccountOpenedAdapter.ts          # Custom serialization for AccountOpened
│   │   ├── FundsDepositedAdapter.ts         # Custom serialization for FundsDeposited
│   │   ├── FundsRefundedAdapter.ts          # Custom serialization for FundsRefunded
│   │   ├── FundsWithdrawnAdapter.ts         # Custom serialization for FundsWithdrawn
│   │   └── index.ts
│   └── projections/                         # CQRS Read-Side Projections
│       ├── AccountSummaryProjectionActor.ts # Account balance read model
│       ├── BankStatisticsProjectionActor.ts # Bank-wide statistics
│       ├── TransactionHistoryProjectionActor.ts # Transaction history view
│       └── index.ts
│
└── queries/                                 # Query Model (Read Side)
    └── QueryHandler.ts                      # Plain Actor for querying views
```

## Key Components

### Event-Sourced Entities

#### 1. **AccountActor** (EventSourcedEntity)

Bank accounts that maintain state through domain events:

**Events:**
- `AccountOpened` - Initial account creation
- `FundsDeposited` - Money added to account
- `FundsWithdrawn` - Money removed from account
- `FundsRefunded` - Money refunded (from failed transfers)

**Features:**
- Event handler registration via static initializer
- Transaction history via child TransactionHistoryActor
- Snapshot support for state restoration
- Business rule enforcement (no overdrafts, positive amounts)

#### 2. **BankActor** (EventSourcedEntity)

Root coordinator managing all accounts and transfers:

**Events:**
- `BankAccountOpened` - Bank-level record of new account
- `BankAccountFrozen` - Account suspension
- `BankAccountClosed` - Account termination

**Features:**
- Creates and manages Account child actors
- Delegates operations to appropriate accounts
- Coordinates with TransferCoordinator
- Shares journal with all child entities

#### 3. **TransferCoordinatorActor** (EventSourcedEntity)

Manages multi-step transfer workflow:

**Events:**
- `TransferInitiated` - Transfer requested
- `TransferWithdrawn` - Funds withdrawn from source
- `TransferDepositAttempted` - Deposit attempt logged
- `TransferDepositFailed` - Deposit failure recorded
- `TransferCompleted` - Transfer succeeded
- `TransferRefunded` - Transfer failed and refunded

**Features:**
- Realistic banking transfer flow
- Exponential backoff retry logic
- Automatic refund on max retries
- Pending transfer tracking

### Plain Actors

#### 4. **TellerActor** (Plain Actor)

Service layer handling CLI input and validation:

**Features:**
- Parses user input
- Validates and formats requests
- Delegates to Bank actor
- "Let it crash" for invalid input (supervisor handles errors)

#### 5. **TransactionHistoryActor** (Plain Actor, in queries/)

Query-side actor maintaining transaction views:

**Features:**
- Records transactions from events
- Provides transaction history queries
- Future: Will query materialized views from projections

### Supervisors

Custom supervision strategies with contextual error reporting:

- **BankSupervisor** - Handles Bank and Teller failures
- **AccountSupervisor** - Handles Account and TransactionHistory failures
- **TransferSupervisor** - Handles TransferCoordinator failures
- **FailureInformant** - Formats context-aware error messages

All supervisors use `Resume` directive to continue after errors.

## Domain Events

### Account Events
```typescript
AccountOpened(accountNumber, owner, accountType, initialBalance)
FundsDeposited(accountNumber, amount, transactionId)
FundsWithdrawn(accountNumber, amount, transactionId)
FundsRefunded(accountNumber, amount, originalTransactionId, reason)
```

### Bank Events
```typescript
BankAccountOpened(bankId, accountNumber, owner, accountType, initialBalance)
BankAccountFrozen(bankId, accountNumber, reason)
BankAccountClosed(bankId, accountNumber, finalBalance)
```

### Transfer Events
```typescript
TransferInitiated(coordinatorId, transactionId, from, to, amount)
TransferWithdrawn(coordinatorId, transactionId, from, amount)
TransferDepositAttempted(coordinatorId, transactionId, to, attemptNumber)
TransferDepositFailed(coordinatorId, transactionId, to, reason, attemptNumber)
TransferCompleted(coordinatorId, transactionId, from, to, amount)
TransferRefunded(coordinatorId, transactionId, from, amount, reason)
```

## Running the Example

### Prerequisites

1. Build the project:
   ```bash
   npm run build
   ```

2. Make sure you have a TypeScript runner installed:
   ```bash
   npm install -g tsx
   # or use ts-node
   ```

### Execute

```bash
tsx examples/bank/bank.ts
```

Or with ts-node:
```bash
ts-node examples/bank/bank.ts
```

## Usage Guide

### Interactive Menu

```
╔════════════════════════════════════════╗
║   DomoTactical-TS Bank Example         ║
╠════════════════════════════════════════╣
║  1. Open Account                       ║
║  2. Deposit Funds                      ║
║  3. Withdraw Funds                     ║
║  4. Transfer Funds                     ║
║  5. Account Summary                    ║
║  6. Transaction History                ║
║  7. List All Accounts                  ║
║  8. Pending Transfers                  ║
║  9. Bank Statistics                    ║
║  0. Exit                               ║
╚════════════════════════════════════════╝
```

### Example Session

1. **Open an account:**
   ```
   Choice: 1
   Owner name: Alice Smith
   Account type: checking
   Initial balance: 1000

   ✅ Account opened successfully with account id: ACC000001
   ```

2. **Deposit funds:**
   ```
   Choice: 2
   Account Number: ACC000001
   Amount: 500

   ✅ Deposit successful. New balance: $1500.00
   ```

3. **Transfer funds:**
   ```
   Choice: 4
   From Account Number: ACC000001
   To Account Number: ACC000002
   Amount: 250

   ✅ Transfer initiated successfully
      Transaction ID: txn-1234567890-abc123
      Note: Transfer is processed asynchronously with retry logic
   ```

4. **View transaction history:**
   ```
   Choice: 6
   Account Number: ACC000001
   Limit: 5

   Showing 3 transaction(s):

   ┌─────────────────────────────────────────────────────────
   │ ID:          ACC000001
   │ Type:        deposit
   │ Amount:      $1000.00
   │ Balance:     $1000.00
   │ Timestamp:   2025-11-16T12:00:00
   │ Description: Initial deposit
   └─────────────────────────────────────────────────────────
   ...
   ```

## Key Concepts Demonstrated

### 1. Event Sourcing with EventSourcedEntity

```typescript
export class AccountActor extends EventSourcedEntity implements Account {
  static {
    // Register event handlers
    EventSourcedEntity.registerConsumer(AccountActor, FundsDeposited, (account, event) => {
      account.balance += event.amount
    })
  }

  async deposit(amount: number): Promise<number> {
    const event = new FundsDeposited(this.accountNumber, amount)
    await this.apply(event)  // Applies event with invisible persistence
    return this.balance
  }
}
```

### 2. Shared Journal for All Entities

```typescript
// In bank.ts
const journal = new InMemoryJournal<string>()

// All EventSourcedEntity instances share the same journal
stage().registerValue('domo-tactical:bank.journal', journal)

// Or...
// setJournal() is not recommended for production; best for tests
// or when there are multiple Journal instance for a single context.
// see above: stage().registerValue('domo-tactical:bank.journal', journal)
bank.setJournal(journal)
account.setJournal(journal)
transferCoordinator.setJournal(journal)
```

### 3. Actor Hierarchies and Supervision

```
┌─────────────────────────────────────────┐
│          BankSupervisor                 │
│  ┌────────────────────────────────┐     │
│  │  Bank (EventSourcedEntity)     │     │
│  │  ┌──────────────────────────┐  │     │
│  │  │ TransferCoordinator (ES) │  │     │
│  │  └──────────────────────────┘  │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│       AccountSupervisor                 │
│  ┌────────────────────────────────┐     │
│  │  Account (EventSourcedEntity)  │     │
│  │  ┌──────────────────────────┐  │     │
│  │  │ TransactionHistory       │  │     │
│  │  └──────────────────────────┘  │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

### 4. Transfer Workflow

1. **Initiate** → `TransferInitiated` event
2. **Withdraw** → `FundsWithdrawn` + `TransferWithdrawn` events
3. **Attempt Deposit** → `TransferDepositAttempted` event
4. **On Success** → `FundsDeposited` + `TransferCompleted` events
5. **On Failure** → Retry with backoff, or `FundsRefunded` + `TransferRefunded` events

### 5. "Let It Crash" Supervision

```typescript
// TellerActor deliberately crashes on invalid input
async deposit(request: DepositRequest): Promise<number> {
  const amount = parseFloat(request.amount)  // Crashes if not a number
  return await this.bank.deposit(request.accountNumber, amount)
}

// Supervisor catches crash, logs context-aware error, resumes actor
```

## CQRS Projections

The example now includes a complete CQRS implementation with projections in `infra/projections/`:

### Implemented Projections

1. **AccountSummaryProjectionActor** - Maintains account balance read models
   - Projects `AccountOpened`, `FundsDeposited`, `FundsWithdrawn` events
   - Stores in DocumentStore for fast account queries
   - Provides current balance without replaying all events

2. **BankStatisticsProjectionActor** - Bank-wide statistics
   - Tracks total accounts, total deposits, total withdrawals
   - Aggregates data across all accounts
   - Real-time statistics updated from event stream

3. **TransactionHistoryProjectionActor** - Transaction history view
   - Maintains chronological transaction list per account
   - Denormalized view for fast transaction queries
   - Includes transaction type, amount, timestamp, description

### Entry Adapters

Custom entry adapters in `infra/adapters/` demonstrate schema evolution:
- Version-specific serialization for events
- Custom JSON handling for AccountOpened, FundsDeposited, etc.
- Future-proof event schema changes

### Architecture

```
Comman Model (Write Side)      Query Model (Read Side)
┌─────────────────┐            ┌─────────────────┐
│ AccountActor    │    ┌──────▶│ Projections     │
│ (EventSourced)  │    │       │ - AccountSummary│
└─────────────────┘    │       │ - BankStats     │
        │           events     │ - TxnHistory    │
        ▼              │       └────────┬────────┘
┌─────────────────┐    │                │
│ InMemoryJournal │────┘                ▼
│ (Event Streams) │            ┌─────────────────┐
└─────────────────┘            │ DocumentStore   │
                               │ (Query Model)   │
                               └─────────────────┘
```

## Documentation

- [DomoTactical Overview](../../docs/DomoTactical.md)
- [DomoActors Documentation](https://github.com/VaughnVernon/DomoActors-TS)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Actor Model](https://www.reactive-streams.org/)

## License

Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
Licensed under the Reciprocal Public License 1.5


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
