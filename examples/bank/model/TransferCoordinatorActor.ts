// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { EventSourcedEntity } from 'domo-tactical/model/sourcing'
import { Account, PendingTransfer, TransferCoordinator, TransferStatus } from './BankTypes'
import {
  TransferInitiated,
  TransferWithdrawn,
  TransferDepositAttempted,
  TransferDepositFailed,
  TransferCompleted,
  TransferRefunded
} from './TransferEvents'

/**
 * Event-sourced transfer coordinator actor.
 *
 * Implements realistic banking transfer flow using event sourcing:
 * 1. Withdraw from source account (separate transaction)
 * 2. Record pending state via TransferWithdrawn event
 * 3. Attempt deposit to destination via TransferDepositAttempted event
 * 4. Retry on failure with exponential backoff
 * 5. Refund to source if max retries exceeded via TransferRefunded event
 */
export class TransferCoordinatorActor extends EventSourcedEntity implements TransferCoordinator {
  private readonly coordinatorId: string
  private accounts = new Map<string, Account>()
  private pendingTransfers = new Map<string, PendingTransfer>()
  private readonly MAX_RETRIES = 3
  private readonly INITIAL_RETRY_DELAY_MS = 1000

  // Static block to register event handlers
  static {
    EventSourcedEntity.registerConsumer(TransferCoordinatorActor, TransferInitiated, (coordinator, event) => {
      coordinator.logger().log(
        `Transfer initiated: ${event.transactionId} from ${event.fromAccountNumber} to ${event.toAccountNumber}, amount: $${event.amount}`
      )
    })

    EventSourcedEntity.registerConsumer(TransferCoordinatorActor, TransferWithdrawn, (coordinator, event) => {
      // Record pending transfer
      const pending: PendingTransfer = {
        transactionId: event.transactionId,
        fromAccountNumber: event.fromAccountNumber,
        toAccountNumber: coordinator.pendingTransfers.get(event.transactionId)?.toAccountNumber || '',
        amount: event.amount,
        status: 'withdrawn',
        withdrawnAt: event.withdrawnAt,
        attempts: 0
      }
      coordinator.pendingTransfers.set(event.transactionId, pending)
    })

    EventSourcedEntity.registerConsumer(TransferCoordinatorActor, TransferDepositAttempted, (coordinator, event) => {
      const pending = coordinator.pendingTransfers.get(event.transactionId)
      if (pending) {
        pending.attempts = event.attemptNumber
      }
    })

    EventSourcedEntity.registerConsumer(TransferCoordinatorActor, TransferDepositFailed, (coordinator, event) => {
      coordinator.logger().log(
        `Transfer deposit failed: ${event.transactionId}, attempt ${event.attemptNumber}, reason: ${event.reason}`
      )
    })

    EventSourcedEntity.registerConsumer(TransferCoordinatorActor, TransferCompleted, (coordinator, event) => {
      coordinator.pendingTransfers.delete(event.transactionId)
      coordinator.logger().log(
        `Transfer completed: ${event.transactionId} - $${event.amount} from ${event.fromAccountNumber} to ${event.toAccountNumber}`
      )
    })

    EventSourcedEntity.registerConsumer(TransferCoordinatorActor, TransferRefunded, (coordinator, event) => {
      coordinator.pendingTransfers.delete(event.transactionId)
      coordinator.logger().log(
        `Transfer refunded: ${event.transactionId} - $${event.amount} refunded to ${event.fromAccountNumber}, reason: ${event.reason}`
      )
    })
  }

  constructor(coordinatorId: string) {
    super(coordinatorId)
    this.coordinatorId = coordinatorId
  }

  async registerAccount(accountNumber: string, account: Account): Promise<void> {
    this.accounts.set(accountNumber, account)
  }

