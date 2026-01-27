// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Test utilities for domo-tactical.
 *
 * This module provides simple in-memory implementations suitable for:
 * - Unit and integration testing
 * - Development and prototyping
 * - Examples and demonstrations
 *
 * NOT suitable for production use.
 */

export { TestConfirmer } from './TestConfirmer'
export { TestJournalSupervisor, type TestSupervisor } from './TestJournalSupervisor'

// Convenient aliases for test utilities
export { InMemoryJournal as TestJournal } from '../store/journal/inmemory/InMemoryJournal'
export { InMemoryDocumentStore as TestDocumentStore } from '../store/document/inmemory/InMemoryDocumentStore'
