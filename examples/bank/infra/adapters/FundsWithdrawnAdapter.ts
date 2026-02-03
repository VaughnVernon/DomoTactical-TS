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
import { FundsWithdrawn } from '../../model/AccountEvents'

/**
 * Custom adapter for FundsWithdrawn event.
 * Currently at v1 (no schema evolution yet).
 */
export class FundsWithdrawnAdapter extends DefaultTextEntryAdapter<FundsWithdrawn> {
  constructor() {
    super()
  }

  protected override upcastIfNeeded(
    data: any,
    type: string,
    typeVersion: number
  ): FundsWithdrawn {
    // v1 is current
    if (typeVersion === 1) {
      return new FundsWithdrawn(
        data.accountNumber,
        data.amount,
        data.transactionId,
        new Date(data.withdrawnAt)
      )
    }

    throw new Error(`Unsupported FundsWithdrawn typeVersion: ${typeVersion}`)
  }

  override toEntry(
    source: FundsWithdrawn,
    streamVersion: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      accountNumber: source.accountNumber,
      amount: source.amount,
      transactionId: source.transactionId,
      withdrawnAt: source.withdrawnAt.toISOString()
    })

    // Use 6-arg constructor - Journal assigns globalPosition
    return new TextEntry(
      source.id(),
      'FundsWithdrawn',
      1, // Current typeVersion is 1
      serialized,
      streamVersion,
      JSON.stringify({
        value: metadata.value,
        operation: metadata.operation,
        properties: Object.fromEntries(metadata.properties)
      })
    )
  }
}
