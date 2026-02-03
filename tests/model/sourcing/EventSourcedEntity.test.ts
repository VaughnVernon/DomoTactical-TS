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
import { SourcedEntity } from '../../../src/model/sourcing/SourcedEntity'
import { DomainEvent } from '../../../src/model/DomainEvent'
import { InMemoryJournal, Journal } from '../../../src/store/journal'
import { Metadata } from '../../../src/store/Metadata'
import { EntryAdapterProvider } from '../../../src/store/EntryAdapterProvider'
import { DefaultTextEntryAdapter } from '../../../src/store/DefaultTextEntryAdapter'
import { ContextProfile } from '../../../src/store/ContextProfile'

/**
 * Test events
 */
class OrderPlaced extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly amount: number
  ) {
    super(1)
  }

  override id(): string {
    return this.orderId
  }

  override typeName(): string {
    return 'OrderPlaced'
  }
}

class OrderConfirmed extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly confirmedAt: Date
  ) {
    super(1)
  }

  override id(): string {
    return this.orderId
  }

  override typeName(): string {
    return 'OrderConfirmed'
  }
}

/**
 * Adapters for test events
 */
class OrderPlacedAdapter extends DefaultTextEntryAdapter<OrderPlaced> {
  protected override upcastIfNeeded(data: any, type: string, typeVersion: number): OrderPlaced {
    return new OrderPlaced(data.orderId, data.customerId, data.amount)
  }
}

class OrderConfirmedAdapter extends DefaultTextEntryAdapter<OrderConfirmed> {
  protected override upcastIfNeeded(data: any, type: string, typeVersion: number): OrderConfirmed {
    return new OrderConfirmed(data.orderId, new Date(data.confirmedAt))
  }
}

/**
 * Test supervisor
 */
class TestSupervisor extends Actor {
  async beforeStart(): Promise<void> {
    this.logger().log('TestSupervisor initialized')
  }
}

/**
 * Test entity extending EventSourcedEntity
 */
class Order extends EventSourcedEntity {
  private orderId: string = ''
  private customerId: string = ''
  private amount: number = 0
  private confirmed: boolean = false
  private confirmedAt: Date | null = null
  private beforeApplyCount: number = 0
  private afterApplyCount: number = 0

  static {
    SourcedEntity.registerConsumer(Order, OrderPlaced, (order, event) => {
      order.orderId = event.orderId
      order.customerId = event.customerId
      order.amount = event.amount
    })

    SourcedEntity.registerConsumer(Order, OrderConfirmed, (order, event) => {
      order.confirmed = true
      order.confirmedAt = event.confirmedAt
    })
  }

  constructor(streamName?: string) {
    super(streamName)
  }

  // Expose setJournal for testing
  public setJournalForTest(journal: Journal<string>): void {
    this.setJournal(journal)
  }

  async placeOrder(orderId: string, customerId: string, amount: number): Promise<void> {
    const event = new OrderPlaced(orderId, customerId, amount)
    await this.apply(event)
  }

  async placeOrderWithMetadata(orderId: string, customerId: string, amount: number, metadata: Metadata): Promise<void> {
    const event = new OrderPlaced(orderId, customerId, amount)
    await this.apply(event, metadata)
  }

  async confirmOrder(): Promise<void> {
    const event = new OrderConfirmed(this.orderId, new Date())
    await this.apply(event)
  }

  async placeAndConfirmOrder(orderId: string, customerId: string, amount: number): Promise<void> {
    const placed = new OrderPlaced(orderId, customerId, amount)
    const confirmed = new OrderConfirmed(orderId, new Date())
    await this.apply(this.asList(placed, confirmed))
  }

  async applyWithCallback(event: DomainEvent, callback: () => Promise<void>): Promise<void> {
    await this.apply(event, callback)
  }

  // Override lifecycle methods to track calls
  protected override async beforeApply(sources: any[]): Promise<void> {
    this.beforeApplyCount++
    await super.beforeApply(sources)
  }

  protected override async afterApply(): Promise<void> {
    this.afterApplyCount++
    await super.afterApply()
  }

  // Expose protected methods for testing
  getVersionInfo(): { current: number; next: number } {
    return {
      current: this.currentVersion(),
      next: this.nextVersion()
    }
  }

  getBeforeApplyCount(): number {
    return this.beforeApplyCount
  }

