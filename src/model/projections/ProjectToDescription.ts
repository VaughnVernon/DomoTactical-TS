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

import { Projection } from './Projection.js'

/**
 * Describes why a Projection should receive a Projectable.
 *
 * ProjectToDescription associates a Projection with matching criteria (becauseOf patterns)
 * that determine which Projectables it should process.
 *
 * The matching criteria support:
 * - Exact matching: 'AccountOpened' matches only 'AccountOpened'
 * - Prefix wildcard: 'Account*' matches 'AccountOpened', 'AccountClosed', etc.
 * - Suffix wildcard: '*Event' matches 'AccountEvent', 'TransferEvent', etc.
 * - Namespace wildcard: 'name.space.*' matches 'name.space.EventA', 'name.space.EventB'
 * - Multiple criteria: ['Account*', 'Transfer*'] matches events from both aggregates
 *
 * This enables flexible event routing in CQRS projections:
 * - One projection can handle multiple related events
 * - Multiple projections can handle the same event
 * - Pattern-based routing reduces coupling to specific event types
 *
 * @example
 * ```typescript
 * // Exact match
 * const description = new ProjectToDescription(
 *   accountSummaryProjection,
 *   ['AccountOpened'],
 *   'Account summary view projection'
 * )
 *
 * // Wildcard match
 * const description = new ProjectToDescription(
 *   auditProjection,
 *   ['Account*', 'Transfer*'],
 *   'Audit log projection for all account and transfer events'
 * )
 *
 * // Namespace wildcard
 * const description = new ProjectToDescription(
 *   namespaceProjection,
 *   ['com.example.events.*'],
 *   'All events in com.example.events namespace'
 * )
 * ```
 */
export class ProjectToDescription {
  /**
   * Construct a ProjectToDescription.
   *
   * @param projection the Projection that will receive matching Projectables
   * @param becauseOf array of event type patterns (exact or wildcard)
   * @param description human-readable description of this projection's purpose
   *
   * @example
   * ```typescript
   * const description = new ProjectToDescription(
   *   new AccountSummaryProjection(documentStore),
   *   ['AccountOpened', 'FundsDeposited', 'FundsWithdrawn'],
   *   'Maintains current account balance and transaction count'
   * )
   * ```
   */
  constructor(
    public readonly projection: Projection,
    public readonly becauseOf: string[],
    public readonly description: string
  ) {
    if (!projection) {
      throw new Error('Projection must not be null')
    }
    if (!becauseOf || becauseOf.length === 0) {
      throw new Error('BecauseOf patterns must not be empty')
    }
    if (!description) {
      throw new Error('Description must not be empty')
    }
  }

  /**
   * Answer whether this description matches any of the given reasons.
   *
   * Supports:
   * - Exact matching: 'AccountOpened' === 'AccountOpened'
   * - Prefix wildcard: 'Account*' matches 'AccountOpened', 'AccountClosed', etc.
   * - Suffix wildcard: '*Event' matches 'AccountEvent', 'TransferEvent', etc.
   * - Namespace wildcard: 'com.example.*' matches 'com.example.EventA', 'com.example.EventB'
   *
   * @param reasons the reasons from a Projectable (typically event types)
   * @returns boolean true if any pattern matches any reason
   *
   * @example
   * ```typescript
   * const desc = new ProjectToDescription(
   *   projection,
   *   ['Account*', 'Transfer.Completed'],
   *   'Multi-pattern projection'
   * )
   *
   * desc.matches(['AccountOpened'])        // true (prefix wildcard)
   * desc.matches(['Transfer.Completed'])   // true (exact match)
   * desc.matches(['Transfer.Started'])     // false (no match)
   * desc.matches(['AccountClosed', 'Transfer.Completed']) // true (multiple reasons, one matches)
   * ```
   */
  matches(reasons: string[]): boolean {
    if (!reasons || reasons.length === 0) {
      return false
    }

    // Check if any pattern matches any reason
    for (const pattern of this.becauseOf) {
      for (const reason of reasons) {
        if (this.matchesPattern(pattern, reason)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if a single pattern matches a single reason.
   *
   * Matching rules:
   * - Exact: pattern === reason (e.g., 'AccountOpened' === 'AccountOpened')
   * - Prefix wildcard: 'Account*' matches 'AccountOpened', 'AccountClosed', etc.
   * - Suffix wildcard: '*Event' matches 'AccountEvent', 'TransferEvent', etc.
   * - Full wildcard: '*' matches everything
   * - Namespace wildcard: 'name.space.*' matches 'name.space.EventA', 'name.space.EventB'
   *
   * The '.' represents namespace/package separators (like Java packages or C# namespaces).
   *
   * @param pattern the pattern to match (may contain wildcards)
   * @param reason the specific reason to check
   * @returns boolean true if pattern matches reason
   */
  private matchesPattern(pattern: string, reason: string): boolean {
    // Exact match
    if (pattern === reason) {
      return true
    }

    // Full wildcard
    if (pattern === '*') {
      return true
    }

    // Prefix wildcard: 'Account*' matches 'AccountOpened', 'AccountClosed', etc.
    if (pattern.endsWith('*') && !pattern.startsWith('*')) {
      const prefix = pattern.substring(0, pattern.length - 1)
      return reason.startsWith(prefix)
    }

    // Suffix wildcard: '*Event' matches 'AccountEvent', 'TransferEvent', etc.
    if (pattern.startsWith('*') && !pattern.endsWith('*')) {
      const suffix = pattern.substring(1)
      return reason.endsWith(suffix)
    }

    // Contains wildcard: '*Account*' matches anything containing 'Account'
    if (pattern.startsWith('*') && pattern.endsWith('*') && pattern.length > 2) {
      const substring = pattern.substring(1, pattern.length - 1)
      return reason.includes(substring)
    }

    return false
  }

  /**
   * Answer a string representation of this description.
   *
   * @returns string human-readable representation
   */
  toString(): string {
    return `ProjectToDescription[projection=${this.projection.constructor.name} becauseOf=[${this.becauseOf.join(', ')}] description="${this.description}"]`
  }
}
