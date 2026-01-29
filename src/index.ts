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
  DefaultTextEntryAdapter,
  EntryRegistry,
  ContextProfile,
} from './store'

export type { PropertyTransforms, SourceTypeSpec } from './store'

export type { Journal, StreamReader, JournalReader, Entry, JournalConsumer } from './store/journal'
export {
  AppendResult,
  EntryStream,
  Outcome,
  Success,
  Failure,
  InMemoryJournal,
  JournalConsumerActor,
} from './store/journal'

export type {
  DocumentStore,
  DocumentBundle,
  ReadResult,
  ReadAllResult,
  WriteResult,
  Outcome as DocumentOutcome
} from './store/document'
export { InMemoryDocumentStore } from './store/document'

// Model exports
export {
  Command,
  DomainEvent,
  IdentifiedCommand,
  IdentifiedDomainEvent,
  EntityActor,
  ApplyFailedError,
  Applicable,
} from './model'

export {
  SourcedEntity,
  EventSourcedEntity,
  CommandSourcedEntity,
  eventSourcedEntityTypeFor,
  commandSourcedEntityTypeFor,
  eventSourcedContextFor,
  commandSourcedContextFor,
} from './model/sourcing'

export type { ContextSourceTypes } from './model/sourcing'

// Projection exports
export type { Projectable, Projection, ProjectionControl, Confirmer, ProjectionDispatcher } from './model/projections'
export {
  AbstractProjectable,
  TextProjectable,
  BasicProjectionControl,
  ProjectToDescription,
  MatchableProjections,
  AbstractProjectionDispatcherActor,
  TextProjectionDispatcherActor,
  ProjectionSupervisor,
} from './model/projections'
