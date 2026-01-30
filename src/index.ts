// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

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
} from './store/index.js'

export type { EntryAdapter, StateAdapter, PropertyTransforms, SourceTypeSpec } from './store/index.js'

export type { Journal, StreamReader, JournalReader, Entry, JournalConsumer, StreamInfo } from './store/journal/index.js'
export {
  AppendResult,
  EntryStream,
  TextEntry,
  Outcome,
  Success,
  Failure,
  InMemoryJournal,
  JournalConsumerActor,
  StreamState,
  DefaultStreamInfo,
  TombstoneResult,
  DeleteResult,
  TruncateResult,
} from './store/journal/index.js'

export type {
  DocumentStore,
  DocumentBundle,
  ReadResult,
  ReadAllResult,
  WriteResult,
  Outcome as DocumentOutcome
} from './store/document/index.js'
export { InMemoryDocumentStore } from './store/document/index.js'

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
