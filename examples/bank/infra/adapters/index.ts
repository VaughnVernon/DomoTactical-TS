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
