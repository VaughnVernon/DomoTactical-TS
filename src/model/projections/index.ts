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

export type { Projectable } from './Projectable.js'
export { AbstractProjectable, TextProjectable } from './Projectable.js'
export type { Projection } from './Projection.js'
export type { ProjectionControl } from './ProjectionControl.js'
export { BasicProjectionControl } from './ProjectionControl.js'
export type { Confirmer } from './Confirmer.js'
export { ProjectToDescription } from './ProjectToDescription.js'
export { MatchableProjections } from './MatchableProjections.js'
export type { ProjectionDispatcher } from './ProjectionDispatcher.js'
export { AbstractProjectionDispatcherActor } from './AbstractProjectionDispatcherActor.js'
export { TextProjectionDispatcherActor } from './TextProjectionDispatcherActor.js'
export { ProjectionSupervisor } from './ProjectionSupervisor.js'

// Re-export projection supervisor from document store for convenience
export {
  defaultProjectionSupervisor,
  DEFAULT_PROJECTION_SUPERVISOR
} from '../../store/document/DefaultDocumentStoreSupervisor.js'
