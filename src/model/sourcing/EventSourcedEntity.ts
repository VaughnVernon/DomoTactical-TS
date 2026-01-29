// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { DomainEvent } from '../DomainEvent.js'
import { SourcedEntity } from './SourcedEntity.js'

/**
 * A SourcedEntity for concrete types of DomainEvent.
 * Event sourced entities maintain their state by applying domain events.
 */
export abstract class EventSourcedEntity extends SourcedEntity<DomainEvent> {
  /**
   * Construct my default state using my address as my streamName.
   */
  protected constructor()

  /**
   * Construct my default state.
   * @param streamName the String unique identity of this entity
   */
  protected constructor(streamName: string)

  /**
   * Constructor implementation.
   */
  protected constructor(streamName?: string) {
    super(streamName || null)
  }
}
