// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

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
