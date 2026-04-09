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
 * Test utilities for domo-tactical.
 *
 * This module provides simple in-memory implementations suitable for:
 * - Unit and integration testing
 * - Development and prototyping
 * - Examples and demonstrations
 *
 * NOT suitable for production use.
 */

export { TestConfirmer } from './TestConfirmer.js'
export { TestJournalSupervisor, type TestSupervisor } from './TestJournalSupervisor.js'

// Convenient aliases for test utilities
export { InMemoryJournal as TestJournal } from '../store/journal/inmemory/InMemoryJournal.js'
export { InMemoryDocumentStore as TestDocumentStore } from '../store/document/inmemory/InMemoryDocumentStore.js'
