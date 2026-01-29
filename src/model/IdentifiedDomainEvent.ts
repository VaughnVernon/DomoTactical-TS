// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { DomainEvent } from './DomainEvent.js'

/**
 * Provides the means to request the identity of the DomainEvent.
 * Extends DomainEvent to add identity and parent identity capabilities.
 */
export abstract class IdentifiedDomainEvent extends DomainEvent {
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

  /**
   * Answer the string identity of this DomainEvent.
   * @returns string
   */
  abstract identity(): string

  /**
   * Answer the string parent identity of this DomainEvent.
   * Must be overridden for supplying meaningful values.
   * @returns string
   */
  parentIdentity(): string {
    return ''
  }
}
