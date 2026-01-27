// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import {
  DefaultSupervisor,
  Supervisor,
  SupervisionDirective,
  SupervisionStrategy,
  Supervised
} from 'domo-actors'

/**
 * Extended Supervisor interface for testing that exposes error tracking.
 * Use this interface when you need to wait for supervision to complete in tests.
 */
export interface TestSupervisor extends Supervisor {
  /**
   * Answer the number of errors that have been handled by this supervisor.
   */
  errorRecoveryCount(): Promise<number>

  /**
   * Answer the message of the last error handled, or null if none.
   */
  lastError(): Promise<string | null>

  /**
   * Reset the error tracking state.
   */
  reset(): Promise<void>
}

/**
 * Supervisor for testing that tracks error recovery.
 *
 * Since DefaultSupervisor extends Actor, this supervisor must be created via
 * stage().actorFor(). The supervisor's protocol type() must match the supervisor
 * name used when creating other actors, because Environment.supervisor() looks up
 * supervisors by type in the directory.
 *
 * @example
 * ```typescript
 * const SUPERVISOR_NAME = 'test-supervisor'
 *
 * // Create supervisor - type() must match the supervisor name
 * const supervisorProtocol: Protocol = {
 *   type: () => SUPERVISOR_NAME,  // <-- Important: matches supervisor name below
 *   instantiator: () => ({ instantiate: () => new TestJournalSupervisor() })
 * }
 * const supervisor = stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default')
 *
 * // Create journal under this supervisor - uses the same name
 * const journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME)
 *
 * // After an error, wait for supervision to complete
 * async function waitForErrorRecovery(supervisor: TestSupervisor, expectedCount: number) {
 *   while (await supervisor.errorRecoveryCount() < expectedCount) {
 *     await new Promise(resolve => setTimeout(resolve, 10))
 *   }
 * }
 * ```
 */
export class TestJournalSupervisor extends DefaultSupervisor implements TestSupervisor {
  private _errorRecoveryCount = 0
  private _lastError: string | null = null

  constructor() {
    super()
  }

  /**
   * Answer the number of errors that have been handled by this supervisor.
   */
  async errorRecoveryCount(): Promise<number> {
    return this._errorRecoveryCount
  }

  /**
   * Answer the message of the last error handled, or null if none.
   */
  async lastError(): Promise<string | null> {
    return this._lastError
  }

  /**
   * Reset the error tracking state.
   */
  async reset(): Promise<void> {
    this._errorRecoveryCount = 0
    this._lastError = null
  }

  async inform(error: Error, supervised: Supervised): Promise<void> {
    // Track the error recovery
    this._errorRecoveryCount++
    this._lastError = error.message

    // Log for debugging
    this.logger().log(`TestJournalSupervisor: Error #${this._errorRecoveryCount} in ${supervised.actor().type()}: ${error.message}`)

    // Call parent to apply the directive
    await super.inform(error, supervised)
  }

  protected decideDirective(
    _error: Error,
    _supervised: Supervised,
    _strategy: SupervisionStrategy
  ): SupervisionDirective {
    // Always Resume - these are expected validation errors in tests
    return SupervisionDirective.Resume
  }
}
