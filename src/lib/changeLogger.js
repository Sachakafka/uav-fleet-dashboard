/**
 * Change Logger Utility
 *
 * Logs all changes to vehicles, bookings, and profiles
 * to the change_logs table for audit trail purposes.
 * Only logs when the user actually saves and when there are real field changes.
 */

import { supabase } from './supabase.js';
import { normalizeConfig } from './hardwareConfig.js';

/**
 * Returns true if two values are considered equal for change-detection purposes.
 * For vehicle hw_config, uses normalized comparison so that equivalent configs
 * (e.g. { raw: "x" } vs { legacy_text: "x" }) are not counted as changed.
 */
function isFieldValueEqual(entityType, fieldName, beforeValue, afterValue) {
  if (entityType === 'vehicle' && fieldName === 'hw_config') {
    const beforeNorm = normalizeConfig(beforeValue);
    const afterNorm = normalizeConfig(afterValue);
    return JSON.stringify(beforeNorm) === JSON.stringify(afterNorm);
  }
  return JSON.stringify(beforeValue) === JSON.stringify(afterValue);
}

/**
 * Log a change to the change_logs table
 *
 * @param {Object} params - Logging parameters
 * @param {string} params.entityType - 'vehicle' | 'booking' | 'profile'
 * @param {string} params.entityId - UUID of the entity
 * @param {string} params.entityName - Display name of the entity
 * @param {string} params.actionType - 'create' | 'update' | 'delete'
 * @param {Object|null} params.beforeData - Object snapshot before change (for update/delete)
 * @param {Object|null} params.afterData - Object snapshot after change (for create/update)
 * @param {string} params.userId - Current user ID
 * @param {string} params.userEmail - Current user email
 * @param {string} params.displayName - Current user display name
 * @param {string} [params.notes] - Optional notes about the change
 * @returns {Promise<void>}
 */
export async function logChange({
  entityType,
  entityId,
  entityName,
  actionType,
  beforeData = null,
  afterData = null,
  userId,
  userEmail,
  displayName,
  notes = null
}) {
  try {
    // Validate required fields
    if (!entityType || !entityId || !actionType || !userId) {
      console.error('Missing required fields for change log:', {
        entityType,
        entityId,
        actionType,
        userId
      });
      return;
    }

    // Validate entity type
    const validEntityTypes = ['vehicle', 'booking', 'profile'];
    if (!validEntityTypes.includes(entityType)) {
      console.error('Invalid entity type:', entityType);
      return;
    }

    // Validate action type
    const validActionTypes = ['create', 'update', 'delete'];
    if (!validActionTypes.includes(actionType)) {
      console.error('Invalid action type:', actionType);
      return;
    }

    // Calculate changed fields for updates; use normalized comparison for hw_config
    let changedFields = null;
    if (actionType === 'update') {
      changedFields = {};
      if (beforeData && afterData) {
        for (const key in afterData) {
          if (['id', 'created_at', 'updated_at'].includes(key)) continue;
          const beforeValue = beforeData[key];
          const afterValue = afterData[key];
          if (!isFieldValueEqual(entityType, key, beforeValue, afterValue)) {
            changedFields[key] = { old: beforeValue, new: afterValue };
          }
        }
      }
      // Do not log update when there are no real changes (e.g. user opened modal and saved without editing)
      if (Object.keys(changedFields).length === 0) {
        return;
      }
      if ((!beforeData || !afterData) && notes == null) {
        notes = 'Update (snapshot incomplete)';
      }
    }

    // Prepare log entry
    const logEntry = {
      user_id: userId,
      user_email: userEmail,
      user_display_name: displayName,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      action_type: actionType,
      before_snapshot: beforeData,
      after_snapshot: afterData,
      changed_fields: changedFields,
      notes: notes
    };

    // Insert log entry
    const { error } = await supabase
      .from('change_logs')
      .insert(logEntry);

    if (error) {
      console.error('Error logging change:', error);
      // Don't throw - we don't want logging failures to break the app
      return;
    }

    console.log(`Successfully logged ${actionType} for ${entityType}:`, entityName);
  } catch (err) {
    console.error('Exception in logChange:', err);
    // Don't throw - we don't want logging failures to break the app
  }
}

