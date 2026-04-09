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
    typeVersion: number
  ): FundsRefunded {
    // v1 is current
    if (typeVersion === 1) {
      return new FundsRefunded(
        data.accountNumber,
        data.amount,
        data.originalTransactionId,
        data.reason,
        new Date(data.refundedAt)
      )
    }

    throw new Error(`Unsupported FundsRefunded typeVersion: ${typeVersion}`)
  }

  override toEntry(
    source: FundsRefunded,
    streamVersion: number,
    metadata: Metadata = Metadata.nullMetadata()
  ): TextEntry {
    const serialized = JSON.stringify({
      accountNumber: source.accountNumber,
      amount: source.amount,
      originalTransactionId: source.originalTransactionId,
      reason: source.reason,
      refundedAt: source.refundedAt.toISOString()
    })

    // Use 6-arg constructor - Journal assigns globalPosition
    return new TextEntry(
      source.id(),
      'FundsRefunded',
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