  async initiateTransfer(fromAccountNumber: string, toAccountNumber: string, amount: number): Promise<string> {
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    const fromAccount = this.accounts.get(fromAccountNumber)
    const toAccount = this.accounts.get(toAccountNumber)

    if (!fromAccount) {
      throw new Error(`Source account not found: ${fromAccountNumber}`)
    }

    if (!toAccount) {
      throw new Error(`Destination account not found: ${toAccountNumber}`)
    }

    // Apply transfer initiated event
    const initiatedEvent = new TransferInitiated(
      this.coordinatorId,
      transactionId,
      fromAccountNumber,
      toAccountNumber,
      amount
    )
    await this.apply(initiatedEvent)

    // Create initial pending transfer record
    const pending: PendingTransfer = {
      transactionId,
      fromAccountNumber,
      toAccountNumber,
      amount,
      status: 'withdrawn',
      withdrawnAt: new Date(),
      attempts: 0
    }
    this.pendingTransfers.set(transactionId, pending)

    // Step 1: Withdraw from source account
    try {
      await fromAccount.withdraw(amount)

      // Apply withdrawn event
      const withdrawnEvent = new TransferWithdrawn(
        this.coordinatorId,
        transactionId,
        fromAccountNumber,
        amount
      )
      await this.apply(withdrawnEvent)

      // Step 2: Attempt deposit (async via self-send)
      this.attemptDepositAsync(transactionId, toAccount, amount, 1)

      return transactionId
    } catch (error) {
      throw new Error(`Failed to withdraw from source account: ${(error as Error).message}`)
    }
  }

  async getTransferStatus(transactionId: string): Promise<TransferStatus | undefined> {
    const pending = this.pendingTransfers.get(transactionId)
    return pending?.status
  }

  async getPendingTransfers(): Promise<PendingTransfer[]> {
    return Array.from(this.pendingTransfers.values())
  }

  /**
   * Attempts to deposit to destination account (async operation).
   */
  private attemptDepositAsync(
    transactionId: string,
    toAccount: Account,
    amount: number,
    attemptNumber: number
  ): void {
    // Use setTimeout to simulate async processing with retry logic
    setTimeout(async () => {
      try {
        // Apply deposit attempted event
        const pending = this.pendingTransfers.get(transactionId)
        if (!pending) return

        const attemptedEvent = new TransferDepositAttempted(
          this.coordinatorId,
          transactionId,
          pending.toAccountNumber,
          attemptNumber
        )
        await this.apply(attemptedEvent)

        // Attempt deposit
        await toAccount.deposit(amount)

        // Success! Apply completed event
        const completedEvent = new TransferCompleted(
          this.coordinatorId,
          transactionId,
          pending.fromAccountNumber,
          pending.toAccountNumber,
          amount
        )
        await this.apply(completedEvent)
      } catch (error) {
        // Deposit failed
        const pending = this.pendingTransfers.get(transactionId)
        if (!pending) return

        const failedEvent = new TransferDepositFailed(
          this.coordinatorId,
          transactionId,
          pending.toAccountNumber,
          (error as Error).message,
          attemptNumber
        )
        await this.apply(failedEvent)

        // Retry logic
        if (attemptNumber < this.MAX_RETRIES) {
          const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attemptNumber - 1)
          setTimeout(() => {
            this.attemptDepositAsync(transactionId, toAccount, amount, attemptNumber + 1)
          }, delay)
        } else {
          // Max retries exceeded, refund
          await this.processRefundAsync(transactionId, 'Max deposit retries exceeded')
        }
      }
    }, 100)
  }

  /**
   * Processes refund to source account.
   */
  private async processRefundAsync(transactionId: string, reason: string): Promise<void> {
    const pending = this.pendingTransfers.get(transactionId)
    if (!pending) return

    const fromAccount = this.accounts.get(pending.fromAccountNumber)
    if (!fromAccount) {
      this.logger().log(`ERROR: Cannot refund - source account not found: ${pending.fromAccountNumber}`)
      return
    }

    try {
      await fromAccount.refund(pending.amount, transactionId, reason)

      // Apply refunded event
      const refundedEvent = new TransferRefunded(
        this.coordinatorId,
        transactionId,
        pending.fromAccountNumber,
        pending.amount,
        reason
      )
      await this.apply(refundedEvent)
    } catch (error) {
      this.logger().log(`ERROR: Refund failed for transaction ${transactionId}: ${(error as Error).message}`)
    }
  }
}
