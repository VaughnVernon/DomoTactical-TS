// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { eventSourcedEntityTypeFor } from 'domo-tactical/model/sourcing'

/**
 * Base class for all event-sourced entities in the bank bounded context.
 * Uses the journal registered at 'domo-tactical:bank.journal'.
 */
export const BankEventSourcedEntity = eventSourcedEntityTypeFor('bank')
