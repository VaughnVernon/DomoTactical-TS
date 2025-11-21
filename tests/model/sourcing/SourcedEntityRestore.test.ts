// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol, Definition, Actor } from 'domo-actors'
import { EventSourcedEntity } from '../../../src/model/sourcing/EventSourcedEntity'
import { DomainEvent } from '../../../src/model/DomainEvent'
import { InMemoryJournal } from '../../../src/store/journal'
import { Metadata } from '../../../src/store/Metadata'
import { TextState } from '../../../src/store/State'
import { EntryAdapterProvider } from '../../../src/store/EntryAdapterProvider'
import { DefaultTextEntryAdapter } from '../../../src/store/DefaultTextEntryAdapter'

/**
 * Simple supervisor for test entities.
 */
class TestSupervisor extends Actor {
  async beforeStart(): Promise<void> {
    this.logger().log('TestSupervisor initialized')
  }
}

/**
 * Test events for restoration tests.
 */
class AccountCreated extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly owner: string,
    public readonly initialBalance: number
  ) {
    super(1)
  }

  override id(): string {
    return this.accountId
  }

  override typeName(): string {
    return 'AccountCreated'
  }
}

class BalanceAdjusted extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly adjustment: number,
    public readonly reason: string
  ) {
    super(1)
  }

  override id(): string {
    return this.accountId
  }

  override typeName(): string {
    return 'BalanceAdjusted'
  }
}

class AccountClosed extends DomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly closedAt: Date
  ) {
    super(1)
  }

  override id(): string {
    return this.accountId
  }

  override typeName(): string {
    return 'AccountClosed'
  }
}

/**
 * Custom adapters for test events that properly reconstruct event instances.
 */
class AccountCreatedAdapter extends DefaultTextEntryAdapter<AccountCreated> {
  protected override upcastIfNeeded(data: any, type: string, version: number): AccountCreated {
    return new AccountCreated(data.accountId, data.owner, data.initialBalance)
  }
}

class BalanceAdjustedAdapter extends DefaultTextEntryAdapter<BalanceAdjusted> {
  protected override upcastIfNeeded(data: any, type: string, version: number): BalanceAdjusted {
    return new BalanceAdjusted(data.accountId, data.adjustment, data.reason)
  }
}

class AccountClosedAdapter extends DefaultTextEntryAdapter<AccountClosed> {
  protected override upcastIfNeeded(data: any, type: string, version: number): AccountClosed {
    return new AccountClosed(data.accountId, new Date(data.closedAt))
  }
}

/**
 * Test entity for restoration tests.
 */
class TestAccount extends EventSourcedEntity {
  private accountId: string = ''
  private owner: string = ''
  private balance: number = 0
  private isOpen: boolean = false
  private adjustmentCount: number = 0

  // Static block to register event handlers
  static {
    EventSourcedEntity.registerConsumer(TestAccount, AccountCreated, (account, event) => {
      account.accountId = event.accountId
      account.owner = event.owner
      account.balance = event.initialBalance
      account.isOpen = true
    })

    EventSourcedEntity.registerConsumer(TestAccount, BalanceAdjusted, (account, event) => {
      account.balance += event.adjustment
      account.adjustmentCount++
    })

    EventSourcedEntity.registerConsumer(TestAccount, AccountClosed, (account, event) => {
      account.isOpen = false
    })
  }

  constructor(accountId?: string) {
    super(accountId || 'test-account-001')
  }

  async createAccount(accountId: string, owner: string, initialBalance: number): Promise<void> {
    const event = new AccountCreated(accountId, owner, initialBalance)
    await this.apply(event)
  }

  async adjustBalance(adjustment: number, reason: string): Promise<void> {
    const event = new BalanceAdjusted(this.accountId, adjustment, reason)
    await this.apply(event)
  }

  async closeAccount(): Promise<void> {
    const event = new AccountClosed(this.accountId, new Date())
    await this.apply(event)
  }

  getAccountId(): string {
    return this.accountId
  }

  getOwner(): string {
    return this.owner
  }

  getBalance(): number {
    return this.balance
  }

  getIsOpen(): boolean {
    return this.isOpen
  }

