// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol, Definition, Actor } from 'domo-actors'
import {
  eventSourcedContextFor,
  commandSourcedContextFor,
  EventSourcedEntity,
  CommandSourcedEntity
} from '../../../src/model/sourcing'
import { DomainEvent } from '../../../src/model/DomainEvent'
import { Command } from '../../../src/model/Command'
import { Source } from '../../../src/store/Source'
import { InMemoryJournal, Journal } from '../../../src/store/journal'
import { Metadata } from '../../../src/store/Metadata'
import { EntryAdapterProvider } from '../../../src/store/EntryAdapterProvider'
import { ContextProfile } from '../../../src/store/ContextProfile'
import { StateAdapterProvider } from '../../../src/store/StateAdapterProvider'

/**
 * Test supervisor for context entities.
 */
class TestSupervisor extends Actor {
  async beforeStart(): Promise<void> {
    this.logger().log('TestSupervisor initialized')
  }
}

/**
 * Test events for inventory context.
 */
class ItemAdded extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly quantity: number
  ) {
    super()
  }

  override id(): string {
    return this.itemId
  }
}

class ItemRemoved extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly removedAt: Date
  ) {
    super()
  }

  override id(): string {
    return this.itemId
  }
}

class ItemPriceUpdated extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly oldPrice: number,
    public readonly newPrice: number,
    public readonly effectiveAt: Date
  ) {
    super()
  }

  override id(): string {
    return this.itemId
  }
}

/**
 * Test command for command sourcing.
 */
class ProcessRestock extends Command {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly requestedBy: string
  ) {
    super()
  }

  override id(): string {
    return this.itemId
  }
}