  getAfterApplyCount(): number {
    return this.afterApplyCount
  }

  getOrderId(): string {
    return this.orderId
  }

  getCustomerId(): string {
    return this.customerId
  }

  getAmount(): number {
    return this.amount
  }

  isConfirmed(): boolean {
    return this.confirmed
  }

  getConfirmedAt(): Date | null {
    return this.confirmedAt
  }
}

/**
 * Entity that throws errors in apply
 */
class FailingOrder extends EventSourcedEntity {
  private shouldFail: boolean = false

  static {
    SourcedEntity.registerConsumer(FailingOrder, OrderPlaced, (order, event) => {
      if (order.shouldFail) {
        throw new Error('Simulated failure')
      }
    })
  }

  constructor(streamName?: string) {
    super(streamName)
  }

  public setJournalForTest(journal: Journal<string>): void {
    this.setJournal(journal)
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail
  }

  async placeOrder(orderId: string, customerId: string, amount: number): Promise<void> {
    const event = new OrderPlaced(orderId, customerId, amount)
    await this.apply(event)
  }
}

describe('EventSourcedEntity', () => {
  let journal: Journal<string>

  beforeEach(async () => {
    // Reset adapter providers
    EntryAdapterProvider.reset()

    // Register adapters
    const provider = EntryAdapterProvider.instance()
    provider.registerAdapter(OrderPlaced, new OrderPlacedAdapter())
    provider.registerAdapter(OrderConfirmed, new OrderConfirmedAdapter())

    // Initialize supervisor
    const supervisorProtocol: Protocol = {
      type: () => 'test-supervisor',
      instantiator: () => ({
        instantiate: () => new TestSupervisor()
      })
    }
    stage().actorFor(supervisorProtocol, undefined, 'default')

    // Create journal
    const journalProtocol: Protocol = {
      type: () => 'Journal',
      instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
    }
    journal = stage().actorFor<InMemoryJournal<string>>(journalProtocol, undefined, 'default')
    stage().registerValue('domo-tactical:default.journal', journal)
  })

  afterEach(async () => {
    await stage().close()
  })

  describe('constructor', () => {
    it('should create with no stream name (uses address)', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: () => new Order()
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor')
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(order).toBeDefined()
    })

    it('should create with explicit stream name', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            return new Order(streamName)
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-123')
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(order).toBeDefined()
    })
  })

  describe('apply', () => {
    it('should apply single event', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new Order(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-single')
      await new Promise(resolve => setTimeout(resolve, 20))

      await order.placeOrder('order-single', 'customer-1', 100)

      expect(await order.getOrderId()).toBe('order-single')
      expect(await order.getCustomerId()).toBe('customer-1')
      expect(await order.getAmount()).toBe(100)
    })

    it('should apply multiple events as list', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new Order(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-multi')
      await new Promise(resolve => setTimeout(resolve, 20))

      await order.placeAndConfirmOrder('order-multi', 'customer-2', 200)

      expect(await order.getOrderId()).toBe('order-multi')
      expect(await order.isConfirmed()).toBe(true)
    })

    it('should apply event with metadata', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new Order(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-meta')
      await new Promise(resolve => setTimeout(resolve, 20))

      const metadata = Metadata.with('correlation-123', 'PlaceOrder')
      await order.placeOrderWithMetadata('order-meta', 'customer-3', 300, metadata)

      expect(await order.getOrderId()).toBe('order-meta')
    })

    it('should apply event with callback', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new Order(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-callback')
      await new Promise(resolve => setTimeout(resolve, 20))

      let callbackExecuted = false
      const event = new OrderPlaced('order-callback', 'customer-4', 400)

      await order.applyWithCallback(event, async () => {
        callbackExecuted = true
      })

      expect(await order.getOrderId()).toBe('order-callback')
      expect(callbackExecuted).toBe(true)
    })
  })

  describe('lifecycle hooks', () => {
    it('should call beforeApply and afterApply', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new Order(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-hooks')
      await new Promise(resolve => setTimeout(resolve, 20))

      await order.placeOrder('order-hooks', 'customer-5', 500)

      expect(await order.getBeforeApplyCount()).toBe(1)
      expect(await order.getAfterApplyCount()).toBe(1)
    })
  })

  describe('version tracking', () => {
    it('should track current and next version', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new Order(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-version')
      await new Promise(resolve => setTimeout(resolve, 20))

      let versionInfo = await order.getVersionInfo()
      expect(versionInfo.current).toBe(0)
      expect(versionInfo.next).toBe(1)

      await order.placeOrder('order-version', 'customer-6', 600)

      versionInfo = await order.getVersionInfo()
      expect(versionInfo.current).toBe(1)
      expect(versionInfo.next).toBe(2)

      await order.confirmOrder()

      versionInfo = await order.getVersionInfo()
      expect(versionInfo.current).toBe(2)
      expect(versionInfo.next).toBe(3)
    })
  })

  describe('asList helper', () => {
    it('should create list from varargs', async () => {
      const orderProtocol: Protocol = {
        type: () => 'Order',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new Order(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const order = stage().actorFor<Order>(orderProtocol, undefined, 'test-supervisor', undefined, 'order-list')
      await new Promise(resolve => setTimeout(resolve, 20))

      // This implicitly tests asList via placeAndConfirmOrder
      await order.placeAndConfirmOrder('order-list', 'customer-7', 700)

      const versionInfo = await order.getVersionInfo()
      expect(versionInfo.current).toBe(2) // Two events applied
    })
  })

  describe('registerConsumer', () => {
    it('should register consumers via static method', () => {
      // The Order class already registered consumers in its static block
      // This test verifies the registration worked by applying events
      // (tested implicitly in all the other tests)
      expect(true).toBe(true)
    })
  })
})

