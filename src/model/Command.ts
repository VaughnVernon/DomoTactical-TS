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
 * Abstract base for commands, which are considered a type of Source.
 * Commands represent intentions to change state in a domain model.
 */
export abstract class Command extends Source<Command> {
  /**
   * Construct my default state with a type version of 1.
   */
  protected constructor()

  /**
   * Construct my default state with a commandTypeVersion greater than 1.
   * @param commandTypeVersion the int version of this command type
   */
  protected constructor(commandTypeVersion: number)

  /**
   * Constructor implementation.
   */
  protected constructor(commandTypeVersion: number = 1) {
    super(commandTypeVersion)
  }
}
