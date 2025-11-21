// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Command } from './Command'

/**
 * Provides the means to request the identity of the Command.
 * Extends Command to add identity capabilities.
 */
export abstract class IdentifiedCommand extends Command {
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

  /**
   * Answer the string identity of this Command.
   * @returns string
   */
  abstract identity(): string
}