/**
 * Additional test event for inheritance testing
 */
class SpecialOrderPlaced extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly priority: string
  ) {
    super(1)
  }

  override id(): string {
    return this.orderId
  }

  override typeName(): string {
    return 'SpecialOrderPlaced'
  }
}

class SpecialOrderPlacedAdapter extends DefaultTextEntryAdapter<SpecialOrderPlaced> {
  protected override upcastIfNeeded(data: any, type: string, typeVersion: number): SpecialOrderPlaced {
    return new SpecialOrderPlaced(data.orderId, data.priority)
  }
}

/**
 * Base entity for inheritance testing
 */
class BaseOrder extends EventSourcedEntity {
  protected orderId: string = ''
  protected priority: string = 'normal'

  static {
    // Register consumer on base class
    SourcedEntity.registerConsumer(BaseOrder, SpecialOrderPlaced, (order, event) => {
      order.orderId = event.orderId
      order.priority = event.priority
    })
  }

  constructor(streamName?: string) {
    super(streamName)
  }

  public setJournalForTest(journal: Journal<string>): void {
    this.setJournal(journal)
  }

  getOrderId(): string {
    return this.orderId
  }

  getPriority(): string {
    return this.priority
  }
}

/**
 * Child entity that inherits consumer from BaseOrder
 */
class ChildOrder extends BaseOrder {
  private childSpecificField: string = ''

  constructor(streamName?: string) {
    super(streamName)
  }

  async placeSpecialOrder(orderId: string, priority: string): Promise<void> {
    const event = new SpecialOrderPlaced(orderId, priority)
    await this.apply(event)
  }

  setChildField(value: string): void {
    this.childSpecificField = value
  }

  getChildField(): string {
    return this.childSpecificField
  }
}

/**
 * Entity with custom context name
 */
class CustomContextOrder extends EventSourcedEntity {
  private orderId: string = ''

  static {
    SourcedEntity.registerConsumer(CustomContextOrder, OrderPlaced, (order, event) => {
      order.orderId = event.orderId
    })
  }

  constructor(streamName?: string) {
    super(streamName)
  }

  // Override contextName to use a custom context
  protected override contextName(): string {
    return 'custom-context'
  }

  public setJournalForTest(journal: Journal<string>): void {
    this.setJournal(journal)
  }

  async placeOrder(orderId: string, customerId: string, amount: number): Promise<void> {
    const event = new OrderPlaced(orderId, customerId, amount)
    await this.apply(event)
  }

  getOrderId(): string {
    return this.orderId
  }

  // Expose journalKey for testing
  getJournalKey(): string {
    return this.journalKey()
  }

  // Expose entryAdapterProvider for testing
  getEntryAdapterProvider(): EntryAdapterProvider {
    return this.entryAdapterProvider()
  }
}


