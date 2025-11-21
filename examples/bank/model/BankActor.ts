// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { ActorProtocol, Definition, Protocol } from 'domo-actors'
import { EventSourcedEntity } from 'domo-tactical/model/sourcing'
import { Account, AccountType, Bank, PendingTransfer, TransferCoordinator, TransferResult } from './BankTypes'
import { BankAccountOpened, BankAccountFrozen, BankAccountClosed } from './BankEvents'
import { AccountActor } from './AccountActor'
import { TransferCoordinatorActor } from './TransferCoordinatorActor'

/**
 * Event-sourced bank actor implementation.
 *
 * Root coordinator that:
 * - Creates and manages account actors
 * - Maintains a transfer coordinator for all transfers
 * - Routes operations to appropriate child actors
 * - Uses EventSourcedEntity for bank-level events
 */
export class BankActor extends EventSourcedEntity implements Bank {
  private readonly bankId: string = 'bank-001'
  private accounts = new Map<string, Account>()
  private transferCoordinator!: TransferCoordinator
  private nextAccountNumber = 1

  // Static block to register event handlers
  static {
    EventSourcedEntity.registerConsumer(BankActor, BankAccountOpened, (bank, event) => {
      // Account is already created as a child actor, this event is for audit
      bank.logger().log(
        `Bank event: Account opened: ${event.accountNumber} (${event.owner}, ${event.accountType}, $${event.initialBalance.toFixed(2)})`
      )
    })

    EventSourcedEntity.registerConsumer(BankActor, BankAccountFrozen, (bank, event) => {
      bank.logger().log(
        `Bank event: Account frozen: ${event.accountNumber} - Reason: ${event.reason}`
      )
    })

    EventSourcedEntity.registerConsumer(BankActor, BankAccountClosed, (bank, event) => {
      bank.logger().log(
        `Bank event: Account closed: ${event.accountNumber} - Final balance: $${event.finalBalance.toFixed(2)}`
      )
    })
  }

  constructor() {
    super('bank-001')
  }

  async openAccount(
    owner: string,
    accountType: AccountType,
    initialBalance: number
  ): Promise<string> {
    if (Number.isNaN(initialBalance) || initialBalance < 0) {
      const value = initialBalance ? initialBalance.toString() : 'unknown'
      throw new Error(`Initial balance must be a positive monetary value: ${value}`)
    }

    const accountNumber = this.generateAccountNumber()

    // Create account actor as child
    const accountProtocol: Protocol = {
      type: () => 'Account',
      instantiator: () => ({
        instantiate: (definition: Definition) => {
          const params = definition.parameters()
          return new AccountActor(
            params[0],  // accountNumber
            params[1],  // owner
            params[2],  // accountType
            params[3]   // initialBalance
          )
        }
      })
    }

    const accountDefinition = new Definition(
      'Account',
      this.address(),  // Not used, stage generates new address
      [accountNumber, owner, accountType, initialBalance]
    )

    const account = this.childActorFor<Account>(accountProtocol, accountDefinition, 'account-supervisor')

    // Register with bank and transfer coordinator
    // Note: Journal is automatically retrieved from Stage by SourcedEntity constructor
    this.accounts.set(accountNumber, account)
    this.executionContext().collaborators([account as ActorProtocol])
    await this.transferCoordinator.registerAccount(accountNumber, account)

    // Apply bank-level event
    const event = new BankAccountOpened(this.bankId, accountNumber, owner, accountType, initialBalance)
    await this.apply(event)

    this.logger().log(
      `Account opened: ${accountNumber} (${owner}, ${accountType}, $${initialBalance.toFixed(2)})`
    )

    return accountNumber
  }

  async account(accountNumber: string): Promise<Account | undefined> {
    return this.accounts.get(accountNumber)
  }

  async deposit(accountNumber: string, amount: number): Promise<number> {
    if (isNaN(amount)) {
      const value = amount ? amount.toString() : 'unknown'
      throw new Error(`Deposit amount must be a positive monetary value: ${value}`)
    }

    if (!accountNumber || accountNumber.trim() === '') {
      throw new Error('Account Number is required')
    }

    const account = await this.account(accountNumber.trim())
    if (!account) {
      throw new Error(`Account does not exist: ${accountNumber}`)
    }

    return account.deposit(amount)
  }

  async withdraw(accountNumber: string, amount: number): Promise<number> {
    if (isNaN(amount)) {
      const value = amount ? amount.toString() : 'unknown'
      throw new Error(`Withdraw amount must be a positive monetary value: ${value}`)
    }

    if (!accountNumber || accountNumber.trim() === '') {
      throw new Error('Account Number is required')
    }

    const account = await this.account(accountNumber.trim())
    if (!account) {
      throw new Error(`Account does not exist: ${accountNumber}`)
    }

    return account.withdraw(amount)
  }

  async transfer(
    fromAccountNumber: string,
    toAccountNumber: string,
    amount: number
  ): Promise<TransferResult> {
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: "${amount}" is not a number`)
    }

    fromAccountNumber = fromAccountNumber ? fromAccountNumber.trim() : ''
    if (fromAccountNumber === '') {
      throw new Error('Source account number is required')
    }

    toAccountNumber = toAccountNumber ? toAccountNumber.trim() : ''
    if (toAccountNumber === '') {
      throw new Error('Destination account number is required')
    }

    try {
      const transactionId = await this.transferCoordinator.initiateTransfer(
        fromAccountNumber,
        toAccountNumber,
        amount
      )

      return {
        success: true,
        transactionId
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async pendingTransfers(): Promise<PendingTransfer[]> {
    return this.transferCoordinator.getPendingTransfers()
  }

  async beforeStart(): Promise<void> {
    // Create long-lived transfer coordinator as child actor
    const transferCoordinatorProtocol: Protocol = {
      type: () => 'TransferCoordinator',
      instantiator: () => ({
        instantiate: () => new TransferCoordinatorActor('transfer-coordinator-001')
      })
    }

    const transferCoordinatorDefinition = new Definition(
      'TransferCoordinator',
      this.address(),  // Not used, stage generates new address
      []
    )

    this.transferCoordinator = this.childActorFor<TransferCoordinator>(
      transferCoordinatorProtocol,
      transferCoordinatorDefinition,
      'transfer-supervisor'
    )

    // Note: Journal is automatically retrieved from Stage by SourcedEntity constructor
    this.executionContext().collaborators([this.transferCoordinator as ActorProtocol])

    this.logger().log('Bank initialized with TransferCoordinator')
  }

  private generateAccountNumber(): string {
    const accountNumber = this.nextAccountNumber++
    return `ACC${accountNumber.toString().padStart(6, '0')}`
  }
}
