// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stage, Protocol, Definition } from 'domo-actors'
import {
  ProjectionSupervisor,
  TextProjectionDispatcherActor,
  JournalConsumerActor,
  ProjectToDescription,
  InMemoryJournal,
  InMemoryDocumentStore,
  type ProjectionDispatcher,
  type JournalConsumer,
  type Projection,
  type Journal,
  type DocumentStore
} from 'domo-tactical'
import { TestConfirmer } from 'domo-tactical/testkit'
import {
  UserRegistered,
  UserAuthenticated,
  UserAuthorized,
  UserDeactivated
} from '../fixtures/UserEvents'
import {
  UserProfileProjection,
  UserActivityStatsProjection,
  type UserProfile,
  type UserActivityStats
} from '../fixtures/UserProjections'
import {
  UserRegisteredAdapter,
  UserAuthenticatedAdapter,
  UserDeactivatedAdapter
} from '../fixtures/UserAdapters'
import { EntryAdapterProvider } from 'domo-tactical/store'
import { Metadata } from 'domo-tactical/store'

/**
 * Helper to wait for projections to process events.
 */
async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 2000,
  intervalMs: number = 50
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error('Timeout waiting for condition')
}

/**
 * Integration tests for complete CQRS pipeline:
 * Journal → JournalConsumer → ProjectionDispatcher → Projections → DocumentStore
 *
 * Tests the full event flow from write to projection using a simple User domain.
 */
