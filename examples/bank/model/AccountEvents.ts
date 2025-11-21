// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { IdentifiedDomainEvent } from 'domo-tactical/model'
import { AccountType } from './BankTypes'

/**
 * Event indicating a new account was opened.
 */
export class AccountOpened extends IdentifiedDomainEvent {
  constructor(
    public readonly accountNumber: string,
    public readonly owner: string,
    public readonly accountType: AccountType,
    public readonly initialBalance: number,
    public readonly openedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.accountNumber
  }

  override id(): string {
    return `account-opened-${this.accountNumber}-${this.openedAt.getTime()}`
  }
}

/**
 * Event indicating funds were deposited into an account.
 */
export class FundsDeposited extends IdentifiedDomainEvent {
  constructor(
    public readonly accountNumber: string,
    public readonly amount: number,
    public readonly transactionId: string = `dep-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    public readonly depositedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.accountNumber
  }

  override id(): string {
    return this.transactionId
  }
}

/**
 * Event indicating funds were withdrawn from an account.
 */
export class FundsWithdrawn extends IdentifiedDomainEvent {
  constructor(
    public readonly accountNumber: string,
    public readonly amount: number,
    public readonly transactionId: string = `wd-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    public readonly withdrawnAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.accountNumber
  }

  override id(): string {
    return this.transactionId
  }
}

/**
 * Event indicating funds were refunded to an account.
 */
export class FundsRefunded extends IdentifiedDomainEvent {
  constructor(
    public readonly accountNumber: string,
    public readonly amount: number,
    public readonly originalTransactionId: string,
    public readonly reason: string,
    public readonly refundedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.accountNumber
  }

  override id(): string {
    return `refund-${this.originalTransactionId}`
  }
}
