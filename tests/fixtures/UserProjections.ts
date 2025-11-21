// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

import { Actor, stage } from 'domo-actors'
import { Projection, Projectable, ProjectionControl } from 'domo-tactical'
import { DocumentStore } from 'domo-tactical/store/document'

/**
 * Simple user profile projection for testing CQRS patterns.
 */
export interface UserProfile {
  userId: string
  username: string
  email: string
  sessionCount: number
  lastAuthentication?: string
  registeredAt: string
  updatedAt: string
}

export class UserProfileProjection extends Actor implements Projection {
  private documentStore!: DocumentStore

  constructor() {
    super()
    const store = stage().registeredValue<DocumentStore>('domo-tactical:test.documentStore')
    if (!store) {
      throw new Error('DocumentStore not registered with Stage for testing')
    }
    this.documentStore = store
  }

  async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
    const entries = projectable.entries()

    for (const entry of entries) {
      const eventType = entry.type
      const eventData = JSON.parse(entry.entryData as string)
      const userId = eventData.userId

      switch (eventType) {
        case 'UserRegistered':
          await this.handleUserRegistered(userId, eventData)
          break

        case 'UserAuthenticated':
          await this.handleUserAuthenticated(userId, eventData)
          break

        case 'UserDeactivated':
          await this.handleUserDeactivated(userId)
          break

        default:
          // Ignore unknown events
          break
      }
    }

    control.confirmProjected(projectable)
  }

  private async handleUserRegistered(userId: string, eventData: any): Promise<void> {
    const profile: UserProfile = {
      userId,
      username: eventData.username,
      email: eventData.email,
      sessionCount: 0,
      registeredAt: eventData.registeredAt,
      updatedAt: eventData.registeredAt
    }

    await this.documentStore.write(userId, 'UserProfile', profile, 1)
  }

  private async handleUserAuthenticated(userId: string, eventData: any): Promise<void> {
    const result = await this.documentStore.read(userId, 'UserProfile')
    if (!result.outcome.success || !result.state) return

    const profile = result.state as UserProfile
    profile.sessionCount++
    profile.lastAuthentication = eventData.authenticatedAt
    profile.updatedAt = eventData.authenticatedAt

    await this.documentStore.write(userId, 'UserProfile', profile, result.stateVersion + 1)
  }

  private async handleUserDeactivated(userId: string): Promise<void> {
    // In real system might mark as inactive, here we just delete
    await this.documentStore.remove(userId, 'UserProfile')
  }
}

/**
 * Simple user activity statistics projection for testing.
 */
export interface UserActivityStats {
  totalUsers: number
  totalSessions: number
  activeUsers: number
  updatedAt: string
}

export class UserActivityStatsProjection extends Actor implements Projection {
  private documentStore!: DocumentStore
  private readonly STATS_ID = 'user-activity-stats'

  constructor() {
    super()
    const store = stage().registeredValue<DocumentStore>('domo-tactical:test.documentStore')
    if (!store) {
      throw new Error('DocumentStore not registered with Stage for testing')
    }
    this.documentStore = store
  }

  async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
    const entries = projectable.entries()

    for (const entry of entries) {
      const eventType = entry.type

      switch (eventType) {
        case 'UserRegistered':
          await this.incrementTotalUsers()
          break

        case 'UserAuthenticated':
          await this.incrementTotalSessions()
          break

        default:
          // Ignore unknown events
          break
      }
    }

    control.confirmProjected(projectable)
  }

  private async incrementTotalUsers(): Promise<void> {
    const result = await this.documentStore.read(this.STATS_ID, 'UserActivityStats')

    let stats: UserActivityStats
    let version = 1

    if (result.outcome.success && result.state) {
      stats = result.state as UserActivityStats
      version = result.stateVersion + 1
      stats.totalUsers++
      stats.activeUsers++
    } else {
      stats = {
        totalUsers: 1,
        totalSessions: 0,
        activeUsers: 1,
        updatedAt: new Date().toISOString()
      }
    }

    stats.updatedAt = new Date().toISOString()
    await this.documentStore.write(this.STATS_ID, 'UserActivityStats', stats, version)
  }

  private async incrementTotalSessions(): Promise<void> {
    const result = await this.documentStore.read(this.STATS_ID, 'UserActivityStats')

    if (!result.outcome.success || !result.state) return

    const stats = result.state as UserActivityStats
    stats.totalSessions++
    stats.updatedAt = new Date().toISOString()

    await this.documentStore.write(
      this.STATS_ID,
      'UserActivityStats',
      stats,
      result.stateVersion + 1
    )
  }
}
