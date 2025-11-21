// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Entry representing a journal event or command.
 *
 * An Entry is the persisted representation of a Source (event or command).
 * The Source is serialized into the Entry's entryData field.
 *
 * @template T the type of entry data (typically string for JSON)
 */
export interface Entry<T> {
  /** Unique identifier for this entry */
  id: string

  /** Type name of the entry (e.g., "AccountOpened", "FundsDeposited") */
  type: string

  /** Version of the type for schema evolution */
  typeVersion: number

  /** The data payload (serialized Source) */
  entryData: T

  /** Associated metadata (as JSON string) */
  metadata: string
}
