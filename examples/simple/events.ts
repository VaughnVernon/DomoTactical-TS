// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { IdentifiedDomainEvent } from '../../src/model'

/**
 * Event raised when a bank account is opened.
 */
export class AccountOpened extends IdentifiedDomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly owner: string,
    public readonly initialBalance: number
  ) {
    super()
  }

  override identity(): string {
    return this.accountId
  }

  override id(): string {
    return `AccountOpened:${this.accountId}`
  }
}

/**
 * Event raised when money is deposited into an account.
 */
export class MoneyDeposited extends IdentifiedDomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly amount: number
  ) {
    super()
  }

  override identity(): string {
    return this.accountId
  }

  override id(): string {
    return `MoneyDeposited:${this.accountId}:${this.amount}:${this.dateTimeSourced}`
  }
}

/**
 * Event raised when money is withdrawn from an account.
 */
export class MoneyWithdrawn extends IdentifiedDomainEvent {
  constructor(
    public readonly accountId: string,
    public readonly amount: number
  ) {
    super()
  }

  override identity(): string {
    return this.accountId
  }

  override id(): string {
    return `MoneyWithdrawn:${this.accountId}:${this.amount}:${this.dateTimeSourced}`
  }
}
