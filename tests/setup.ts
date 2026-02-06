// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5

import { beforeEach } from 'vitest'
import { StoreTypeMapper, EntryAdapterProvider, StateAdapterProvider, ContextProfile } from 'domo-tactical/store'

// Reset all singletons before each test to ensure test isolation
beforeEach(() => {
  StoreTypeMapper.reset()
  EntryAdapterProvider.reset()
  StateAdapterProvider.reset()
  ContextProfile.reset()
})
