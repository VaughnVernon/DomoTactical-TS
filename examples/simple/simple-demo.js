// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5
/**
 * Simple demonstration of event sourcing without the actor runtime.
 * This shows the core DomoTactical concepts without requiring domo-actors to run.
 */
import { InMemoryJournal } from '../../src/store/journal/index.js';
import { AccountOpened, MoneyDeposited, MoneyWithdrawn } from './events.js';
import { Metadata } from '../../src/store/index.js';
async function main() {
    console.log('=== DomoTactical Event Sourcing Simple Demo ===\n');
    // Create an in-memory journal
    const journal = new InMemoryJournal();
    const accountId = 'ACC-12345';
    console.log('1. Opening account with initial balance of $1000...');
    const openEvent = new AccountOpened(accountId, 'Alice Smith', 1000);
    await journal.append(accountId, 1, openEvent, Metadata.nullMetadata());
    console.log(`   Event: ${openEvent.constructor.name}`);
    console.log(`   Data: ${JSON.stringify({ accountId, owner: 'Alice Smith', initialBalance: 1000 })}\n`);
    console.log('2. Depositing $500...');
    const deposit1 = new MoneyDeposited(accountId, 500);
    await journal.append(accountId, 2, deposit1, Metadata.nullMetadata());
    console.log(`   Event: ${deposit1.constructor.name}`);
    console.log(`   Data: ${JSON.stringify({ accountId, amount: 500 })}\n`);
    console.log('3. Withdrawing $200...');
    const withdraw1 = new MoneyWithdrawn(accountId, 200);
    await journal.append(accountId, 3, withdraw1, Metadata.nullMetadata());
    console.log(`   Event: ${withdraw1.constructor.name}`);
    console.log(`   Data: ${JSON.stringify({ accountId, amount: 200 })}\n`);
    console.log('4. Depositing $1000...');
    const deposit2 = new MoneyDeposited(accountId, 1000);
    await journal.append(accountId, 4, deposit2, Metadata.nullMetadata());
    console.log(`   Event: ${deposit2.constructor.name}`);
    console.log(`   Data: ${JSON.stringify({ accountId, amount: 1000 })}\n`);
    console.log('5. Withdrawing $300...');
    const withdraw2 = new MoneyWithdrawn(accountId, 300);
    await journal.append(accountId, 5, withdraw2, Metadata.nullMetadata());
    console.log(`   Event: ${withdraw2.constructor.name}`);
    console.log(`   Data: ${JSON.stringify({ accountId, amount: 300 })}\n`);
    // Calculate final balance by replaying events
    console.log('=== Replaying Events to Calculate State ===');
    const reader = await journal.streamReader('bank-reader');
    const stream = await reader.streamFor(accountId);
    console.log(`Stream: ${stream.streamName}`);
    console.log(`Version: ${stream.streamVersion}`);
    console.log(`Number of events: ${stream.size()}\n`);
    let balance = 0;
    let owner = '';
    console.log('Event Replay:');
    stream.entries.forEach((entry, index) => {
        const eventData = JSON.parse(entry.entryData);
        console.log(`  ${index + 1}. ${entry.type}`);
        if (entry.type === 'AccountOpened') {
            owner = eventData.owner;
            balance = eventData.initialBalance;
            console.log(`     → Account opened for ${owner} with balance $${balance}`);
        }
        else if (entry.type === 'MoneyDeposited') {
            balance += eventData.amount;
            console.log(`     → Deposited $${eventData.amount}, new balance: $${balance}`);
        }
        else if (entry.type === 'MoneyWithdrawn') {
            balance -= eventData.amount;
            console.log(`     → Withdrew $${eventData.amount}, new balance: $${balance}`);
        }
    });
    console.log('\n=== Final State ===');
    console.log(`Account ID: ${accountId}`);
    console.log(`Owner: ${owner}`);
    console.log(`Final Balance: $${balance}`);
    console.log('\n=== Demo Complete ===');
    console.log('\nKey Concepts Demonstrated:');
    console.log('  • Event sourcing - all state changes captured as events');
    console.log('  • Journal storage - events persisted in streams');
    console.log('  • Event replay - current state derived from event history');
    console.log('  • Audit trail - complete history of all operations');
}
// Run the demo
main().catch(error => {
    console.error('Error running demo:', error);
    process.exit(1);
});