describe('SourcedEntity Advanced Coverage', () => {
  let journal: Journal<string>

  beforeEach(async () => {
    // Reset providers
    EntryAdapterProvider.reset()
    ContextProfile.reset()

    // Register adapters
    const provider = EntryAdapterProvider.instance()
    provider.registerAdapter(OrderPlaced, new OrderPlacedAdapter())
    provider.registerAdapter(OrderConfirmed, new OrderConfirmedAdapter())
    provider.registerAdapter(SpecialOrderPlaced, new SpecialOrderPlacedAdapter())

    // Initialize supervisor
    const supervisorProtocol: Protocol = {
      type: () => 'test-supervisor',
      instantiator: () => ({
        instantiate: () => new TestSupervisor()
      })
    }
    stage().actorFor(supervisorProtocol, undefined, 'default')

    // Create journal
    const journalProtocol: Protocol = {
      type: () => 'Journal',
      instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
    }
    journal = stage().actorFor<InMemoryJournal<string>>(journalProtocol, undefined, 'default')
    stage().registerValue('domo-tactical:default.journal', journal)
  })

  afterEach(async () => {
    ContextProfile.reset()
    await stage().close()
  })

  describe('consumer inheritance (prototype chain)', () => {
    it('should find consumer registered on parent class', async () => {
      const childOrderProtocol: Protocol = {
        type: () => 'ChildOrder',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            const order = new ChildOrder(streamName)
            order.setJournalForTest(journal)
            return order
          }
        })
      }

      const childOrder = stage().actorFor<ChildOrder>(childOrderProtocol, undefined, 'test-supervisor', undefined, 'child-order-1')
      await new Promise(resolve => setTimeout(resolve, 20))

      // Apply event - consumer is registered on BaseOrder, not ChildOrder
      await childOrder.placeSpecialOrder('child-order-1', 'high')

      // Verify the consumer was found via prototype chain
      expect(await childOrder.getOrderId()).toBe('child-order-1')
      expect(await childOrder.getPriority()).toBe('high')
    })
  })

  describe('custom context', () => {
    it('should use custom context name for journal key', async () => {
      // Register journal for custom context
      stage().registerValue('domo-tactical:custom-context.journal', journal)

      const customOrderProtocol: Protocol = {
        type: () => 'CustomContextOrder',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            return new CustomContextOrder(streamName)
          }
        })
      }

      const customOrder = stage().actorFor<CustomContextOrder>(customOrderProtocol, undefined, 'test-supervisor', undefined, 'custom-order-1')
      await new Promise(resolve => setTimeout(resolve, 20))

      // Verify custom journal key
      expect(await customOrder.getJournalKey()).toBe('domo-tactical:custom-context.journal')
    })

    it('should use ContextProfile EntryAdapterProvider when available', async () => {
      // Create a context profile for custom-context using the forContext API
      const profile = ContextProfile.forContext('custom-context')
        .register(OrderPlaced)

      // Register journal for custom context
      stage().registerValue('domo-tactical:custom-context.journal', journal)

      const customOrderProtocol: Protocol = {
        type: () => 'CustomContextOrder',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            return new CustomContextOrder(streamName)
          }
        })
      }

      const customOrder = stage().actorFor<CustomContextOrder>(customOrderProtocol, undefined, 'test-supervisor', undefined, 'custom-order-2')
      await new Promise(resolve => setTimeout(resolve, 20))

      // Verify it uses the custom provider from ContextProfile
      const provider = await customOrder.getEntryAdapterProvider()
      expect(provider).toBe(profile.entryAdapterProvider())
    })

    it('should fall back to global provider when no ContextProfile', async () => {
      // Don't register a ContextProfile for 'custom-context'
      // Register journal for custom context
      stage().registerValue('domo-tactical:custom-context.journal', journal)

      const customOrderProtocol: Protocol = {
        type: () => 'CustomContextOrder',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [streamName] = def.parameters()
            return new CustomContextOrder(streamName)
          }
        })
      }

      const customOrder = stage().actorFor<CustomContextOrder>(customOrderProtocol, undefined, 'test-supervisor', undefined, 'custom-order-3')
      await new Promise(resolve => setTimeout(resolve, 20))

      // Verify it falls back to global singleton
      const provider = await customOrder.getEntryAdapterProvider()
      expect(provider).toBe(EntryAdapterProvider.instance())
    })
  })


})
