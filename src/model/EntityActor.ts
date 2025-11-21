// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor } from 'domo-actors'

/**
 * Abstract base of all entity types.
 * EntityActor extends the DomoActors Actor base class to provide
 * entity-specific behavior including state restoration.
 */
export abstract class EntityActor extends Actor {
  /**
   * Restore my state from persistence.
   * This method is called during actor initialization to recover state.
   * Concrete entity actors must implement this to restore their specific state.
   */
  protected abstract restore(): Promise<void>
}
