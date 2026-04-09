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
