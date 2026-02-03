// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EntryAdapterProvider } from 'domo-tactical/store'
import { TextEntry } from 'domo-tactical/store/journal'
import { Metadata } from 'domo-tactical/store'
import { UserRegistered, UserAuthenticated } from '../../fixtures/UserEvents'
import { UserRegisteredAdapter, UserAuthenticatedAdapter } from '../../fixtures/UserAdapters'

/**
 * Test suite demonstrating schema evolution and upcasting.
 *
 * Shows how old events (v1) can be read from a journal and automatically
 * upcasted to the current schema version (v2) without data loss.
 *
 * This is critical for long-lived event-sourced systems where the schema
 * evolves over time but old events must remain readable.
 */
describe('Schema Evolution and Upcasting', () => {
  let provider: EntryAdapterProvider

  beforeEach(() => {
    provider = EntryAdapterProvider.instance()
    provider.registerAdapter(UserRegistered, new UserRegisteredAdapter())
    provider.registerAdapter(UserAuthenticated, new UserAuthenticatedAdapter())
  })

  afterEach(() => {
    // Clean up singleton instance
    EntryAdapterProvider.reset()
  })

  describe('UserRegistered Event Evolution', () => {
    it('should read current v2 event (with email field)', () => {
      // Arrange: Create a v2 UserRegistered entry (current version with email)
      const v2Entry = new TextEntry(
        '1',
        0, // globalPosition
        'UserRegistered',
        2, // Schema version 2
        JSON.stringify({
          userId: 'user-123',
          username: 'john_doe',
          email: 'john@example.com',
          registeredAt: '2025-01-15T10:00:00.000Z'
        }),
        1, // Stream version
        JSON.stringify(Metadata.nullMetadata())
      )

      // Act: Read using adapter (no upcasting needed)
      const event = provider.asSource<UserRegistered>(v2Entry)

      // Assert: All v2 fields present
      expect(event.userId).toBe('user-123')
      expect(event.username).toBe('john_doe')
      expect(event.email).toBe('john@example.com')
      expect(event.registeredAt.toISOString()).toBe('2025-01-15T10:00:00.000Z')
    })

    it('should upcast v1 event (without email) to v2', () => {
      // Arrange: Create a v1 UserRegistered entry (old version without email)
      const v1Entry = new TextEntry(
        '1',
        1, // globalPosition
        'UserRegistered',
        1, // Schema version 1 (old)
        JSON.stringify({
          userId: 'user-456',
          username: 'jane_doe',
          // No email field in v1!
          registeredAt: '2024-06-10T14:30:00.000Z'
        }),
        1,
        JSON.stringify(Metadata.nullMetadata())
      )

      // Act: Read using adapter (should upcast v1 → v2)
      const event = provider.asSource<UserRegistered>(v1Entry)

      // Assert: Upcasted to v2 with default email
      expect(event.userId).toBe('user-456')
      expect(event.username).toBe('jane_doe')
      expect(event.email).toBe('jane_doe@legacy.com') // Default email for v1 events
      expect(event.registeredAt.toISOString()).toBe('2024-06-10T14:30:00.000Z')
    })

    it('should write events as v2 (current version)', () => {
      // Arrange: Create a UserRegistered event
      const event = new UserRegistered(
        'user-789',
        'bob_smith',
        'bob@example.com',
        new Date('2025-01-15T10:00:00.000Z')
      )

      // Act: Convert to entry using adapter
      const entry = provider.asEntry(
        event,
        1, // Stream version
        Metadata.nullMetadata()
      )

      // Assert: Written as v2
      expect(entry.type).toBe('UserRegistered')
      expect(entry.typeVersion).toBe(2) // Current version

      const data = JSON.parse(entry.entryData as string)
      expect(data.userId).toBe('user-789')
      expect(data.username).toBe('bob_smith')
      expect(data.email).toBe('bob@example.com')
    })
  })

  describe('UserAuthenticated Event Evolution', () => {
    it('should read current v2 event (with sessionId)', () => {
      // Arrange: Create a v2 UserAuthenticated entry
      const v2Entry = new TextEntry(
        '2',
        2, // globalPosition
        'UserAuthenticated',
        2, // Schema version 2
        JSON.stringify({
          userId: 'user-123',
          sessionId: 'session-abc123',
          authenticatedAt: '2025-01-15T11:00:00.000Z'
        }),
        2,
        JSON.stringify(Metadata.nullMetadata())
      )

      // Act
      const event = provider.asSource<UserAuthenticated>(v2Entry)

      // Assert
      expect(event.userId).toBe('user-123')
      expect(event.sessionId).toBe('session-abc123')
      expect(event.authenticatedAt.toISOString()).toBe('2025-01-15T11:00:00.000Z')
    })

    it('should upcast v1 event (without sessionId) to v2', () => {
      // Arrange: Create a v1 UserAuthenticated entry (no sessionId)
      const v1Entry = new TextEntry(
        '2',
        3, // globalPosition
        'UserAuthenticated',
        1, // Schema version 1 (old)
        JSON.stringify({
          userId: 'user-456',
          // No sessionId in v1!
          authenticatedAt: '2024-06-10T15:00:00.000Z'
        }),
        2,
        JSON.stringify(Metadata.nullMetadata())
      )

      // Act: Should upcast v1 → v2
      const event = provider.asSource<UserAuthenticated>(v1Entry)

      // Assert: Generated sessionId for v1 event
      expect(event.userId).toBe('user-456')
      expect(event.sessionId).toContain('legacy-session-')
      expect(event.authenticatedAt.toISOString()).toBe('2024-06-10T15:00:00.000Z')
    })

    it('should write events as v2 (current version)', () => {
      // Arrange
      const event = new UserAuthenticated(
        'user-789',
        'session-xyz789',
        new Date('2025-01-15T11:00:00.000Z')
      )

      // Act
      const entry = provider.asEntry(event, 2, Metadata.nullMetadata())

      // Assert
      expect(entry.type).toBe('UserAuthenticated')
      expect(entry.typeVersion).toBe(2)

      const data = JSON.parse(entry.entryData as string)
      expect(data.sessionId).toBe('session-xyz789')
    })
  })

  describe('Round-trip Conversion', () => {
    it('should preserve data through write → read cycle', () => {
      // Arrange: Create event
      const original = new UserRegistered(
        'user-999',
        'alice_wonder',
        'alice@wonderland.com',
        new Date('2025-01-15T12:00:00.000Z')
      )

      // Act: Write to entry and read back
      const entry = provider.asEntry(original, 1, Metadata.nullMetadata())
      const restored = provider.asSource<UserRegistered>(entry)

      // Assert: All data preserved
      expect(restored.userId).toBe(original.userId)
      expect(restored.username).toBe(original.username)
      expect(restored.email).toBe(original.email)
      expect(restored.registeredAt.toISOString()).toBe(original.registeredAt.toISOString())
    })
  })
})
