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

import * as readline from 'readline'
import { stage, Protocol, Definition } from 'domo-actors'
import { InMemoryJournal } from 'domo-tactical/store/journal'
import { InMemoryDocumentStore } from 'domo-tactical/store/document'
import { Journal, DocumentStore } from 'domo-tactical'
import { Bank, Teller, RequestType } from './model/BankTypes'
import { BankActor } from './model/BankActor'
import { TellerActor } from './model/TellerActor'
import { BankSupervisor } from './model/supervisors/BankSupervisor'
import { AccountSupervisor } from './model/supervisors/AccountSupervisor'
import { TransferSupervisor } from './model/supervisors/TransferSupervisor'
import { EntryAdapterProvider, StoreTypeMapper } from 'domo-tactical/store'
import {
  AccountOpenedAdapter,
  FundsDepositedAdapter,
  FundsWithdrawnAdapter,
  FundsRefundedAdapter
} from './infra/adapters'
import {
  AccountOpened,
  FundsDeposited,
  FundsWithdrawn,
  FundsRefunded
} from './model/AccountEvents'
import {
  ProjectionSupervisor,
  TextProjectionDispatcherActor,
  JournalConsumerActor,
  ProjectToDescription,
  type ProjectionDispatcher,
  type JournalConsumer,
  type Projection
} from 'domo-tactical'
import { TestConfirmer } from 'domo-tactical/testkit'
import {
  AccountSummaryProjectionActor,
  TransactionHistoryProjectionActor,
  BankStatisticsProjectionActor
} from './infra/projections'

/**
 * Banking System CLI using DomoTactical-TS
 *
 * Interactive command-line interface demonstrating DomoTactical patterns:
 * - Event Sourcing with EventSourcedEntity
 * - Shared InMemoryJournal for all event-sourced entities
 * - Parent-child actor hierarchies
 * - Domain events for Account, Bank, and TransferCoordinator
 * - Self-messaging for state changes
 * - Realistic multi-step transfer coordination
 * - Supervision strategies with "let it crash" philosophy
 * - Message-driven architecture
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

let teller: Teller

/**
 * Infrastructure that needs cleanup
 */
interface BankInfrastructure {
  journal: Journal<string>
  documentStore: DocumentStore
  consumer: JournalConsumer
}

/**
 * Prompt the user for the answer to the given question.
 * @param question the question for which to user us to be prompted for an answer
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

/**
 * Displays the main menu.
 */
async function showMenu(): Promise<void> {
  console.log('\n')
  console.log('╔════════════════════════════════════════╗')
  console.log('║   DomoTactical-TS Bank Example         ║')
  console.log('╠════════════════════════════════════════╣')
  console.log('║  1. Open Account                       ║')
  console.log('║  2. Deposit Funds                      ║')
  console.log('║  3. Withdraw Funds                     ║')
  console.log('║  4. Transfer Funds                     ║')
  console.log('║  5. Account Summary                    ║')
  console.log('║  6. Transaction History                ║')
  console.log('║  7. List All Accounts                  ║')
  console.log('║  8. Pending Transfers                  ║')
  console.log('║  9. Bank Statistics                    ║')
  console.log('║  0. Exit                               ║')
  console.log('╚════════════════════════════════════════╝\n')
}

/**
 * Open a new account.
 */
async function openAccount(): Promise<void> {
  console.log('\n--- Open Account ---')
  const owner = await prompt('Owner name: ')
  const accountType = await prompt('Account type (checking/savings): ')
  const initialBalance = await prompt('Initial balance: $')

  const request = { owner, accountType, initialBalance }

  teller.executionContext().reset()
    .setValue('command', RequestType.OpenAccount)
    .setValue('request', request)

  const result = await teller.openAccount(request)

  console.log(result)
}

/**
 * Deposit funds into an existing account.
 */
async function deposit(): Promise<void> {
  console.log('\n--- Deposit Funds ---')
  const accountNumber = await prompt('Account Number: ')
  const amount = await prompt('Amount: $')

  const request = { accountNumber, amount }

  teller.executionContext().reset()
    .setValue('command', RequestType.Deposit)
    .setValue('request', request)

  const newBalance = await teller.deposit(request)

  console.log(`✅ Deposit successful. New balance: $${newBalance.toFixed(2)}`)
}

