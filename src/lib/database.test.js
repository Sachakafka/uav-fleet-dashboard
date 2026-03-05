import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase: chain is thenable and resolves with mutable mockResult.
// Factory runs in hoisted context so we define everything inside.
vi.mock('./supabase', () => {
  const mockResult = { data: null, error: null }
  const chain = {
    from: () => chain,
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    is: () => chain,
    single: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    gte: () => chain,
    lte: () => chain,
    neq: () => chain,
    limit: () => chain,
    then(resolve) {
      resolve(mockResult)
      return this
    },
    catch(fn) {
      if (mockResult.error) fn(mockResult.error)
      return this
    },
  }
  return {
    supabase: {
      from: () => chain,
      _setResult(result) {
        mockResult.data = result?.data ?? null
        mockResult.error = result?.error ?? null
      },
    },
  }
})

import { supabase } from './supabase'
import { db } from './database.js'

describe('db', () => {
  beforeEach(() => {
    supabase._setResult({ data: null, error: null })
  })

  describe('getVehicles', () => {
    it('returns data from supabase vehicles', async () => {
      const vehicles = [{ id: '1', name: 'V1' }]
      supabase._setResult({ data: vehicles, error: null })
      const result = await db.getVehicles()
      expect(result).toEqual(vehicles)
    })

    it('throws when supabase returns error', async () => {
      supabase._setResult({ error: { message: 'DB error' } })
      await expect(db.getVehicles()).rejects.toEqual({ message: 'DB error' })
    })
  })

  describe('getVehicle', () => {
    it('returns single vehicle by id', async () => {
      const vehicle = { id: 'v1', name: 'Alpha' }
      supabase._setResult({ data: vehicle, error: null })
      const result = await db.getVehicle('v1')
      expect(result).toEqual(vehicle)
    })
  })

  describe('getBookings', () => {
    it('returns bookings without filter when vehicleId is null', async () => {
      const bookings = [{ id: 'b1', vehicle_id: 'v1' }]
      supabase._setResult({ data: bookings, error: null })
      const result = await db.getBookings()
      expect(result).toEqual(bookings)
    })

    it('returns bookings for vehicle when vehicleId provided', async () => {
      const bookings = [{ id: 'b1', vehicle_id: 'v1' }]
      supabase._setResult({ data: bookings, error: null })
      const result = await db.getBookings('v1')
      expect(result).toEqual(bookings)
    })
  })

  describe('createBooking', () => {
    it('returns created booking', async () => {
      const booking = {
        vehicle_id: 'v1',
        project_name: 'Test',
        start_time: '2026-02-01T00:00:00Z',
        end_time: '2026-02-02T00:00:00Z',
      }
      supabase._setResult({ data: { ...booking, id: 'b1' }, error: null })
      const result = await db.createBooking(booking)
      expect(result).toMatchObject(booking)
      expect(result.id).toBe('b1')
    })

    it('throws when supabase returns error', async () => {
      supabase._setResult({ error: { message: 'Insert failed' } })
      await expect(db.createBooking({})).rejects.toEqual({ message: 'Insert failed' })
    })
  })

  describe('checkBookingConflict', () => {
    it('returns true when conflict exists', async () => {
      supabase._setResult({ data: [{ id: 'b1', project_name: 'Other' }], error: null })
      const result = await db.checkBookingConflict('v1', '2026-02-01T00:00:00Z', '2026-02-05T00:00:00Z')
      expect(result).toBe(true)
    })

    it('returns false when no conflict', async () => {
      supabase._setResult({ data: [], error: null })
      const result = await db.checkBookingConflict('v1', '2026-02-01T00:00:00Z', '2026-02-03T00:00:00Z')
      expect(result).toBe(false)
    })
  })

  describe('getConflictBooking', () => {
    it('returns first conflicting booking with id and project_name', async () => {
      const conflict = { id: 'b1', project_name: 'Existing Project' }
      supabase._setResult({ data: [conflict], error: null })
      const result = await db.getConflictBooking('v1', '2026-02-01T00:00:00Z', '2026-02-05T00:00:00Z')
      expect(result).toEqual(conflict)
    })

    it('returns null when no conflict', async () => {
      supabase._setResult({ data: [], error: null })
      const result = await db.getConflictBooking('v1', '2026-02-01T00:00:00Z', '2026-02-05T00:00:00Z')
      expect(result).toBeNull()
    })
  })

  describe('getProfile', () => {
    it('returns profile for userId', async () => {
      const profile = { id: 'u1', department: 'R&D' }
      supabase._setResult({ data: profile, error: null })
      const result = await db.getProfile('u1')
      expect(result).toEqual(profile)
    })
  })

  describe('updateVehicle', () => {
    it('returns updated vehicle', async () => {
      const updated = { id: 'v1', name: 'Updated', status: 'Ready' }
      supabase._setResult({ data: updated, error: null })
      const result = await db.updateVehicle('v1', { status: 'Ready' })
      expect(result).toEqual(updated)
    })
  })

  describe('deleteBooking', () => {
    it('does not throw when delete succeeds', async () => {
      supabase._setResult({ error: null })
      await expect(db.deleteBooking('b1')).resolves.toBeUndefined()
    })

    it('throws when supabase returns error', async () => {
      supabase._setResult({ error: { message: 'Delete failed' } })
      await expect(db.deleteBooking('b1')).rejects.toEqual({ message: 'Delete failed' })
    })
  })
})
