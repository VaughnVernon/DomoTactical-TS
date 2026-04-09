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
 * Event indicating a transfer was initiated.
 */
export class TransferInitiated extends IdentifiedDomainEvent {
  constructor(
    public readonly coordinatorId: string,
    public readonly transactionId: string,
    public readonly fromAccountNumber: string,
    public readonly toAccountNumber: string,
    public readonly amount: number,
    public readonly initiatedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.coordinatorId
  }

  override id(): string {
    return this.transactionId
  }
}

/**
 * Event indicating funds were withdrawn from source account.
 */
export class TransferWithdrawn extends IdentifiedDomainEvent {
  constructor(
    public readonly coordinatorId: string,
    public readonly transactionId: string,
    public readonly fromAccountNumber: string,
    public readonly amount: number,
    public readonly withdrawnAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.coordinatorId
  }

  override id(): string {
    return `${this.transactionId}-withdrawn`
  }
}

/**
 * Event indicating deposit to destination account was attempted.
 */
export class TransferDepositAttempted extends IdentifiedDomainEvent {
  constructor(
    public readonly coordinatorId: string,
    public readonly transactionId: string,
    public readonly toAccountNumber: string,
    public readonly attemptNumber: number,
    public readonly attemptedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.coordinatorId
  }

  override id(): string {
    return `${this.transactionId}-deposit-attempt-${this.attemptNumber}`
  }
}

/**
 * Event indicating deposit to destination account failed.
 */
export class TransferDepositFailed extends IdentifiedDomainEvent {
  constructor(
    public readonly coordinatorId: string,
    public readonly transactionId: string,
    public readonly toAccountNumber: string,
    public readonly reason: string,
    public readonly attemptNumber: number,
    public readonly failedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.coordinatorId
  }

  override id(): string {
    return `${this.transactionId}-deposit-failed-${this.attemptNumber}`
  }
}

/**
 * Event indicating a transfer was completed successfully.
 */
export class TransferCompleted extends IdentifiedDomainEvent {
  constructor(
    public readonly coordinatorId: string,
    public readonly transactionId: string,
    public readonly fromAccountNumber: string,
    public readonly toAccountNumber: string,
    public readonly amount: number,
    public readonly completedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.coordinatorId
  }

  override id(): string {
    return `${this.transactionId}-completed`
  }
}

/**
 * Event indicating a transfer failed and was refunded.
 */
export class TransferRefunded extends IdentifiedDomainEvent {
  constructor(
    public readonly coordinatorId: string,
    public readonly transactionId: string,
    public readonly fromAccountNumber: string,
    public readonly amount: number,
    public readonly reason: string,
    public readonly refundedAt: Date = new Date()
  ) {
    super()
  }

  override identity(): string {
    return this.coordinatorId
  }

  override id(): string {
    return `${this.transactionId}-refunded`
  }
}
