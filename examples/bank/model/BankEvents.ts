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
