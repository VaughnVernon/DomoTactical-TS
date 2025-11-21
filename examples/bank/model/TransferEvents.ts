// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

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
