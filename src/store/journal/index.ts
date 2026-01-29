// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

export type { Journal, StreamReader } from './Journal.js'
export { AppendResult } from './Journal.js'
export type { Entry } from './Entry.js'
export type { JournalReader } from './JournalReader.js'
export { EntryStream } from './EntryStream.js'
export { TextEntry } from './TextEntry.js'
export { Outcome, Success, Failure } from './Outcome.js'
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
