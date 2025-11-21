// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { DefaultTextEntryAdapter } from 'domo-tactical/store'
import { TextEntry } from 'domo-tactical/store/journal'
import { Metadata } from 'domo-tactical/store'
import { UserRegistered, UserAuthenticated, UserDeactivated } from './UserEvents'

/**
 * Custom adapter for UserRegistered event with schema evolution.
 *
 * Schema Evolution:
 * - v1: Only had userId and username
 * - v2: Added email field (CURRENT)
 */
export class UserRegisteredAdapter extends DefaultTextEntryAdapter<UserRegistered> {
  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): UserRegistered {
    // v2 is current
    if (version === 2) {
      return new UserRegistered(
        data.userId,
        data.username,
        data.email,
        new Date(data.registeredAt)
      )
    }

    // Upcast v1 → v2: Add default email
    if (version === 1) {
      return new UserRegistered(
        data.userId,
        data.username,
        `${data.username}@legacy.com`, // v1 didn't have email
        new Date(data.registeredAt || Date.now())
      )
    }

    throw new Error(`Unsupported UserRegistered version: ${version}`)
  }

  override toEntry(
    source: UserRegistered,
    version: number,
    id: string,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      userId: source.userId,
      username: source.username,
      email: source.email,
      registeredAt: source.registeredAt.toISOString()
    })

    return new TextEntry(
      id,
      'UserRegistered',
      2, // Current version
      serialized,
      version,
      JSON.stringify({
        value: metadata.value,
        operation: metadata.operation,
        properties: Object.fromEntries(metadata.properties)
      })
    )
  }
}

/**
 * Custom adapter for UserAuthenticated event with schema evolution.
 *
 * Schema Evolution:
 * - v1: Had userId and timestamp only
 * - v2: Added sessionId field (CURRENT)
 */
export class UserAuthenticatedAdapter extends DefaultTextEntryAdapter<UserAuthenticated> {
  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): UserAuthenticated {
    // v2 is current
    if (version === 2) {
      return new UserAuthenticated(
        data.userId,
        data.sessionId,
        new Date(data.authenticatedAt)
      )
    }

    // Upcast v1 → v2: Generate sessionId
    if (version === 1) {
      return new UserAuthenticated(
        data.userId,
        `legacy-session-${Date.now()}`, // v1 didn't have sessionId
        new Date(data.authenticatedAt || Date.now())
      )
    }

    throw new Error(`Unsupported UserAuthenticated version: ${version}`)
  }

  override toEntry(
    source: UserAuthenticated,
    version: number,
    id: string,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      userId: source.userId,
      sessionId: source.sessionId,
      authenticatedAt: source.authenticatedAt.toISOString()
    })

    return new TextEntry(
      id,
      'UserAuthenticated',
      2, // Current version
      serialized,
      version,
      JSON.stringify({
        value: metadata.value,
        operation: metadata.operation,
        properties: Object.fromEntries(metadata.properties)
      })
    )
  }
}

/**
 * Simple adapter for UserDeactivated event (no schema evolution needed).
 */
export class UserDeactivatedAdapter extends DefaultTextEntryAdapter<UserDeactivated> {
  override toEntry(
    source: UserDeactivated,
    version: number,
    id: string,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      userId: source.userId,
      reason: source.reason,
      deactivatedAt: source.deactivatedAt.toISOString()
    })

    return new TextEntry(
      id,
      'UserDeactivated',
      1, // Version 1
      serialized,
      version,
      JSON.stringify({
        value: metadata.value,
        operation: metadata.operation,
        properties: Object.fromEntries(metadata.properties)
      })
    )
  }
}
