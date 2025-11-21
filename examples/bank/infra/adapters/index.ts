// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Bank example custom adapters demonstrating schema evolution.
 *
 * These adapters show how to handle event schema changes over time
 * using the upcasting pattern. Old events are automatically converted
 * to the current schema version when read from the journal.
 */

export { AccountOpenedAdapter } from './AccountOpenedAdapter'
export { FundsDepositedAdapter } from './FundsDepositedAdapter'
export { FundsWithdrawnAdapter } from './FundsWithdrawnAdapter'
export { FundsRefundedAdapter } from './FundsRefundedAdapter'
