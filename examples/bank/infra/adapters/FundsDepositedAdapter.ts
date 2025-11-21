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
import { FundsDeposited } from '../../model/AccountEvents'

/**
 * Custom adapter for FundsDeposited event with schema evolution.
 * Handles upcasting from v1 → v2.
 *
 * **Schema Evolution History**:
 * - **v1**: Only had `accountNumber` and `amount`
 * - **v2**: Added `transactionId` and `depositedAt` fields - CURRENT
 *
 * This adapter demonstrates a simpler evolution case where only
 * one schema upgrade is needed (v1 → v2).
 *
 * @example
 * ```typescript
 * // Register the adapter
 * const provider = EntryAdapterProvider.getInstance()
 * provider.registerAdapter(FundsDeposited, new FundsDepositedAdapter())
 *
 * // Reading old v1 event from journal automatically upcasts it
 * const event = provider.asSource(oldV1Entry)
 * // Returns FundsDeposited with generated transactionId and current timestamp
 * ```
 */
export class FundsDepositedAdapter extends DefaultTextEntryAdapter<FundsDeposited> {
  constructor() {
    super()
  }

  /**
   * Override to handle schema evolution/upcasting.
   *
   * This method is called when reading a FundsDeposited entry from the journal.
   * If the entry is v1, it's upcasted to v2.
   *
   * @param data the deserialized data from JSON
   * @param type the event type name ("FundsDeposited")
   * @param version the schema version from the Entry
   * @returns FundsDeposited the upcasted event instance
   */
  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): FundsDeposited {
    // v2 is current - no upcasting needed
    if (version === 2) {
      return new FundsDeposited(
        data.accountNumber,
        data.amount,
        data.transactionId,
        new Date(data.depositedAt)
      )
    }

    // Upcast v1 → v2
    // v1 only had accountNumber and amount
    if (version === 1) {
      // Generate a transaction ID for old events that don't have one
      const transactionId = `migrated-dep-${data.accountNumber}-${Date.now()}`

      return new FundsDeposited(
        data.accountNumber,
        data.amount,
        transactionId, // v1 didn't have transactionId, generate one
        new Date() // v1 didn't track depositedAt, use current time
      )
    }

    throw new Error(`Unsupported FundsDeposited version: ${version}`)
  }

  /**
   * Serialize FundsDeposited to Entry with current version (v2).
   *
   * @param source the FundsDeposited event
   * @param version the stream version
   * @param id the entry id
   * @param metadata optional metadata
   * @returns TextEntry the serialized entry
   */
  override toEntry(
    source: FundsDeposited,
    version: number,
    id: string,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      accountNumber: source.accountNumber,
      amount: source.amount,
      transactionId: source.transactionId,
      depositedAt: source.depositedAt.toISOString()
    })

    return new TextEntry(
      id,
      'FundsDeposited',
      2, // Current version is 2
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