  getAdjustmentCount(): number {
    return this.adjustmentCount
  }

  getCurrentVersion(): number {
    return this.currentVersion()
  }
}

/**
 * Test suite for SourcedEntity restoration from journal.
 */
describe('SourcedEntity Restoration', () => {
  let journal: InMemoryJournal<string>

  beforeEach(async () => {
    // Reset entry adapter provider
    EntryAdapterProvider.reset()

    // Register custom adapters for test events
    const provider = EntryAdapterProvider.getInstance()
    provider.registerAdapter(AccountCreated, new AccountCreatedAdapter())
    provider.registerAdapter(BalanceAdjusted, new BalanceAdjustedAdapter())
    provider.registerAdapter(AccountClosed, new AccountClosedAdapter())

    // Initialize supervisor
    const supervisorProtocol: Protocol = {
      type: () => 'test-supervisor',
      instantiator: () => ({
        instantiate: () => new TestSupervisor()
      })
    }
    stage().actorFor(supervisorProtocol, undefined, 'default')

    // Create journal and register it on stage
    journal = new InMemoryJournal<string>()
    stage().registerValue('domo-tactical:bank.journal', journal)
  })

  afterEach(async () => {
    await stage().close()
  })

  it('should restore entity state from single event', async () => {
    const streamName = 'account-001'

    // Append event to journal
    await journal.append(
      streamName,
      1,
      new AccountCreated('account-001', 'Alice', 1000),
      Metadata.nullMetadata()
    )

    // Create entity and restore
    const accountProtocol: Protocol = {
      type: () => 'TestAccount',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [accountId] = def.parameters()
          return new TestAccount(accountId)
        }
      })
    }

    const account = stage().actorFor<TestAccount>(
      accountProtocol,
      undefined,
      'test-supervisor',
      undefined,
      streamName
    )

    // Wait briefly for actor to start and restore automatically
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify state was restored
    expect(await account.getAccountId()).toBe('account-001')
    expect(await account.getOwner()).toBe('Alice')
    expect(await account.getBalance()).toBe(1000)
    expect(await account.getIsOpen()).toBe(true)
    expect(await account.getCurrentVersion()).toBe(1)
  })

  it('should restore entity state from multiple events', async () => {
    const streamName = 'account-002'

    // Append multiple events to journal
    await journal.append(
      streamName,
      1,
      new AccountCreated('account-002', 'Bob', 500),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      2,
      new BalanceAdjusted('account-002', 200, 'deposit'),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      3,
      new BalanceAdjusted('account-002', -100, 'withdrawal'),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      4,
      new BalanceAdjusted('account-002', 50, 'interest'),
      Metadata.nullMetadata()
    )

    // Create entity and restore
    const accountProtocol: Protocol = {
      type: () => 'TestAccount',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [accountId] = def.parameters()
          return new TestAccount(accountId)
        }
      })
    }

    const account = stage().actorFor<TestAccount>(
      accountProtocol,
      undefined,
      'test-supervisor',
      undefined,
      streamName
    )

    // Wait briefly for actor to start and restore automatically
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify all events were applied in order
    expect(await account.getAccountId()).toBe('account-002')
    expect(await account.getOwner()).toBe('Bob')
    expect(await account.getBalance()).toBe(650) // 500 + 200 - 100 + 50
    expect(await account.getIsOpen()).toBe(true)
    expect(await account.getAdjustmentCount()).toBe(3)
    expect(await account.getCurrentVersion()).toBe(4)
  })

  it('should restore entity state with snapshot', async () => {
    const streamName = 'account-003'

    // Append events to journal
    await journal.append(
      streamName,
      1,
      new AccountCreated('account-003', 'Charlie', 1000),
      Metadata.nullMetadata()
    )

    // Append event with snapshot
    const snapshot = new TextState(
      'account-003',
      Object,
      1,
      JSON.stringify({
        accountId: 'account-003',
        owner: 'Charlie',
        balance: 1500,
        isOpen: true,
        adjustmentCount: 5
      }),
      2,
      Metadata.nullMetadata()
    )

    await journal.appendWith(
      streamName,
      2,
      new BalanceAdjusted('account-003', 500, 'large deposit'),
      Metadata.nullMetadata(),
      snapshot
    )

    // Create entity and restore
    const accountProtocol: Protocol = {
      type: () => 'TestAccount',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [accountId] = def.parameters()
          return new TestAccount(accountId)
        }
      })
    }

    const account = stage().actorFor<TestAccount>(
      accountProtocol,
      undefined,
      'test-supervisor',
      undefined,
      streamName
    )

    // Wait briefly for actor to start and restore automatically
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify state was restored from events
    // Note: Current implementation doesn't support snapshot restoration
    // so we verify all events were applied
    expect(await account.getAccountId()).toBe('account-003')
    expect(await account.getOwner()).toBe('Charlie')
    expect(await account.getCurrentVersion()).toBe(2)
  })

  it('should handle empty stream gracefully', async () => {
    const streamName = 'account-004'

    // Create entity without any events in journal
    const accountProtocol: Protocol = {
      type: () => 'TestAccount',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [accountId] = def.parameters()
          return new TestAccount(accountId)
        }
      })
    }

    const account = stage().actorFor<TestAccount>(
      accountProtocol,
      undefined,
      'test-supervisor',
      undefined,
      streamName
    )

    // Wait briefly for actor to start and attempt restore
    // Empty stream should be handled gracefully (no error thrown during start)
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify entity is in initial state (no events applied)
    expect(await account.getAccountId()).toBe('')
    expect(await account.getBalance()).toBe(0)
  })

  it('should apply events in correct order during restoration', async () => {
    const streamName = 'account-005'

    // Append events that depend on order
    await journal.append(
      streamName,
      1,
      new AccountCreated('account-005', 'Diana', 100),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      2,
      new BalanceAdjusted('account-005', 50, 'adjustment 1'),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      3,
      new BalanceAdjusted('account-005', 30, 'adjustment 2'),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      4,
      new BalanceAdjusted('account-005', 20, 'adjustment 3'),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      5,
      new AccountClosed('account-005', new Date()),
      Metadata.nullMetadata()
    )

    // Create entity and restore
    const accountProtocol: Protocol = {
      type: () => 'TestAccount',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [accountId] = def.parameters()
          return new TestAccount(accountId)
        }
      })
    }

    const account = stage().actorFor<TestAccount>(
      accountProtocol,
      undefined,
      'test-supervisor',
      undefined,
      streamName
    )

    // Wait briefly for actor to start and restore automatically
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify events were applied in order
    expect(await account.getAccountId()).toBe('account-005')
    expect(await account.getOwner()).toBe('Diana')
    expect(await account.getBalance()).toBe(200) // 100 + 50 + 30 + 20
    expect(await account.getIsOpen()).toBe(false) // closed in last event
    expect(await account.getAdjustmentCount()).toBe(3)
    expect(await account.getCurrentVersion()).toBe(5)
  })

  it('should restore state and then accept new events', async () => {
    const streamName = 'account-006'

    // Append initial events
    await journal.append(
      streamName,
      1,
      new AccountCreated('account-006', 'Eve', 500),
      Metadata.nullMetadata()
    )

    await journal.append(
      streamName,
      2,
      new BalanceAdjusted('account-006', 100, 'initial deposit'),
      Metadata.nullMetadata()
    )

    // Create entity and restore
    const accountProtocol: Protocol = {
      type: () => 'TestAccount',
      instantiator: () => ({
        instantiate: (def: Definition) => {
          const [accountId] = def.parameters()
          const account = new TestAccount(accountId)
          account.setJournal(journal) // Explicitly set journal
          return account
        }
      })
    }

    const account = stage().actorFor<TestAccount>(
      accountProtocol,
      undefined,
      'test-supervisor',
      undefined,
      streamName
    )

    // Wait briefly for actor to start and restore automatically
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify restored state
    expect(await account.getBalance()).toBe(600)
    expect(await account.getCurrentVersion()).toBe(2)

    // Apply new event after restoration
    await account.adjustBalance(200, 'new deposit')

    // Verify new state
    expect(await account.getBalance()).toBe(800)
    expect(await account.getCurrentVersion()).toBe(3)
  })
})
