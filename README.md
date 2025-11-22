# DomoTactical-TS
Domo tactical domain modeling tools for TypeScript using DomoActors-TS.

[![License: RPL-1.5](https://img.shields.io/badge/License-RPL--1.5-blue.svg)](https://opensource.org/license/rpl-1-5)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/domo-actors.svg)](https://www.npmjs.com/package/domo-actors)
[![V8](https://img.shields.io/badge/V8-Compatible-orange.svg)](https://v8.dev/)
[![Runtimes](https://img.shields.io/badge/Runtimes-Browser%20%7C%20Node.js%20%7C%20Cloudflare%20%7C%20Deno%20%7C%20Bun-blue.svg)](https://github.com/VaughnVernon/DomoTactical-TS#requirements)
[![npm downloads](https://img.shields.io/npm/dt/domo-tactical.svg)](https://www.npmjs.com/package/domo-tactical)
[![GitHub stars](https://img.shields.io/github/stars/VaughnVernon/DomoTactical-TS.svg)](https://github.com/VaughnVernon/DomoTactical-TS/stargazers)

## Overview

DomoTactical-TS is a comprehensive Domain-Driven Design (DDD) tactical patterns library for TypeScript, built on the DomoActors actor model. It provides DDD-friendly implementations of:

- **Domain Model Actors** - Uses DomoActors (`npm domo-actors`) concurrency and supervision
- **Event Sourcing** - Persist and restore entity state from domain events
- **Command Sourcing** - Alternative sourcing using commands instead of events
- **CQRS Projections** - Build read models from event/command streams
- **Journal Storage** - Append-only event/command persistence with stream readers
- **Document Store** - Key-value storage for documents, read models, and serialized object state
- **Schema Evolution** - Versioned events/commands with custom adapters
- **Test Utilities** - In-memory implementations for rapid development and testing

### Key Features

- 🎭 **Actor-Based Aggregates** - Built on DomoActors for concurrency and fault tolerance
- 🔄 **Full CQRS Pipeline** - From commands/events through projections to read models
- 📦 **Zero Dependencies** - Pure V8 JavaScript, runs anywhere (Node.js, Deno, Bun, Cloudflare Workers)
- 🧪 **Test-Ready** - Complete testkit module with in-memory implementations
- 📘 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- 🔌 **Pluggable Storage** - Abstract interfaces for custom journal and document store implementations

## Requirements

- **Runtimes**: Node.js >= 18.0.0, Deno, Bun, Cloudflare Workers, or any V8-based JavaScript runtime
- **TypeScript**: >= 5.0.0 (for development)
- **DomoActors-TS**: >= 1.0.2

DomoTactical-TS and DomoActors-TS have zero Node.js-specific dependencies and runs on any V8-compatible runtime.

## Quick Start

```bash
# Install
npm install domo-tactical domo-actors

# Or with your preferred package manager
pnpm add domo-tactical domo-actors
yarn add domo-tactical domo-actors
```

```typescript
import { EventSourcedEntity, DomainEvent } from 'domo-tactical'
import { TestJournal } from 'domo-tactical/testkit'

// Define events
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
account.setJournal(journal) // use setJournal() for tests

await account.open(1000)
await account.deposit(500)
console.log(account.getBalance())  // 1500
```

## Documentation

- [Complete Documentation](./docs/DomoTactical.md) - Full guide with examples
- [API Reference](./docs/api/index.html) - Generated TypeDoc API documentation
  - Currently not committed to git; use `npm run docs` to generate
- [Bank Example](./examples/bank/bank.ts) - Complete working example with projections

## Contributing

DomoActors is authored by Vaughn Vernon and maintained as part of the Domo product family.

For issues and feature requests, please visit: https://github.com/VaughnVernon/DomoTactical-TS/issues

## License

Reciprocal Public License 1.5

See: ./LICENSE.md


Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
Copyright © 2012-2025 Kalele, Inc. All rights reserved.

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
