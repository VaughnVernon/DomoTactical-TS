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

// Store exports
export {
  Source,
  Metadata,
  State,
  BinaryState,
  TextState,
  ObjectState,
  Result,
  StorageException,
  EntryAdapterProvider,
  StateAdapterProvider,
  DefaultTextEntryAdapter,
  EntryRegistry,
  ContextProfile,
  StoreTypeMapper,
  Entry,
  TextEntry,
  Outcome,
  Success,
  Failure,
} from './store/index.js'

export type { EntryAdapter, StateAdapter, PropertyTransforms, SourceTypeSpec } from './store/index.js'

export type { Journal, StreamReader, JournalReader, JournalConsumer, StreamInfo } from './store/journal/index.js'
export {
  AppendResult,
  EntryStream,
  InMemoryJournal,
  JournalConsumerActor,
  StreamState,
  DefaultStreamInfo,
  TombstoneResult,
  DeleteResult,
  TruncateResult,
  DefaultJournalSupervisor,
  defaultJournalSupervisor,
  DEFAULT_JOURNAL_SUPERVISOR,
} from './store/journal/index.js'

export type {
  DocumentStore,
  DocumentBundle,
  ReadResult,
  ReadAllResult,
  WriteResult,
  Outcome as DocumentOutcome
} from './store/document/index.js'
export {
  InMemoryDocumentStore,
  DefaultDocumentStoreSupervisor,
  defaultDocumentStoreSupervisor,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR,
  defaultProjectionSupervisor,
  DEFAULT_PROJECTION_SUPERVISOR,
} from './store/document/index.js'

// Model exports
export {
  Command,
  DomainEvent,
  IdentifiedCommand,
  IdentifiedDomainEvent,
  EntityActor,
  ApplyFailedError,
  Applicable,
} from './model/index.js'

export {
  SourcedEntity,
  EventSourcedEntity,
  CommandSourcedEntity,
  eventSourcedEntityTypeFor,
  commandSourcedEntityTypeFor,
  eventSourcedContextFor,
  commandSourcedContextFor,
} from './model/sourcing/index.js'

export type { ContextSourceTypes } from './model/sourcing/index.js'

// Projection exports
export type { Projectable, Projection, ProjectionControl, Confirmer, ProjectionDispatcher } from './model/projections/index.js'
export {
  AbstractProjectable,
  TextProjectable,
  BasicProjectionControl,
  ProjectToDescription,
  MatchableProjections,
  AbstractProjectionDispatcherActor,
  TextProjectionDispatcherActor,
  ProjectionSupervisor,
} from './model/projections/index.js'
