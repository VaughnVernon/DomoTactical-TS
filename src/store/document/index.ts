// Copyright � 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright � 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

export {
  DocumentStore,
  DocumentBundle,
  ReadResult,
  ReadAllResult,
  WriteResult,
  Outcome
} from './DocumentStore.js'

export { InMemoryDocumentStore } from './inmemory/InMemoryDocumentStore.js'
export {
  DefaultDocumentStoreSupervisor,
  defaultDocumentStoreSupervisor,
  DEFAULT_DOCUMENT_STORE_SUPERVISOR,
  defaultProjectionSupervisor,
  DEFAULT_PROJECTION_SUPERVISOR
} from './DefaultDocumentStoreSupervisor.js'
