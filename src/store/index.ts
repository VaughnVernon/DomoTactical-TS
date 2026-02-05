// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

export { Source } from './Source.js'
export { Metadata } from './Metadata.js'
export { State, BinaryState, TextState, ObjectState } from './State.js'
export { Result } from './Result.js'
export { StorageException } from './StorageException.js'
export type { EntryAdapter } from './EntryAdapter.js'
export { EntryAdapterProvider } from './EntryAdapterProvider.js'
export type { StateAdapter } from './StateAdapter.js'
export { StateAdapterProvider } from './StateAdapterProvider.js'
export { DefaultTextEntryAdapter } from './DefaultTextEntryAdapter.js'
export { EntryRegistry, type PropertyTransforms } from './EntryRegistry.js'
export { ContextProfile, type SourceTypeSpec } from './ContextProfile.js'
export { StoreTypeMapper } from './StoreTypeMapper.js'

// Entry types (relocated from store/journal)
export { Entry } from './Entry.js'
export { TextEntry } from './TextEntry.js'
export { Outcome, Success, Failure } from './Outcome.js'
