// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor, Protocol, Definition } from 'domo-actors'
import { Projection } from './Projection.js'
import { ProjectToDescription } from './ProjectToDescription.js'
import { MatchableProjections } from './MatchableProjections.js'
import { ProjectionDispatcher } from './ProjectionDispatcher.js'

/**
 * Abstract base of all ProjectionDispatcher Actor types.
 *
 * Holds the pool of Projection instances (as Actors) that are used to
 * project Projectable states based on MatchableProjections.
 *
 * This Actor-based implementation provides:
 * - Message-driven dispatching
 * - Supervision for fault tolerance
 * - Actor lifecycle management for projections
 * - No try-catch - supervision handles all errors
 *
 * Concrete subclasses implement specific dispatch strategies
 * (e.g., TextProjectionDispatcherActor for text/JSON events).
 *
 * @example
 * ```typescript
 * export class TextProjectionDispatcherActor
 *   extends AbstractProjectionDispatcherActor {
 *
 *   async dispatch(projectable: Projectable): Promise<void> {
 *     // Filter and dispatch based on text/JSON criteria
 *     await super.dispatchTo(projectable)
 *   }
 * }
 * ```
 */
export abstract class AbstractProjectionDispatcherActor
  extends Actor
  implements ProjectionDispatcher {

  protected readonly matchableProjections: MatchableProjections

  /**
   * Construct with empty projections.
   */
  constructor() {
    super()
    this.matchableProjections = new MatchableProjections()
  }

  /**
   * Construct with initial ProjectToDescription collection.
   *
   * Each ProjectToDescription contains a projection class that will be
   * instantiated as an Actor using stage().actorFor().
   *
   * @param projectToDescriptions the collection of projection descriptions
   */
  protected initializeWithDescriptions(
    projectToDescriptions: ProjectToDescription[]
  ): void {
    for (const description of projectToDescriptions) {
      // Create projection as an Actor
      const projection = this.createProjectionActor(description)

      // Register for pattern matching
      this.matchableProjections.register(
        new ProjectToDescription(
          projection,
          description.becauseOf,
          description.description
        )
      )
    }
  }

  /**
   * Create a Projection instance as an Actor.
   *
   * Override this method to customize how Projection Actors are created
   * (e.g., with different supervisors, parameters, etc.).
   *
   * @param description the projection description
   * @returns Projection the projection actor
   */
  protected createProjectionActor(description: ProjectToDescription): Projection {
    // In the Java version, this uses:
    // stage().actorFor(Projection.class, description.projectionType, params)
    //
    // For now, we assume the description.projection is already an Actor instance
    // or will be wrapped by subclasses. Concrete implementations will override
    // this to create proper Actor instances.
    return description.projection
  }

  /**
   * Register a projection for dispatching.
   *
   * The projection will receive Projectables whose becauseOf reasons
   * match any of the patterns in the description.
   *
   * @param description the ProjectToDescription defining matching criteria
   */
  register(description: ProjectToDescription): void {
    this.matchableProjections.register(description)
  }

  /**
   * Abstract dispatch method to be implemented by subclasses.
   *
   * Subclasses determine how to dispatch based on Projectable type
   * (text, binary, etc.).
   */
  abstract dispatch(projectable: any): Promise<void>

  /**
   * Answer whether there are any Projections for the given cause.
   *
   * @param actualCause the string describing the cause
   * @returns boolean true if projections exist for this cause
   */
  protected hasProjectionsFor(actualCause: string): boolean {
    return this.projectionsFor(actualCause).length > 0
  }

  /**
   * Answer the list of Projections that match the given causes.
   *
   * @param actualCauses the strings describing the causes
   * @returns Projection[] the matching projections
   */
  protected projectionsFor(...actualCauses: string[]): Projection[] {
    return this.matchableProjections.match(actualCauses)
  }

  /**
   * Answer the count of registered projections.
   * Message handler for testing/introspection.
   *
   * @returns Promise<number> the count of registered projections
   */
  async projectionCount(): Promise<number> {
    return this.matchableProjections.count()
  }

  /**
   * Answer all registered projection descriptions.
   * Message handler for testing/introspection.
   *
   * @returns Promise<ProjectToDescription[]> all registered descriptions
   */
  async allDescriptions(): Promise<ProjectToDescription[]> {
    return this.matchableProjections.allDescriptions()
  }
}