/**
 * Group change history so that changes from the same day and same user
 * are merged into one record. Same day but different users stay separate.
 *
 * @param {Array} entries - Raw change log entries (newest first from getChangeHistory)
 * @returns {Array} Grouped entries, one per (calendar day, user) per entity
 */
export function groupChangeHistoryByDayAndUser(entries) {
  if (!entries || entries.length === 0) return []

  // Use UTC date for "same day" so all timezones are consistent
  const toDateKey = (createdAt) => {
    const d = new Date(createdAt)
    return d.toISOString().slice(0, 10) // YYYY-MM-DD
  }

  const groupKey = (entry) => `${toDateKey(entry.created_at)}-${entry.user_id || 'anonymous'}`

  const groups = new Map()

  for (const entry of entries) {
    const key = groupKey(entry)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(entry)
  }

  // Within each group, sort by created_at ascending (earliest first) for merge
  const result = []
  for (const [, groupEntries] of groups) {
    groupEntries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    const first = groupEntries[0]
    const last = groupEntries[groupEntries.length - 1]

    // Merge changed_fields: for each field, old from first change, new from last change
    let mergedChangedFields = null
    const allChangedFields = groupEntries.map((e) => e.changed_fields).filter(Boolean)
    if (allChangedFields.length > 0) {
      mergedChangedFields = {}
      for (const cf of allChangedFields) {
        for (const [field, values] of Object.entries(cf)) {
          if (!mergedChangedFields[field]) {
            mergedChangedFields[field] = { old: values.old, new: values.new }
          } else {
            mergedChangedFields[field].new = values.new
          }
        }
      }
    }

    // Action type: delete > create > update
    let actionType = 'update'
    for (const e of groupEntries) {
      if (e.action_type === 'delete') {
        actionType = 'delete'
        break
      }
      if (e.action_type === 'create') actionType = 'create'
    }

    const notesList = groupEntries.map((e) => e.notes).filter(Boolean)
    const notes = notesList.length > 0 ? notesList.join(' | ') : null

    result.push({
      ...last,
      id: last.id,
      created_at: last.created_at,
      user_id: last.user_id,
      user_email: last.user_email,
      user_display_name: last.user_display_name,
      action_type: actionType,
      changed_fields: mergedChangedFields,
      before_snapshot: first.before_snapshot,
      after_snapshot: last.after_snapshot,
      notes: notes || last.notes,
      _count: groupEntries.length
    })
  }

  // Sort by created_at descending (newest first)
  result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return result
}

/**
 * Fetch change history for a specific entity
 * 
 * @param {string} entityType - 'vehicle' | 'booking' | 'profile'
 * @param {string} entityId - UUID of the entity
 * @param {number} [limit=50] - Maximum number of records to fetch
 * @returns {Promise<Array>} Array of change log entries
 */
export async function getChangeHistory(entityType, entityId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('change_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching change history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getChangeHistory:', err);
    return [];
  }
}

/**
 * Fetch all changes made by a specific user
 * 
 * @param {string} userId - UUID of the user
 * @param {number} [limit=100] - Maximum number of records to fetch
 * @returns {Promise<Array>} Array of change log entries
 */
export async function getUserChanges(userId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('change_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user changes:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getUserChanges:', err);
    return [];
  }
}

/**
 * Format changed fields for display
 * 
 * @param {Object} changedFields - Changed fields object from log entry
 * @returns {Array<Object>} Formatted array of changes
 */
export function formatChangedFields(changedFields) {
  if (!changedFields) return [];
  
  return Object.entries(changedFields).map(([field, values]) => ({
    field,
    oldValue: values.old,
    newValue: values.new
  }));
}

/**
 * Get a human-readable label for a field name
 * 
 * @param {string} fieldName - Database field name
 * @returns {string} Human-readable label
 */
export function getFieldLabel(fieldName) {
  const labels = {
    name: 'Name',
    status: 'Status',
    department: 'Department',
    hw_config: 'Hardware Config',
    notes: 'Notes',
    project_name: 'Project Name',
    start_time: 'Start Time',
    end_time: 'End Time',
    risk_level: 'Risk Level',
    display_name: 'Display Name',
    role: 'Role',
    vehicle_id: 'Vehicle',
    user_id: 'User'
  };
  
  return labels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
