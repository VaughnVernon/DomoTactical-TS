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

import { Projectable } from './Projectable.js'

/**
 * Tracks and confirms projected entries.
 *
 * The Confirmer maintains state about which Projectables have been successfully
 * projected, enabling:
 * - At-least-once projection semantics
 * - Retry of failed projections
 * - Position tracking for projection readers
 * - Detection of unconfirmed (potentially failed) projections
 *
 * Implementations may use:
 * - In-memory tracking (TestConfirmer from testkit) - simple, fast, but volatile
 * - Persistent storage - durable, survives restarts
 * - Distributed coordination - for multi-node deployments
 *
 * @example
 * ```typescript
 * import { TestConfirmer } from 'domo-tactical/testkit'
 *
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
export interface Confirmer {
  /**
   * Confirm projection of a projectable.
   *
   * Marks the projectable as successfully projected. This typically removes
   * it from the pending set and may advance a projection position pointer.
   *
   * @param projectable the projectable that was projected
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // After updating query model
   * await this.documentStore.write(id, 'View', data, version)
   * await confirmer.confirm(projectable)
   * ```
   */
  confirm(projectable: Projectable): Promise<void>

  /**
   * Check for unconfirmed projectables that may need retry.
   *
   * Returns projectables that were marked as pending but never confirmed.
   * This enables retry logic for failed projections.
   *
   * The timeout threshold for considering a projectable "unconfirmed" is
   * implementation-specific.
   *
   * @returns Promise<Projectable[]> unconfirmed projectables
   *
   * @example
   * ```typescript
   * // Periodic retry check
   * const unconfirmed = await confirmer.checkUnconfirmed()
   * for (const projectable of unconfirmed) {
   *   await this.retryProjection(projectable)
   * }
   * ```
   */
  checkUnconfirmed(): Promise<Projectable[]>

  /**
   * Mark a projectable as pending projection.
   *
   * Called before dispatching to projections. Enables tracking
   * of unconfirmed projectables for retry.
   *
   * @param projectable the projectable being dispatched
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // Before dispatching
   * await confirmer.pending(projectable)
   * await projection.projectWith(projectable, control)
   * ```
   */
  pending(projectable: Projectable): Promise<void>
}
