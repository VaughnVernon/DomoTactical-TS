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