describe('Contextual Entity Source Registration', () => {
  let journal: Journal<string>

  beforeEach(async () => {
    ContextProfile.reset()
    EntryAdapterProvider.reset()
    StateAdapterProvider.reset()

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
  })

  afterEach(async () => {
    await stage().close()
  })

  describe('eventSourcedContextFor()', () => {
    it('should create base class with context name', () => {
      const InventoryEntity = eventSourcedContextFor('inventory')

      // Create a test entity class
      class TestInventory extends InventoryEntity {
        constructor(streamName: string) {
          super(streamName)
        }
      }

      // Verify the base class was created correctly
      expect(InventoryEntity.prototype).toBeInstanceOf(EventSourcedEntity)
    })

    it('should register Source adapters from config', () => {
      const InventoryEntity = eventSourcedContextFor('inventory', {
        sources: [
          { type: ItemAdded },
          { type: ItemRemoved, transforms: { removedAt: Source.asDate } }
        ]
      })

      // Adapters are registered to the context-specific provider
      const provider = ContextProfile.get('inventory')!.entryAdapterProvider()

      expect(provider.hasAdapter(ItemAdded)).toBe(true)
      expect(provider.hasAdapter(ItemRemoved)).toBe(true)
    })

    it('should not register adapters without sources config', () => {
      eventSourcedContextFor('empty-context')

      const provider = EntryAdapterProvider.instance()

      expect(provider.hasAdapter(ItemAdded)).toBe(false)
    })

    it('should work with empty sources array', () => {
      eventSourcedContextFor('another-context', { sources: [] })

      // Should not throw
      const provider = EntryAdapterProvider.instance()
      expect(provider.hasAdapter(ItemAdded)).toBe(false)
    })
  })

  describe('commandSourcedContextFor()', () => {
    it('should create base class with context name', () => {
      const InventoryCommandEntity = commandSourcedContextFor('inventory')

      expect(InventoryCommandEntity.prototype).toBeInstanceOf(CommandSourcedEntity)
    })

    it('should register Source adapters from config', () => {
      commandSourcedContextFor('inventory', {
        sources: [
          { type: ProcessRestock }
        ]
      })

      // Adapters are registered to the context-specific provider
      const provider = ContextProfile.get('inventory')!.entryAdapterProvider()

      expect(provider.hasAdapter(ProcessRestock)).toBe(true)
    })
  })

  describe('end-to-end: Create entity, apply events, restore from journal', () => {
    it('should restore entity state using registered Source adapters', async () => {
      // Register context with sources
      const InventoryEntity = eventSourcedContextFor('inventory', {
        sources: [
          { type: ItemAdded },
          { type: ItemRemoved, transforms: { removedAt: Source.asDate } },
          { type: ItemPriceUpdated, transforms: { effectiveAt: Source.asDate } }
        ]
      })

      // Register journal for the context
      stage().registerValue('domo-tactical:inventory.journal', journal)

      // Define inventory entity
      class InventoryItem extends InventoryEntity {
        private itemId: string = ''
        private name: string = ''
        private quantity: number = 0
        private price: number = 0

        static {
          InventoryEntity.registerConsumer(InventoryItem, ItemAdded, (item, event) => {
            item.itemId = event.itemId
            item.name = event.name
            item.quantity = event.quantity
          })

          InventoryEntity.registerConsumer(InventoryItem, ItemRemoved, (item, event) => {
            item.quantity -= event.quantity
          })

          InventoryEntity.registerConsumer(InventoryItem, ItemPriceUpdated, (item, event) => {
            item.price = event.newPrice
          })
        }

        constructor(streamName?: string) {
          super(streamName || 'test-item')
        }

        getItemId(): string { return this.itemId }
        getName(): string { return this.name }
        getQuantity(): number { return this.quantity }
        getPrice(): number { return this.price }
        getCurrentVersion(): number { return this.currentVersion() }
      }

      const streamName = 'item-001'

      // Append events to journal
      await journal.append(
        streamName,
        1,
        new ItemAdded('item-001', 'Widget', 100),
        Metadata.nullMetadata()
      )

      await journal.append(
        streamName,
        2,
        new ItemRemoved('item-001', 10, new Date('2025-01-15T10:00:00.000Z')),
        Metadata.nullMetadata()
      )

      await journal.append(
        streamName,
        3,
        new ItemPriceUpdated('item-001', 0, 29.99, new Date('2025-01-15T11:00:00.000Z')),
        Metadata.nullMetadata()
      )

      // Create entity actor and restore
      const itemProtocol: Protocol = {
        type: () => 'InventoryItem',
        instantiator: () => ({
          instantiate: (def: Definition) => {
            const [itemId] = def.parameters()
            return new InventoryItem(itemId)
          }
        })
      }

      const item = stage().actorFor<InventoryItem>(
        itemProtocol,
        undefined,
        'test-supervisor',
        undefined,
        streamName
      )

      // Wait for restoration
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify state was restored correctly
      expect(await item.getItemId()).toBe('item-001')
      expect(await item.getName()).toBe('Widget')
      expect(await item.getQuantity()).toBe(90) // 100 - 10
      expect(await item.getPrice()).toBe(29.99)
      expect(await item.getCurrentVersion()).toBe(3)
    })

    it('should work with multiple contexts', async () => {
      // Register two different contexts
      eventSourcedContextFor('inventory', {
        sources: [
          { type: ItemAdded }
        ]
      })

      eventSourcedContextFor('sales', {
        sources: [
          { type: ItemPriceUpdated, transforms: { effectiveAt: Source.asDate } }
        ]
      })

      // Each context has its own provider
      const inventoryProvider = ContextProfile.get('inventory')!.entryAdapterProvider()
      const salesProvider = ContextProfile.get('sales')!.entryAdapterProvider()

      // Each context has its own registered Source types
      expect(inventoryProvider.hasAdapter(ItemAdded)).toBe(true)
      expect(inventoryProvider.hasAdapter(ItemPriceUpdated)).toBe(false)

      expect(salesProvider.hasAdapter(ItemPriceUpdated)).toBe(true)
      expect(salesProvider.hasAdapter(ItemAdded)).toBe(false)
    })

    it('should handle Date transformations during restoration', async () => {
      eventSourcedContextFor('inventory', {
        sources: [
          { type: ItemRemoved, transforms: { removedAt: Source.asDate } }
        ]
      })

      stage().registerValue('domo-tactical:inventory.journal', journal)

      const dateStr = '2025-01-20T15:30:00.000Z'

      // Append event with Date
      await journal.append(
        'item-002',
        1,
        new ItemRemoved('item-002', 5, new Date(dateStr)),
        Metadata.nullMetadata()
      )

      // Read back and verify Date was reconstructed
      const reader = await journal.streamReader('item-002')
      const stream = await reader.streamFor('item-002')
      const entries = stream.entries

      expect(entries).toHaveLength(1)

      // Use context-specific provider
      const provider = ContextProfile.get('inventory')!.entryAdapterProvider()
      const event = provider.asSource<ItemRemoved>(entries[0])

      expect(event).toBeInstanceOf(ItemRemoved)
      expect(event.removedAt).toBeInstanceOf(Date)
      expect(event.removedAt.toISOString()).toBe(dateStr)
    })
  })
})
