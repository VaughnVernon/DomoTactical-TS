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
