/**
 * Database Abstraction Layer
 * Prevents vendor lock-in by centralizing all database operations
 * 
 * Centralizes all Supabase queries for easier migration to other databases
 */

import { supabase } from './supabase'

export const db = {
    //==========================================
    // Vehicles Management
    //==========================================

    async getVehicles() {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async getVehicle(id) {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async createVehicle(vehicle) {
        const { data, error } = await supabase
            .from('vehicles')
            .insert(vehicle)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateVehicle(id, updates) {
        const { data, error } = await supabase
            .from('vehicles')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    /**
     * Soft delete vehicle (sets deleted_at). Row stays for audit; RLS hides it from lists.
     */
    async deleteVehicle(id) {
        const { error } = await supabase
            .from('vehicles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error
    },

    //==========================================
    // Bookings Management
    //==========================================

    async getBookings(vehicleId = null) {
        let query = supabase
            .from('bookings')
            .select('*')
            .order('start_time', { ascending: true })

        if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    },

    async getUpcomingBookings() {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(10)

        if (error) throw error
        return data
    },

    /**
     * Get bookings created by a user (for My Bookings page). Includes vehicle name.
     * DB column is 'description' (renamed from notes in migration 18).
     */
    async getBookingsByUser(userId) {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                id,
                vehicle_id,
                project_name,
                pilot_name,
                start_time,
                end_time,
                requester,
                location,
                duration,
                description,
                status,
                created_at,
                snapshotted_hw_config,
                vehicles ( name )
            `)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('start_time', { ascending: false })

        if (error) throw error
        const list = (data || []).map((row) => ({ ...row, description: row.description }))
        return list
    },

    async createBooking(booking) {
        const { data, error } = await supabase
            .from('bookings')
            .insert(booking)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateBooking(id, updates) {
        const { data, error } = await supabase
            .from('bookings')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    /**
     * Soft delete booking (sets deleted_at). Row stays for audit; RLS hides it from lists.
     */
    async deleteBooking(id) {
        const { error } = await supabase
            .from('bookings')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error
    },

    //==========================================
    // Team Members Management
    //==========================================

    async getTeamMembers(activeOnly = true) {
        let query = supabase
            .from('team_members')
            .select('*')
            .order('name')

        if (activeOnly) {
            query = query.eq('is_active', true)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    },

    async createTeamMember(member) {
        const { data, error } = await supabase
            .from('team_members')
            .insert(member)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateTeamMember(id, updates) {
        const { data, error } = await supabase
            .from('team_members')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deactivateTeamMember(id) {
        return await this.updateTeamMember(id, { is_active: false })
    },

    //==========================================
    // Activities & Logs
    //==========================================

    async getActivities(vehicleId = null, limit = 50) {
        let query = supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    },

    async logActivity(activity) {
        const { error } = await supabase
            .from('activities')
            .insert(activity)

        if (error) throw error
    },

    //==========================================
    // User Profiles
    //==========================================

    async getProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) throw error
        return data
    },

    async updateProfile(userId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async getAllProfiles() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('email')

        if (error) throw error
        return data
    },

    //==========================================
    // Utility Functions
    //==========================================

    /**
     * Check if there are conflicting bookings in the time period
     */
    async checkBookingConflict(vehicleId, startTime, endTime, excludeBookingId = null) {
        const conflict = await this.getConflictBooking(vehicleId, startTime, endTime, excludeBookingId)
        return !!conflict
    },

    /**
     * Get first conflicting booking (for Soft Lock toast: project name)
     * Overlap: existing.start_time <= endTime AND existing.end_time >= startTime
     */
    async getConflictBooking(vehicleId, startTime, endTime, excludeBookingId = null) {
        let query = supabase
            .from('bookings')
            .select('id, project_name, pilot_name, start_time, end_time, requester, location, duration, description, user_id')
            .eq('vehicle_id', vehicleId)
            .is('deleted_at', null)
            .neq('status', 'rejected')
            .lte('start_time', endTime)
            .gte('end_time', startTime)
            .limit(1)

        if (excludeBookingId) {
            query = query.neq('id', excludeBookingId)
        }

        const { data, error } = await query
        if (error) throw error
        const row = data && data[0] ? data[0] : null
        return row ? { ...row, description: row.description } : null
    },

    /**
     * Get ALL conflicting bookings with detailed information
     * Used for enhanced conflict detection UI.
     */
    async getAllConflictingBookings(vehicleId, startTime, endTime, excludeBookingId = null) {
        let query = supabase
            .from('bookings')
            .select('id, project_name, pilot_name, start_time, end_time, requester, location, duration, description, user_id')
            .eq('vehicle_id', vehicleId)
            .is('deleted_at', null)
            .neq('status', 'rejected')
            .lte('start_time', endTime)
            .gte('end_time', startTime)
            .order('start_time', { ascending: true })

        if (excludeBookingId) {
            query = query.neq('id', excludeBookingId)
        }

        const { data, error } = await query
        if (error) throw error
        const list = (data || []).map((row) => ({ ...row, description: row.description }))
        return list
    },

    /**
     * Get the next booking for a vehicle
     */
    async getNextBooking(vehicleId) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
        return data
    },

    //==========================================
    // Approval & Notifications (Batch 5)
    //==========================================

    /**
     * Fetch unread notifications for approval requests (approvers only).
     * Returns list with notification id, approval_request, booking, vehicle name.
     * Caller should filter by approval_requests.status === 'pending'.
     */
    async getPendingApprovalNotifications() {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                id,
                approval_request_id,
                created_at,
                approval_requests (
                    id,
                    booking_id,
                    status,
                    requested_by,
                    bookings (
                        id,
                        vehicle_id,
                        project_name,
                        requester,
                        start_time,
                        end_time,
                        pilot_name,
                        location,
                        duration,
                        description,
                        risk_level,
                        vehicles ( name )
                    )
                )
            `)
            .is('read_at', null)
            .order('created_at', { ascending: false })

        if (error) throw error
        const list = (data || []).filter((n) => n.approval_requests && n.approval_requests.status === 'pending')
        return list.map((n) => ({
            ...n,
            approval_requests: n.approval_requests
                ? {
                      ...n.approval_requests,
                      bookings: n.approval_requests.bookings
                          ? { ...n.approval_requests.bookings, description: n.approval_requests.bookings.description }
                          : n.approval_requests.bookings
                  }
                : n.approval_requests
        }))
    },

    /**
     * Fetch all approval notifications for the Notifications page (approvers only).
     * Returns pending, approved, and rejected so we can show status and make decided ones unclickable.
     */
    async getApprovalNotifications() {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                id,
                approval_request_id,
                created_at,
                read_at,
                approval_requests (
                    id,
                    booking_id,
                    status,
                    requested_by,
                    resolved_at,
                    resolved_by,
                    bookings (
                        id,
                        vehicle_id,
                        project_name,
                        requester,
                        start_time,
                        end_time,
                        pilot_name,
                        location,
                        duration,
                        description,
                        risk_level,
                        vehicles ( name )
                    )
                )
            `)
            .order('created_at', { ascending: false })

        if (error) throw error
        const raw = (data || []).filter((n) => n.approval_requests != null)
        return raw.map((n) => ({
            ...n,
            approval_requests: n.approval_requests
                ? {
                      ...n.approval_requests,
                      bookings: n.approval_requests.bookings
                          ? { ...n.approval_requests.bookings, description: n.approval_requests.bookings.description }
                          : n.approval_requests.bookings
                  }
                : n.approval_requests
        }))
    },

    /**
     * Approve or reject a pending booking and mark notification read.
     * @param {string} approvalRequestId - approval_requests.id
     * @param {'approved'|'rejected'} resolution
     * @param {string} notificationId - notifications.id (to set read_at)
     * @param {string} resolvedByUserId - auth.uid()
     */
    async resolveApprovalRequest(approvalRequestId, resolution, notificationId, resolvedByUserId) {
        const bookingStatus = resolution === 'approved' ? 'confirmed' : 'rejected'

        const { data: ar } = await supabase
            .from('approval_requests')
            .select('booking_id')
            .eq('id', approvalRequestId)
            .single()
        if (!ar?.booking_id) throw new Error('Approval request not found')

        await supabase
            .from('bookings')
            .update({ status: bookingStatus })
            .eq('id', ar.booking_id)

        await supabase
            .from('approval_requests')
            .update({
                status: resolution,
                resolved_at: new Date().toISOString(),
                resolved_by: resolvedByUserId
            })
            .eq('id', approvalRequestId)

        if (notificationId) {
            await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', notificationId)
        }
    }
}

export default db
