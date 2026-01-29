// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { DefaultTextEntryAdapter } from 'domo-tactical/store'
import { TextEntry } from 'domo-tactical/store/journal'
import { Metadata } from 'domo-tactical/store'
import { AccountOpened } from '../../model/AccountEvents'
import { AccountType } from '../../model/BankTypes'

/**
 * Custom adapter for AccountOpened event with schema evolution.
 * Handles upcasting from v1 → v3 and v2 → v3.
 *
 * **Schema Evolution History**:
 * - **v1**: Only had `accountNumber` and `owner`
 * - **v2**: Added `initialBalance` field
 * - **v3**: Added `accountType` field (checking/savings) - CURRENT
 *
 * This adapter demonstrates how to handle long-lived event streams
 * where the schema has evolved over time. Old events from v1 or v2
 * are automatically upcasted to v3 when read from the journal.
 *
 * @example
 * ```typescript
 * // Register the adapter
 * const provider = EntryAdapterProvider.instance()
 * provider.registerAdapter(AccountOpened, new AccountOpenedAdapter())
 *
 * // Reading old v1 event from journal automatically upcasts it
 * const event = provider.asSource(oldV1Entry)
 * // Returns AccountOpened with initialBalance=0 and accountType='checking'
 * ```
 */
export class AccountOpenedAdapter extends DefaultTextEntryAdapter<AccountOpened> {
  constructor() {
    super()
  }

  /**
   * Override to handle schema evolution/upcasting.
   *
   * This method is called when reading an AccountOpened entry from the journal.
   * If the entry is an old version (v1 or v2), it's upcasted to v3.
   *
   * @param data the deserialized data from JSON
   * @param type the event type name ("AccountOpened")
   * @param version the schema version from the Entry
   * @returns AccountOpened the upcasted event instance
   */
  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): AccountOpened {
    // v3 is current - no upcasting needed
    if (version === 3) {
      return new AccountOpened(
        data.accountNumber,
        data.owner,
        data.accountType,
        data.initialBalance,
        new Date(data.openedAt)
      )
    }

    // Upcast v1 → v3
    // v1 only had accountNumber and owner
    if (version === 1) {
      return new AccountOpened(
        data.accountNumber,
        data.owner,
        'checking' as AccountType, // v1 didn't have accountType, default to checking
        0, // v1 didn't have initialBalance, default to 0
        new Date(data.openedAt || Date.now())
      )
    }

    // Upcast v2 → v3
    // v2 added initialBalance but didn't have accountType
    if (version === 2) {
      return new AccountOpened(
        data.accountNumber,
        data.owner,
        'checking' as AccountType, // v2 didn't have accountType, default to checking
        data.initialBalance,
        new Date(data.openedAt || Date.now())
      )
    }

    throw new Error(`Unsupported AccountOpened version: ${version}`)
  }

  /**
   * Serialize AccountOpened to Entry with current version (v3).
   *
   * @param source the AccountOpened event
   * @param version the stream version
   * @param id the entry id
   * @param metadata optional metadata
   * @returns TextEntry the serialized entry
   */
  override toEntry(
    source: AccountOpened,
    version: number,
    id: string,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      accountNumber: source.accountNumber,
      owner: source.owner,
      accountType: source.accountType,
      initialBalance: source.initialBalance,
      openedAt: source.openedAt.toISOString()
    })

    return new TextEntry(
      id,
      'AccountOpened',
      3, // Current version is 3
      serialized,
      version,
      JSON.stringify({
        value: metadata.value,
        operation: metadata.operation,
        properties: Object.fromEntries(metadata.properties)
      })
    )
  }
}
