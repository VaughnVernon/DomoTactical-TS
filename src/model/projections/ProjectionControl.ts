// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Projectable } from './Projectable'
import { Confirmer } from './Confirmer'

/**
 * Controls projection lifecycle and confirmation.
 *
 * ProjectionControl is provided to Projection.projectWith() to enable:
 * - Confirmation that a Projectable was successfully projected
 * - Error reporting for failed projections
 * - Retry coordination via the Confirmer
 *
 * The control acts as a bridge between the Projection and the confirmation
 * tracking system, enabling reliable projection processing with at-least-once semantics.
 *
 * @example
 * ```typescript
 * class MyProjection implements Projection {
 *   async projectWith(
 *     projectable: Projectable,
 *     control: ProjectionControl
 *   ): Promise<void> {
 *     try {
 *       // Project to query model
 *       await this.updateView(projectable)
 *
 *       // Confirm success
 *       control.confirmProjected(projectable)
 *     } catch (error) {
 *       // Report error for retry
 *       control.error(error as Error)
 *     }
 *   }
 * }
 * ```
 */
export interface ProjectionControl {
  /**
   * Confirm that the projectable was successfully projected.
   *
   * Called by projections after successfully updating the query model.
   * The confirmer will mark this projectable as processed, preventing
   * duplicate processing and enabling position tracking.
   *
   * @param projectable the projectable that was projected
   *
   * @example
   * ```typescript
   * // After successful projection
   * await this.documentStore.write(id, 'View', data, version)
   * control.confirmProjected(projectable)
   * ```
   */
  confirmProjected(projectable: Projectable): void

  /**
   * Indicate projection error for retry/handling.
   *
   * Called by projections when an error occurs during projection.
   * The control can coordinate retry logic, dead letter handling,
   * or other error recovery strategies.
   *
   * @param reason the error that occurred
   *
   * @example
   * ```typescript
   * try {
   *   await this.projectData(projectable)
   * } catch (error) {
   *   control.error(error as Error)
   *   throw error // Or handle gracefully
   * }
   * ```
   */
  error(reason: Error): void
}

/**
 * Basic implementation of ProjectionControl.
 *
 * Coordinates with a Confirmer to track projection confirmation
 * and handle errors.
 *
 * This implementation is suitable for most use cases. For advanced
 * scenarios requiring actor-based control flow, extend this class
 * or implement ProjectionControl directly.
 */
export class BasicProjectionControl implements ProjectionControl {
  private errors: Error[] = []

  /**
   * Construct a BasicProjectionControl.
   *
   * @param confirmer the confirmer for tracking confirmations
   * @param onError optional error handler callback
   */
  constructor(
    private readonly confirmer: Confirmer,
    private readonly onError?: (error: Error, projectable: Projectable) => void
  ) {}

  /**
   * Confirm successful projection.
   */
  confirmProjected(projectable: Projectable): void {
    this.confirmer.confirm(projectable)
  }

  /**
   * Report projection error.
   */
  error(reason: Error): void {
    this.errors.push(reason)

    // Call optional error handler
    if (this.onError) {
      // We don't have the projectable in this context, pass null
      // Subclasses or Actor implementations can provide better context
      this.onError(reason, null as any)
    }
  }

  /**
   * Answer all errors that occurred.
   * Useful for testing and diagnostics.
   *
   * @returns Error[] all recorded errors
   */
  getErrors(): Error[] {
    return [...this.errors]
  }

  /**
   * Answer whether any errors occurred.
   *
   * @returns boolean true if errors were reported
   */
  hasErrors(): boolean {
    return this.errors.length > 0
  }
}