/**
 * Withdraw funds from an existing account.
 */
async function withdraw(): Promise<void> {
  console.log('\n--- Withdraw Funds ---')
  const accountNumber = await prompt('Account Number: ')
  const amount = await prompt('Amount: $')

  const request = { accountNumber, amount }

  teller.executionContext().reset()
    .setValue('command', RequestType.Withdraw)
    .setValue('request', request)

  const newBalance = await teller.withdraw(request)

  console.log(`✅ Withdrawal successful. New balance: $${newBalance.toFixed(2)}`)
}

/**
 * Transfer funds from one account into an another account.
 */
async function transfer(): Promise<void> {
  console.log('\n--- Transfer Funds ---')
  const fromAccountNumber = await prompt('From Account Number: ')
  const toAccountNumber = await prompt('To Account Number: ')
  const amount = await prompt('Amount: $')

  const request = { fromAccountNumber, toAccountNumber, amount }

  teller.executionContext().reset()
    .setValue('command', RequestType.Transfer)
    .setValue('request', request)

  const result = await teller.transfer(request)

  if (result.success) {
    console.log(`✅ Transfer initiated successfully`)
    console.log(`   Transaction ID: ${result.transactionId}`)
    console.log(`   Note: Transfer is processed asynchronously with retry logic`)
  } else {
    console.log(`❌ Transfer failed: ${result.error}`)
  }
}

/**
 * Display a summary of an account.
 */
async function accountSummary(): Promise<void> {
  console.log('\n--- Account Summary ---')
  const accountNumber = await prompt('Account Number: ')

  const request = { accountNumber }

  teller.executionContext().reset()
    .setValue('command', RequestType.AccountSummary)
    .setValue('request', request)

  const summary = await teller.accountSummary(request)

  console.log(summary)
}

/**
 * Display the transaction history of an account.
 */
async function transactionHistory(): Promise<void> {
  console.log('\n--- Transaction History ---')
  const accountNumber = await prompt('Account Number: ')
  const limit = await prompt('Limit (press Enter for all): ')

  const request = { accountNumber, limit }

  teller.executionContext().reset()
    .setValue('command', RequestType.TransactionHistory)
    .setValue('request', request)

  const history = await teller.transactionHistory(request)

  console.log(history)
}

/**
 * Display a list of all accounts.
 */
async function allAccounts(): Promise<void> {
  console.log('\n--- All Accounts ---')

  teller.executionContext().reset()
    .setValue('command', RequestType.AllAccounts)

  const accounts = await teller.allAccounts()

  console.log(accounts)
}

/**
 * Display a list of all pending transfers.
 */
async function pendingTransfers(): Promise<void> {
  console.log('\n--- Pending Transfers ---')

  teller.executionContext().reset()
    .setValue('command', RequestType.PendingTransfers)

  const pending = await teller.pendingTransfers()

  console.log(pending)
}

/**
 * Display bank-wide statistics.
 */
async function bankStatistics(): Promise<void> {
  console.log('\n--- Bank Statistics ---')

  teller.executionContext().reset()
    .setValue('command', RequestType.BankStatistics)

  const stats = await teller.bankStatistics()

  console.log(stats)
}

// =============================================================================
// INFRASTRUCTURE SETUP FUNCTIONS
// =============================================================================

/**
 * Setup the persistence infrastructure (journal and document store).
 * Registers them on the Stage for actor access.
 */
function setupPersistenceInfrastructure(): {
  journal: Journal<string>
  documentStore: DocumentStore
} {
  console.log('\n🏦 Starting DomoTactical-TS Bank Example...\n')

  // Create shared journal for all event-sourced entities as an actor
  const journalProtocol: Protocol = {
    type: () => 'Journal',
    instantiator: () => ({ instantiate: () => new InMemoryJournal<string>() })
  }
  const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, 'default')
  stage().registerValue('domo-tactical:bank.journal', journal)
  console.log('✅ Created shared InMemoryJournal for event sourcing')

  // Create shared document store for documents and read models as an actor
  const storeProtocol: Protocol = {
    type: () => 'DocumentStore',
    instantiator: () => ({ instantiate: () => new InMemoryDocumentStore() })
  }
  const documentStore = stage().actorFor<DocumentStore>(storeProtocol, undefined, 'default')
  stage().registerValue('domo-tactical:bank.documentStore', documentStore)
  console.log('✅ Created shared InMemoryDocumentStore for documents and read models')

  return { journal, documentStore }
}

