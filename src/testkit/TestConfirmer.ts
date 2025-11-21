// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Confirmer, Projectable } from '../model/projections'

/**
 * Simple in-memory confirmer for testing and development.
 *
 * Tracks confirmations in memory using Sets and Maps. Suitable for:
 * - Unit and integration testing
 * - Development and prototyping
 * - Examples and demonstrations
 *
 * NOT suitable for production:
 * - State is lost on restart
 * - No distributed coordination
 * - Memory usage grows with unique projectable IDs
 *
 * For production systems, implement a persistent Confirmer
 * using a database or distributed cache.
 *
 * @example
 * ```typescript
 * const confirmer = new TestConfirmer()
 *
 * // Mark projectable as pending
 * await confirmer.pending(projectable)
 *
 * // After successful projection
 * await confirmer.confirm(projectable)
 *
 * // Check for failures
 * const unconfirmed = await confirmer.checkUnconfirmed()
 * if (unconfirmed.length > 0) {
 *   // Retry unconfirmed projectables
 * }
 * ```
 */
export class TestConfirmer implements Confirmer {
  /** Projectables that have been confirmed */
  private readonly confirmed = new Set<string>()

  /** Projectables pending confirmation with timestamp */
  private readonly pendingMap = new Map<string, { projectable: Projectable; timestamp: number }>()

  /** Timeout in milliseconds before considering a projectable unconfirmed (default: 30 seconds) */
  private readonly unconfirmedThreshold: number

  /**
   * Construct a TestConfirmer.
   *
   * @param unconfirmedThresholdMs timeout before considering pending as unconfirmed (default: 30000ms)
   */
  constructor(unconfirmedThresholdMs: number = 30000) {
    this.unconfirmedThreshold = unconfirmedThresholdMs
  }

  /**
   * Confirm projection of a projectable.
   */
  async confirm(projectable: Projectable): Promise<void> {
    const id = this.projectableId(projectable)

    // Add to confirmed set
    this.confirmed.add(id)

    // Remove from pending
    this.pendingMap.delete(id)
  }

  /**
   * Check for unconfirmed projectables.
   *
   * Returns projectables that have been pending longer than the threshold.
   */
  async checkUnconfirmed(): Promise<Projectable[]> {
    const now = Date.now()
    const unconfirmed: Projectable[] = []

    for (const [id, entry] of this.pendingMap.entries()) {
      const elapsed = now - entry.timestamp

      if (elapsed > this.unconfirmedThreshold) {
        unconfirmed.push(entry.projectable)
      }
    }

    return unconfirmed
  }

  /**
   * Mark a projectable as pending.
   */
  async pending(projectable: Projectable): Promise<void> {
    const id = this.projectableId(projectable)

    // Only track if not already confirmed
    if (!this.confirmed.has(id)) {
      this.pendingMap.set(id, {
        projectable,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Answer whether a projectable has been confirmed.
   *
   * @param projectable the projectable to check
   * @returns boolean true if confirmed
   */
  isConfirmed(projectable: Projectable): boolean {
    const id = this.projectableId(projectable)
    return this.confirmed.has(id)
  }

  /**
   * Answer whether a projectable is pending.
   *
   * @param projectable the projectable to check
   * @returns boolean true if pending
   */
  isPending(projectable: Projectable): boolean {
    const id = this.projectableId(projectable)
    return this.pendingMap.has(id)
  }

  /**
   * Answer the count of confirmed projectables.
   *
   * @returns number the count
   */
  confirmedCount(): number {
    return this.confirmed.size
  }

  /**
   * Answer the count of pending projectables.
   *
   * @returns number the count
   */
  pendingCount(): number {
    return this.pendingMap.size
  }

  /**
   * Reset all tracking state.
   * Useful for testing.
   */
  reset(): void {
    this.confirmed.clear()
    this.pendingMap.clear()
  }

  /**
   * Generate a unique ID for a projectable.
   * Uses data ID and version for uniqueness.
   *
   * @param projectable the projectable
   * @returns string the unique ID
   */
  private projectableId(projectable: Projectable): string {
    const dataId = projectable.dataId()
    const dataVersion = projectable.dataVersion()
    const type = projectable.type()

    // Combine multiple identifiers for uniqueness
    return `${type}:${dataId}:${dataVersion}`
  }
}
