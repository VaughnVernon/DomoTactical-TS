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

import { Source } from '../store/Source.js'

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
