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
import { FundsRefunded } from '../../model/AccountEvents'

/**
 * Custom adapter for FundsRefunded event.
 * Currently at v1 (no schema evolution yet).
 */
export class FundsRefundedAdapter extends DefaultTextEntryAdapter<FundsRefunded> {
  constructor() {
    super()
  }

  protected override upcastIfNeeded(
    data: any,
    type: string,
    version: number
  ): FundsRefunded {
    // v1 is current
    if (version === 1) {
      return new FundsRefunded(
        data.accountNumber,
        data.amount,
        data.originalTransactionId,
        data.reason,
        new Date(data.refundedAt)
      )
    }

    throw new Error(`Unsupported FundsRefunded version: ${version}`)
  }

  override toEntry(
    source: FundsRefunded,
    version: number,
    id: string,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      accountNumber: source.accountNumber,
      amount: source.amount,
      originalTransactionId: source.originalTransactionId,
      reason: source.reason,
      refundedAt: source.refundedAt.toISOString()
    })

    return new TextEntry(
      id,
      'FundsRefunded',
      1, // Current version is 1
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