/**
 * Register type mappings for symbolic storage names.
 * Maps Source type names to symbolic names for Journal entries,
 * and State type names to symbolic names for DocumentStore documents.
 *
 * Although not strictly required (convention-based conversion is automatic),
 * explicit mappings provide:
 * - Documentation of the storage schema
 * - Protection against class renaming
 * - Custom naming conventions if desired
 */
function registerTypeMappings(): void {
  const typeMapper = StoreTypeMapper.instance()

  // Source/Entry type mappings (domain events → journal entries)
  typeMapper
    .mapping('AccountOpened', 'account-opened')
    .mapping('FundsDeposited', 'funds-deposited')
    .mapping('FundsWithdrawn', 'funds-withdrawn')
    .mapping('FundsRefunded', 'funds-refunded')

  // State type mappings (documents → document store)
  typeMapper
    .mapping('AccountSummary', 'account-summary')
    .mapping('TransactionHistory', 'transaction-history')
    .mapping('BankStatistics', 'bank-statistics')

  console.log('✅ Registered type mappings for storage abstraction')
}

/**
 * Register custom entry adapters for domain events.
 * Enables schema evolution and custom serialization.
 */
function registerEntryAdapters(): void {
  const adapterProvider = EntryAdapterProvider.instance()
  adapterProvider.registerAdapter(AccountOpened, new AccountOpenedAdapter())
  adapterProvider.registerAdapter(FundsDeposited, new FundsDepositedAdapter())
  adapterProvider.registerAdapter(FundsWithdrawn, new FundsWithdrawnAdapter())
  adapterProvider.registerAdapter(FundsRefunded, new FundsRefundedAdapter())
  console.log('✅ Registered custom entry adapters for schema evolution\n')
}

/**
 * Create and initialize supervision hierarchy for domain actors.
 */
function setupSupervisors(): void {
  const bankSupervisorProtocol: Protocol = {
    type: () => 'bank-supervisor',
    instantiator: () => ({ instantiate: () => new BankSupervisor() })
  }

  const accountSupervisorProtocol: Protocol = {
    type: () => 'account-supervisor',
    instantiator: () => ({ instantiate: () => new AccountSupervisor() })
  }

  const transferSupervisorProtocol: Protocol = {
    type: () => 'transfer-supervisor',
    instantiator: () => ({ instantiate: () => new TransferSupervisor() })
  }

  // Create supervisor actors (use default supervisor for supervisors themselves)
  stage().actorFor(bankSupervisorProtocol, undefined, 'default')
  stage().actorFor(accountSupervisorProtocol, undefined, 'default')
  stage().actorFor(transferSupervisorProtocol, undefined, 'default')
}

// =============================================================================
// CQRS PIPELINE SETUP FUNCTIONS
// =============================================================================

/**
 * Create the projection dispatcher with confirmer.
 * The dispatcher routes projectables to matching projections.
 */
function createProjectionDispatcher(): ProjectionDispatcher {
  const confirmer = new TestConfirmer()
  const dispatcherProtocol: Protocol = {
    type: () => 'TextProjectionDispatcher',
    instantiator: () => ({
      instantiate: (def: Definition) => {
        const [conf] = def.parameters()
        return new TextProjectionDispatcherActor(conf)
      }
    })
  }

  const dispatcher = stage().actorFor<ProjectionDispatcher>(
    dispatcherProtocol,
    undefined,
    'projection-supervisor',
    undefined,
    confirmer
  )

  console.log('✅ Created projection dispatcher')
  return dispatcher
}

/**
 * Create all projection actors for the read side.
 * Returns projections for registration with the dispatcher.
 */
