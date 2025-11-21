// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Source } from '../store/Source'

/**
 * Abstract base for events, which are considered a type of Source.
 * Domain events represent facts that have occurred in the domain model.
 */
export abstract class DomainEvent extends Source<DomainEvent> {
  /**
   * Construct my default state with a type version of 1.
   */
  protected constructor()

  /**
   * Construct my default state with an eventTypeVersion greater than 1.
   * @param eventTypeVersion the int version of this event type
   */
  protected constructor(eventTypeVersion: number)

  /**
   * Constructor implementation.
   */
  protected constructor(eventTypeVersion: number = 1) {
    super(eventTypeVersion)
  }
}
