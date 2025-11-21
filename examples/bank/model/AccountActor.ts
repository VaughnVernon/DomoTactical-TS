// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { EventSourcedEntity } from 'domo-tactical/model/sourcing'
import { Account, AccountType, AccountInfo } from './BankTypes'
import { AccountOpened, FundsDeposited, FundsWithdrawn, FundsRefunded } from './AccountEvents'

/**
 * Event-sourced bank account actor implementation.
 *
 * Demonstrates event sourcing with EventSourcedEntity.
 * All state changes are persisted as events in the Journal.
 * Read models (projections) are built asynchronously from the event stream.
 */
export class AccountActor extends EventSourcedEntity implements Account {
  private balance: number = 0
  private accountNumber: string = ''
  private owner: string = ''
  private accountType: AccountType = AccountType.Checking
  private createdAt: Date = new Date()

  // Static block to register event handlers
  static {
    EventSourcedEntity.registerConsumer(AccountActor, AccountOpened, (account, event) => {
      account.accountNumber = event.accountNumber
      account.owner = event.owner
      account.accountType = event.accountType
      account.balance = event.initialBalance
      account.createdAt = event.openedAt
    })

    EventSourcedEntity.registerConsumer(AccountActor, FundsDeposited, (account, event) => {
      account.balance += event.amount
    })

    EventSourcedEntity.registerConsumer(AccountActor, FundsWithdrawn, (account, event) => {
      account.balance -= event.amount
    })

    EventSourcedEntity.registerConsumer(AccountActor, FundsRefunded, (account, event) => {
      account.balance += event.amount
    })
  }

  constructor(accountNumber: string, owner: string, accountType: AccountType, initialBalance: number) {
    super(accountNumber)
    // Initial event will be applied to set state
    this.openAccount(accountNumber, owner, accountType, initialBalance)
  }

  private async openAccount(
    accountNumber: string,
    owner: string,
    accountType: AccountType,
    initialBalance: number
  ): Promise<void> {
    const event = new AccountOpened(accountNumber, owner, accountType, initialBalance)
    await this.apply(event)
  }

  async deposit(amount: number): Promise<number> {
    if (Number.isNaN(amount) || amount < 0) {
      const value = amount ? amount.toString() : 'unknown'
      throw new Error(`Deposit amount must be a positive monetary value: ${value}`)
    }

    const event = new FundsDeposited(this.accountNumber, amount)
    await this.apply(event)

    return this.balance
  }

  async withdraw(amount: number): Promise<number> {
    if (Number.isNaN(amount) || amount < 0) {
      const value = amount ? amount.toString() : 'unknown'
      throw new Error(`Withdrawal amount must be a positive monetary value: ${value}`)
    }

    if (amount > this.balance) {
      throw new Error(`Insufficient funds. Balance: $${this.balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`)
    }

    const event = new FundsWithdrawn(this.accountNumber, amount)
    await this.apply(event)

    return this.balance
  }

  async getBalance(): Promise<number> {
    return this.balance
  }

  async getInfo(): Promise<AccountInfo> {
    return {
      accountNumber: this.accountNumber,
      owner: this.owner,
      type: this.accountType,
      balance: this.balance,
      createdAt: this.createdAt
    }
  }

  async refund(amount: number, transactionId: string, reason: string): Promise<number> {
    const event = new FundsRefunded(this.accountNumber, amount, transactionId, reason)
    await this.apply(event)

    return this.balance
  }

  protected async restore(): Promise<void> {
    // Restore entity from journal
    const reader = await this.journal().streamReader(this.streamName)
    const stream = await reader.readNext()

    if (stream && stream.entries.length > 0) {
      for (const entry of stream.entries) {
        const event = JSON.parse(entry.entryData as string)
        // Events will be applied through registered consumers
        await this.applyEvent(event)
      }
    }
  }

  private async applyEvent(eventData: any): Promise<void> {
    // Reconstruct event objects and apply them
    // This would need proper event deserialization in a production system
    // For now, this is a placeholder for the restore mechanism
  }
}