function createProjections(): {
  accountSummary: Projection
  transactionHistory: Projection
  bankStatistics: Projection
} {
  const accountSummaryProtocol: Protocol = {
    type: () => 'AccountSummaryProjection',
    instantiator: () => ({ instantiate: () => new AccountSummaryProjectionActor() })
  }

  const transactionHistoryProtocol: Protocol = {
    type: () => 'TransactionHistoryProjection',
    instantiator: () => ({ instantiate: () => new TransactionHistoryProjectionActor() })
  }

  const bankStatisticsProtocol: Protocol = {
    type: () => 'BankStatisticsProjection',
    instantiator: () => ({ instantiate: () => new BankStatisticsProjectionActor() })
  }

  const accountSummary = stage().actorFor<Projection>(
    accountSummaryProtocol,
    undefined,
    'projection-supervisor'
  )

  const transactionHistory = stage().actorFor<Projection>(
    transactionHistoryProtocol,
    undefined,
    'projection-supervisor'
  )

  const bankStatistics = stage().actorFor<Projection>(
    bankStatisticsProtocol,
    undefined,
    'projection-supervisor'
  )

  console.log('✅ Created projections (AccountSummary, TransactionHistory, BankStatistics)')

  return { accountSummary, transactionHistory, bankStatistics }
}

/**
 * Register projections with the dispatcher using pattern matching.
 * All projections listen to the same account events.
 */
function registerProjections(
  dispatcher: ProjectionDispatcher,
  projections: {
    accountSummary: Projection
    transactionHistory: Projection
    bankStatistics: Projection
  }
): void {
  const accountEventPatterns = [
    'AccountOpened',
    'FundsDeposited',
    'FundsWithdrawn',
    'FundsRefunded'
  ]

  dispatcher.register(new ProjectToDescription(
    projections.accountSummary,
    accountEventPatterns,
    'Account summary view projection'
  ))

  dispatcher.register(new ProjectToDescription(
    projections.transactionHistory,
    accountEventPatterns,
    'Transaction history projection'
  ))

  dispatcher.register(new ProjectToDescription(
    projections.bankStatistics,
    accountEventPatterns,
    'Bank statistics projection'
  ))

  console.log('✅ Registered projections with dispatcher')
}

/**
 * Setup the complete CQRS pipeline: Journal → Consumer → Dispatcher → Projections → DocumentStore
 */
async function setupCQRSPipeline(journal: Journal<string>): Promise<JournalConsumer> {
  // Create projection supervisor
  const projectionSupervisorProtocol: Protocol = {
    type: () => 'projection-supervisor',
    instantiator: () => ({ instantiate: () => new ProjectionSupervisor() })
  }
  stage().actorFor(projectionSupervisorProtocol, undefined, 'default')
  console.log('✅ Created projection supervisor')

  // Create dispatcher
  const dispatcher = createProjectionDispatcher()

  // Create projections
  const projections = createProjections()

  // Register projections with dispatcher
  registerProjections(dispatcher, projections)

  // Create journal consumer to bridge write side → read side
  const reader = await journal.journalReader('bank-projection-reader')

  const consumerProtocol: Protocol = {
    type: () => 'JournalConsumer',
    instantiator: () => ({
      instantiate: (def: Definition) => {
        const [rdr, disp, interval, batchSize] = def.parameters()
        return new JournalConsumerActor(rdr, disp, interval, batchSize)
      }
    })
  }

  const consumer = stage().actorFor<JournalConsumer>(
    consumerProtocol,
    undefined,
    'projection-supervisor',
    undefined,
    reader,
    dispatcher,
    100,  // Poll every 100ms
    10    // Batch size 10
  )

  console.log('✅ Created journal consumer (polls every 100ms)')
  console.log('✅ CQRS pipeline complete: Journal → Consumer → Dispatcher → Projections → DocumentStore\n')

  return consumer
}

// =============================================================================
// COMMAND MODEL SETUP FUNCTIONS
// =============================================================================

/**
 * Create the command model actors (Bank and Teller).
 * Sets the global teller variable for menu operations.
 */