describe('CQRS Projection Pipeline Integration', () => {
  let journal: Journal<string>
  let documentStore: DocumentStore
  let dispatcher: ProjectionDispatcher
  let consumer: JournalConsumer
  let userProfileProjection: Projection
  let userActivityStatsProjection: Projection

  beforeEach(async () => {
    // Create journal as actor
    const journalProtocol: Protocol = {
      type: () => 'Journal',
      instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
    }
    journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, 'default')

    // Create document store as actor
    const storeProtocol: Protocol = {
      type: () => 'DocumentStore',
      instantiator: () => ({ instantiate: () => new InMemoryDocumentStore() })
    }
    documentStore = stage().actorFor<DocumentStore>(storeProtocol, undefined, 'default')

    // Register DocumentStore with Stage for projection access
    stage().registerValue('domo-tactical:test.documentStore', documentStore)

    // Register custom adapters
    const adapterProvider = EntryAdapterProvider.instance()
    adapterProvider.registerAdapter(UserRegistered, new UserRegisteredAdapter())
    adapterProvider.registerAdapter(UserAuthenticated, new UserAuthenticatedAdapter())
    adapterProvider.registerAdapter(UserDeactivated, new UserDeactivatedAdapter())

    // Create projection supervisor
    const projectionSupervisorProtocol: Protocol = {
      type: () => 'projection-supervisor',
      instantiator: () => ({
        instantiate: () => new ProjectionSupervisor()
      })
    }

    // Initialize the supervisor actor
    stage().actorFor(projectionSupervisorProtocol, undefined, 'default')

    // Create projections
    const userProfileProtocol: Protocol = {
      type: () => 'UserProfileProjection',
      instantiator: () => ({
        instantiate: () => new UserProfileProjection()
      })
    }

    const userActivityStatsProtocol: Protocol = {
      type: () => 'UserActivityStatsProjection',
      instantiator: () => ({
        instantiate: () => new UserActivityStatsProjection()
      })
    }

    userProfileProjection = stage().actorFor<Projection>(
      userProfileProtocol,
      undefined,
      'projection-supervisor'
    )

    userActivityStatsProjection = stage().actorFor<Projection>(
      userActivityStatsProtocol,
      undefined,
      'projection-supervisor'
    )

    // Create dispatcher
    const dispatcherProtocol: Protocol = {
      type: () => 'TextProjectionDispatcher',
      instantiator: () => ({
        instantiate: (definition: Definition) => {
          const params = definition.parameters()
          return new TextProjectionDispatcherActor(params[0])
        }
      })
    }

    const confirmer = new TestConfirmer()
    dispatcher = stage().actorFor<ProjectionDispatcher>(
      dispatcherProtocol,
      undefined,
      'projection-supervisor',
      undefined,
      confirmer
    )

    // Register projections with dispatcher
    await dispatcher.register(new ProjectToDescription(
      userProfileProjection,
      ['UserRegistered', 'UserAuthenticated', 'UserDeactivated'],
      'User profile projection'
    ))

    await dispatcher.register(new ProjectToDescription(
      userActivityStatsProjection,
      ['UserRegistered', 'UserAuthenticated'],
      'User activity statistics projection'
    ))

    // Create journal consumer
    const consumerProtocol: Protocol = {
      type: () => 'JournalConsumer',
      instantiator: () => ({
        instantiate: (definition: Definition) => {
          const params = definition.parameters()
          return new JournalConsumerActor(
            params[0], // reader
            params[1], // dispatcher
            params[2], // poll interval
            params[3]  // batch size
          )
        }
      })
    }

    const reader = await journal.journalReader('test-projection-reader')
    consumer = stage().actorFor<JournalConsumer>(
      consumerProtocol,
      undefined,
      'projection-supervisor',
      undefined,
      reader,
      dispatcher,
      100,
      10
    )
  })

  afterEach(async () => {
    if (consumer) {
      await consumer.pause()
    }
    stage().deregisterValue('domo-tactical:test.documentStore')
    await stage().close()
    // Clean up singleton
    EntryAdapterProvider.reset()
  })

  it('should project UserRegistered events to UserProfile', async () => {
    // Arrange: Write UserRegistered event to journal
    const event = new UserRegistered(
      'user-001',
      'alice',
      'alice@example.com',
      new Date('2025-01-15T10:00:00Z')
    )

    await journal.append('user-001', 1, event, Metadata.nullMetadata())

    // Act: Wait for projection to process
    await waitFor(async () => {
      const result = await documentStore.read('user-001', 'UserProfile')
      return result.outcome.success && result.state !== undefined
    })

    // Assert: UserProfile projection created
    const result = await documentStore.read('user-001', 'UserProfile')
    expect(result.outcome.success).toBe(true)

    const profile = result.state as UserProfile
    expect(profile.userId).toBe('user-001')
    expect(profile.username).toBe('alice')
    expect(profile.email).toBe('alice@example.com')
    expect(profile.sessionCount).toBe(0)
    expect(profile.registeredAt).toBe('2025-01-15T10:00:00.000Z')
  })

  it('should update UserProfile on UserAuthenticated events', async () => {
    // Arrange: Register user first
    const registered = new UserRegistered(
      'user-002',
      'bob',
      'bob@example.com',
      new Date('2025-01-15T10:00:00Z')
    )

    await journal.append('user-002', 1, registered, Metadata.nullMetadata())

    await waitFor(async () => {
      const result = await documentStore.read('user-002', 'UserProfile')
      return result.outcome.success && result.state !== undefined
    })

    // Act: Authenticate user twice
    const auth1 = new UserAuthenticated(
      'user-002',
      'session-001',
      new Date('2025-01-15T11:00:00Z')
    )
    await journal.append('user-002', 2, auth1, Metadata.nullMetadata())

    await waitFor(async () => {
      const result = await documentStore.read('user-002', 'UserProfile')
      const profile = result.state as UserProfile
      return profile.sessionCount === 1
    })

    const auth2 = new UserAuthenticated(
      'user-002',
      'session-002',
      new Date('2025-01-15T12:00:00Z')
    )
    await journal.append('user-002', 3, auth2, Metadata.nullMetadata())

    await waitFor(async () => {
      const result = await documentStore.read('user-002', 'UserProfile')
      const profile = result.state as UserProfile
      return profile.sessionCount === 2
    })

    // Assert: Session count incremented
    const result = await documentStore.read('user-002', 'UserProfile')
    const profile = result.state as UserProfile
    expect(profile.sessionCount).toBe(2)
    expect(profile.lastAuthentication).toBe('2025-01-15T12:00:00.000Z')
  })

  it('should build UserActivityStats across multiple users', async () => {
    // Arrange & Act: Register 3 users
    for (let i = 1; i <= 3; i++) {
      const event = new UserRegistered(
        `user-00${i}`,
        `user${i}`,
        `user${i}@example.com`,
        new Date()
      )

      await journal.append(`user-00${i}`, 1, event, Metadata.nullMetadata())
    }

    // Wait for stats to update
    await waitFor(async () => {
      const result = await documentStore.read('user-activity-stats', 'UserActivityStats')
      if (!result.outcome.success || !result.state) return false
      const stats = result.state as UserActivityStats
      return stats.totalUsers === 3
    })

    // Act: Authenticate users (5 total sessions)
    await journal.append('user-001', 2,
      new UserAuthenticated('user-001', 'session-1', new Date()),
      Metadata.nullMetadata())
    await journal.append('user-001', 3,
      new UserAuthenticated('user-001', 'session-2', new Date()),
      Metadata.nullMetadata())

    await journal.append('user-002', 2,
      new UserAuthenticated('user-002', 'session-3', new Date()),
      Metadata.nullMetadata())
    await journal.append('user-002', 3,
      new UserAuthenticated('user-002', 'session-4', new Date()),
      Metadata.nullMetadata())
    await journal.append('user-002', 4,
      new UserAuthenticated('user-002', 'session-5', new Date()),
      Metadata.nullMetadata())

    // Wait for stats to reflect all sessions
    await waitFor(async () => {
      const result = await documentStore.read('user-activity-stats', 'UserActivityStats')
      if (!result.outcome.success || !result.state) return false
      const stats = result.state as UserActivityStats
      return stats.totalSessions === 5
    })

    // Assert: Stats aggregated correctly
    const result = await documentStore.read('user-activity-stats', 'UserActivityStats')
    const stats = result.state as UserActivityStats
    expect(stats.totalUsers).toBe(3)
    expect(stats.totalSessions).toBe(5)
    expect(stats.activeUsers).toBe(3)
  })

  it('should remove UserProfile on UserDeactivated', async () => {
    // Arrange: Register user
    const registered = new UserRegistered(
      'user-003',
      'charlie',
      'charlie@example.com',
      new Date()
    )

    await journal.append('user-003', 1, registered, Metadata.nullMetadata())

    await waitFor(async () => {
      const result = await documentStore.read('user-003', 'UserProfile')
      return result.outcome.success && result.state !== undefined
    })

    // Act: Deactivate user
    const deactivated = new UserDeactivated(
      'user-003',
      'Account closed by user request',
      new Date()
    )
    await journal.append('user-003', 2, deactivated, Metadata.nullMetadata())

    // Wait for profile to be removed
    await waitFor(async () => {
      const result = await documentStore.read('user-003', 'UserProfile')
      return !result.outcome.success || result.state === undefined || result.state === null
    })

    // Assert: Profile removed
    const result = await documentStore.read('user-003', 'UserProfile')
    expect(result.state).toBeNull()
  })

  it('should handle batch processing efficiently', async () => {
    // Arrange: Write multiple events in batches
    const events: UserRegistered[] = []
    for (let i = 1; i <= 20; i++) {
      events.push(new UserRegistered(
        `user-${i.toString().padStart(3, '0')}`,
        `user${i}`,
        `user${i}@example.com`,
        new Date()
      ))
    }

    // Act: Write all events
    for (const event of events) {
      await journal.append(event.userId, 1, event, Metadata.nullMetadata())
    }

    // Wait for all projections to complete
    await waitFor(async () => {
      const result = await documentStore.read('user-activity-stats', 'UserActivityStats')
      if (!result.outcome.success || !result.state) return false
      const stats = result.state as UserActivityStats
      return stats.totalUsers === 20
    }, 5000)

    // Assert: All 20 users processed
    const statsResult = await documentStore.read('user-activity-stats', 'UserActivityStats')
    const stats = statsResult.state as UserActivityStats
    expect(stats.totalUsers).toBe(20)
    expect(stats.activeUsers).toBe(20)

    // Verify individual profiles created
    const profile1 = await documentStore.read('user-001', 'UserProfile')
    const profile20 = await documentStore.read('user-020', 'UserProfile')
    expect(profile1.state).toBeDefined()
    expect(profile20.state).toBeDefined()
  })
})
