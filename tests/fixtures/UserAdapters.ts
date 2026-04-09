// Copyright © 2012-2026 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2026 Kalele, Inc. All rights reserved.
//
// See: LICENSE.md in repository root directory
//
// This file is part of DomoTactical-TS.
//
// DomoTactical-TS is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of
// the License, or (at your option) any later version.
//
// DomoTactical-TS is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with DomoTactical-TS. If not, see <https://www.gnu.org/licenses/>.

import { DefaultTextEntryAdapter, StoreTypeMapper } from 'domo-tactical/store'
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
    typeVersion: number
  ): UserRegistered {
    // v2 is current
    if (typeVersion === 2) {
      return new UserRegistered(
        data.userId,
        data.username,
        data.email,
        new Date(data.registeredAt)
      )
    }

    // Upcast v1 → v2: Add default email
    if (typeVersion === 1) {
      return new UserRegistered(
        data.userId,
        data.username,
        `${data.username}@legacy.com`, // v1 didn't have email
        new Date(data.registeredAt || Date.now())
      )
    }

    throw new Error(`Unsupported UserRegistered typeVersion: ${typeVersion}`)
  }

  override toEntry(
    source: UserRegistered,
    streamVersion: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      userId: source.userId,
      username: source.username,
      email: source.email,
      registeredAt: source.registeredAt.toISOString()
    })

    // Use 6-arg constructor - Journal assigns globalPosition
    // Map type name to symbolic name for storage (best practice)
    const symbolicType = StoreTypeMapper.instance().toSymbolicName('UserRegistered')
    return new TextEntry(
      source.id(),
      symbolicType,
      2, // Current typeVersion
      serialized,
      streamVersion,
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
    typeVersion: number
  ): UserAuthenticated {
    // v2 is current
    if (typeVersion === 2) {
      return new UserAuthenticated(
        data.userId,
        data.sessionId,
        new Date(data.authenticatedAt)
      )
    }

    // Upcast v1 → v2: Generate sessionId
    if (typeVersion === 1) {
      return new UserAuthenticated(
        data.userId,
        `legacy-session-${Date.now()}`, // v1 didn't have sessionId
        new Date(data.authenticatedAt || Date.now())
      )
    }

    throw new Error(`Unsupported UserAuthenticated typeVersion: ${typeVersion}`)
  }

  override toEntry(
    source: UserAuthenticated,
    streamVersion: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      userId: source.userId,
      sessionId: source.sessionId,
      authenticatedAt: source.authenticatedAt.toISOString()
    })

    // Use 6-arg constructor - Journal assigns globalPosition
    // Map type name to symbolic name for storage (best practice)
    const symbolicType = StoreTypeMapper.instance().toSymbolicName('UserAuthenticated')
    return new TextEntry(
      source.id(),
      symbolicType,
      2, // Current typeVersion
      serialized,
      streamVersion,
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
    streamVersion: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      userId: source.userId,
      reason: source.reason,
      deactivatedAt: source.deactivatedAt.toISOString()
    })

    // Use 6-arg constructor - Journal assigns globalPosition
    // Map type name to symbolic name for storage (best practice)
    const symbolicType = StoreTypeMapper.instance().toSymbolicName('UserDeactivated')
    return new TextEntry(
      source.id(),
      symbolicType,
      1, // typeVersion
      serialized,
      streamVersion,
      JSON.stringify({
        value: metadata.value,
        operation: metadata.operation,
        properties: Object.fromEntries(metadata.properties)
      })
    )
  }
}
