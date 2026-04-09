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

import { IdentifiedDomainEvent } from 'domo-tactical/model'

/**
 * Simple user domain events for testing purposes.
 * Demonstrates event sourcing patterns without complex business logic.
 */

export class UserRegistered extends IdentifiedDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly email: string,
    public readonly registeredAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.userId
  }

  override id(): string {
    return `user-registered-${this.userId}-${this.registeredAt.getTime()}`
  }
}

export class UserAuthenticated extends IdentifiedDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly authenticatedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.userId
  }

  override id(): string {
    return `user-authenticated-${this.sessionId}`
  }
}

export class UserAuthorized extends IdentifiedDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly resource: string,
    public readonly permission: string,
    public readonly authorizedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.userId
  }

  override id(): string {
    return `user-authorized-${this.userId}-${this.resource}-${this.authorizedAt.getTime()}`
  }
}

export class UserDeactivated extends IdentifiedDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly reason: string,
    public readonly deactivatedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.userId
  }

  override id(): string {
    return `user-deactivated-${this.userId}-${this.deactivatedAt.getTime()}`
  }
}
