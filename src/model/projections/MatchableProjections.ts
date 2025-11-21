// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Projection } from './Projection'
import { ProjectToDescription } from './ProjectToDescription'

/**
 * Matches Projectables to Projections using pattern-based criteria.
 *
 * MatchableProjections maintains a registry of ProjectToDescription instances
 * and efficiently matches event types to their corresponding projections.
 *
 * Features:
 * - Exact matching: 'AccountOpened' → projections registered for 'AccountOpened'
 * - Wildcard matching: 'Account.*' → any 'Account...' events
 * - Multiple matches: One event can trigger multiple projections
 * - Efficient lookup: Optimized for common patterns
 *
 * This is the core routing mechanism for CQRS projections, enabling:
 * - Decoupled event producers and projection consumers
 * - Dynamic projection registration (add/remove projections at runtime)
 * - Flexible event routing without hardcoded dependencies
 *
 * @example
 * ```typescript
 * const matchable = new MatchableProjections()
 *
 * // Register projections
 * matchable.register(new ProjectToDescription(
 *   accountSummaryProjection,
 *   ['AccountOpened', 'FundsDeposited'],
 *   'Account summary'
 * ))
 *
 * matchable.register(new ProjectToDescription(
 *   auditProjection,
 *   ['Account.*', 'Transfer.*'],
 *   'Audit log'
 * ))
 *
 * // Match events
 * const projections = matchable.match(['AccountOpened'])
 * // Returns: [accountSummaryProjection, auditProjection]
 * ```
 */
export class MatchableProjections {
  /** All registered projection descriptions */
  private readonly descriptions: ProjectToDescription[] = []

  /** Cache for exact matches (optimization) */
  private readonly exactMatchCache = new Map<string, Projection[]>()

  /**
   * Register a projection with matching criteria.
   *
   * The projection will receive Projectables whose becauseOf reasons
   * match any of the patterns in the description.
   *
   * @param description the ProjectToDescription defining matching criteria
   *
   * @example
   * ```typescript
   * matchable.register(new ProjectToDescription(
   *   new AccountSummaryProjection(store),
   *   ['AccountOpened', 'FundsDeposited', 'FundsWithdrawn'],
   *   'Maintains account summary view'
   * ))
   * ```
   */
  register(description: ProjectToDescription): void {
    if (!description) {
      throw new Error('ProjectToDescription must not be null')
    }

    this.descriptions.push(description)

    // Clear cache when registry changes
    this.exactMatchCache.clear()
  }

  /**
   * Find all projections matching the given reasons.
   *
   * Returns all projections whose patterns match any of the provided reasons.
   * A projection may be returned multiple times if multiple reasons match,
   * but this implementation deduplicates the results.
   *
   * @param becauseOf the reasons from a Projectable (typically event types)
   * @returns Projection[] array of matching projections (may be empty, never null)
   *
   * @example
   * ```typescript
   * // Single reason
   * const projections = matchable.match(['AccountOpened'])
   *
   * // Multiple reasons (e.g., from batch of events)
   * const projections = matchable.match(['AccountOpened', 'FundsDeposited'])
   * ```
   */
  match(becauseOf: string[]): Projection[] {
    if (!becauseOf || becauseOf.length === 0) {
      return []
    }

    // Try cache for single exact reason
    if (becauseOf.length === 1) {
      const cached = this.exactMatchCache.get(becauseOf[0])
      if (cached !== undefined) {
        return cached
      }
    }

    // Find all matching descriptions
    const matchedProjections = new Set<Projection>()

    for (const description of this.descriptions) {
      if (description.matches(becauseOf)) {
        matchedProjections.add(description.projection)
      }
    }

    const result = Array.from(matchedProjections)

    // Cache single exact matches for performance
    if (becauseOf.length === 1 && !this.hasWildcardPatterns(becauseOf[0])) {
      this.exactMatchCache.set(becauseOf[0], result)
    }

    return result
  }

  /**
   * Answer all registered descriptions.
   *
   * Useful for introspection, debugging, and testing.
   *
   * @returns ProjectToDescription[] array of all descriptions
   */
  allDescriptions(): ProjectToDescription[] {
    return [...this.descriptions]
  }

  /**
   * Answer the count of registered descriptions.
   *
   * @returns number the count
   */
  count(): number {
    return this.descriptions.length
  }

  /**
   * Clear all registered descriptions.
   *
   * Useful for testing and dynamic reconfiguration.
   */
  clear(): void {
    this.descriptions.length = 0
    this.exactMatchCache.clear()
  }

  /**
   * Check if a reason contains wildcard patterns.
   *
   * @param reason the reason to check
   * @returns boolean true if contains wildcards
   */
  private hasWildcardPatterns(reason: string): boolean {
    return reason.includes('*') || reason.endsWith('.')
  }

  /**
   * Answer a string representation.
   *
   * @returns string human-readable representation
   */
  toString(): string {
    return `MatchableProjections[count=${this.descriptions.length}]`
  }
}
