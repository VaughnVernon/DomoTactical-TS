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

export type { Journal, StreamReader } from './Journal.js'
export { AppendResult } from './Journal.js'
export {
  DefaultJournalSupervisor,
  defaultJournalSupervisor,
  DEFAULT_JOURNAL_SUPERVISOR
} from './DefaultJournalSupervisor.js'
export type { JournalReader } from './JournalReader.js'
export { EntryStream } from './EntryStream.js'
export { InMemoryJournal } from './inmemory/InMemoryJournal.js'
export type { JournalConsumer } from './JournalConsumerActor.js'
export { JournalConsumerActor } from './JournalConsumerActor.js'

// Stream Lifecycle Management
export { StreamState } from './StreamState.js'
export type { StreamInfo } from './StreamInfo.js'
export { DefaultStreamInfo } from './StreamInfo.js'
export { TombstoneResult } from './TombstoneResult.js'
export { DeleteResult } from './DeleteResult.js'
export { TruncateResult } from './TruncateResult.js'

// =============================================================================
// DEPRECATED: Re-exports for backward compatibility
// These types have been relocated to 'domo-tactical/store'.
// Please update your imports to use the new location.
// =============================================================================

/**
 * @deprecated Import from 'domo-tactical/store' instead.
 * This re-export will be removed in a future version.
 */
export { Entry } from '../Entry.js'

/**
 * @deprecated Import from 'domo-tactical/store' instead.
 * This re-export will be removed in a future version.
 */
export { TextEntry } from '../TextEntry.js'

/**
 * @deprecated Import from 'domo-tactical/store' instead.
 * This re-export will be removed in a future version.
 */
export { Outcome, Success, Failure } from '../Outcome.js'
