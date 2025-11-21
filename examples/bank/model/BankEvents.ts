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
 * Event indicating the bank opened a new account.
 */
export class BankAccountOpened extends IdentifiedDomainEvent {
  constructor(
    public readonly bankId: string,
    public readonly accountNumber: string,
    public readonly owner: string,
    public readonly accountType: AccountType,
    public readonly initialBalance: number,
    public readonly openedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.bankId
  }

  override id(): string {
    return `bank-account-opened-${this.accountNumber}-${this.openedAt.getTime()}`
  }
}

/**
 * Event indicating an account was frozen.
 */
export class BankAccountFrozen extends IdentifiedDomainEvent {
  constructor(
    public readonly bankId: string,
    public readonly accountNumber: string,
    public readonly reason: string,
    public readonly frozenAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.bankId
  }

  override id(): string {
    return `bank-account-frozen-${this.accountNumber}-${this.frozenAt.getTime()}`
  }
}

/**
 * Event indicating an account was closed.
 */
export class BankAccountClosed extends IdentifiedDomainEvent {
  constructor(
    public readonly bankId: string,
    public readonly accountNumber: string,
    public readonly finalBalance: number,
    public readonly closedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.bankId
  }

  override id(): string {
    return `bank-account-closed-${this.accountNumber}-${this.closedAt.getTime()}`
  }
}