function setupCommandModelActors(): void {
  // Create Bank actor (EventSourcedEntity)
  const bankProtocol: Protocol = {
    type: () => 'Bank',
    instantiator: () => ({ instantiate: () => new BankActor() })
  }

  const bank = stage().actorFor<Bank>(bankProtocol, undefined, 'bank-supervisor')

  // Create Teller actor as a child that uses the bank
  const tellerProtocol: Protocol = {
    type: () => 'Teller',
    instantiator: () => ({
      instantiate: (definition: Definition) => {
        const params = definition.parameters()
        return new TellerActor(params[0])
      }
    })
  }

  teller = stage().actorFor<Teller>(tellerProtocol, undefined, 'bank-supervisor', undefined, bank)

  console.log('✅ Bank system initialized\n')
}

/**
 * Print information about the example's features.
 */
function printExampleFeatures(): void {
  console.log('This example demonstrates:')
  console.log('  • Event Sourcing with EventSourcedEntity')
  console.log('  • Shared InMemoryJournal for all event-sourced entities')
  console.log('  • Domain events: AccountOpened, FundsDeposited, FundsWithdrawn, etc.')
  console.log('  • StoreTypeMapper for symbolic storage names')
  console.log('  • Parent-child actor hierarchies')
  console.log('  • Self-messaging for state changes')
  console.log('  • Realistic multi-step transfers with retry logic')
  console.log('  • "Let it crash" supervision with error reporting')
  console.log('  • Message-driven architecture\n')
}

// =============================================================================
// MAIN LOOP AND CLEANUP FUNCTIONS
// =============================================================================

/**
 * Run the interactive menu loop.
 * Handles user input and routes to appropriate operations.
 */
async function runInteractiveLoop(): Promise<void> {
  let running = true

  while (running) {
    await showMenu()
    const choice = await prompt('Enter choice (1-9 or 0): ')

    try {
      switch (choice.trim()) {
        case '1':
          await openAccount()
          break
        case '2':
          await deposit()
          break
        case '3':
          await withdraw()
          break
        case '4':
          await transfer()
          break
        case '5':
          await accountSummary()
          break
        case '6':
          await transactionHistory()
          break
        case '7':
          await allAccounts()
          break
        case '8':
          await pendingTransfers()
          break
        case '9':
          await bankStatistics()
          break
        case '0':
          console.log('\n👋 Shutting down...')
          running = false
          break
        default:
          console.log('❌ Invalid choice. Please enter 1-9 or 0 to exit.')
      }
    } catch (error) {
      // Errors are already handled by supervision and printed
      // This catch is just to prevent the CLI from crashing
    }

    // Small delay to allow async messages to process
    if (running) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

/**
 * Cleanup resources and shutdown the system gracefully.
 */
async function cleanup(infra: BankInfrastructure): Promise<void> {
  rl.close()
  console.log('\nClosed stopping journal consumer...')
  await infra.consumer.pause()
  console.log('Closing stage and stopping all actors...')
  stage().deregisterValue('domo-tactical:bank.journal')
  stage().deregisterValue('domo-tactical:bank.documentStore')
  await stage().close()
  console.log('✅ Bank system stopped\n')
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Main entry point - orchestrates the bank example application.
 */
async function main(): Promise<void> {
  // 1. Setup infrastructure
  const { journal, documentStore } = setupPersistenceInfrastructure()
  registerTypeMappings()
  registerEntryAdapters()

  // 2. Setup actor supervision hierarchy
  setupSupervisors()

  // 3. Setup CQRS pipeline (read side)
  const consumer = await setupCQRSPipeline(journal)

  // 4. Setup command model actors (write side)
  setupCommandModelActors()
  printExampleFeatures()

  // 5. Run interactive loop
  await runInteractiveLoop()

  // 6. Cleanup
  await cleanup({ journal, documentStore, consumer })

  process.exit(0)
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Received interrupt signal')
  rl.close()
  console.log('Closing stage and stopping all actors...')
  stage().deregisterValue('domo-tactical:bank.journal')
  stage().deregisterValue('domo-tactical:bank.documentStore')
  await stage().close()
  console.log('✅ Bank system stopped\n')
  process.exit(0)
})

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
