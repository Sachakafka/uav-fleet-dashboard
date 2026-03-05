/**
 * Centralized Error Handler
 * Provides unified error handling, categorization, and user-friendly messages
 */

import { logChange } from './changeLogger'

// Error categories
export const ErrorCategory = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    AUTH: 'auth',
    DATABASE: 'database',
    UNKNOWN: 'unknown'
}

// Error severity levels
export const ErrorSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
}

/**
 * Categorize error based on error object
 */
function categorizeError(error) {
    if (!error) return ErrorCategory.UNKNOWN

    const message = error.message?.toLowerCase() || ''
    const code = error.code?.toLowerCase() || ''

    // Network errors
    if (
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('timeout') ||
        code.includes('network')
    ) {
        return ErrorCategory.NETWORK
    }

    // Auth errors
    if (
        message.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        code === 'pgrst301' ||
        code === 'pgrst302'
    ) {
        return ErrorCategory.AUTH
    }

    // Database errors
    if (
        message.includes('database') ||
        message.includes('postgres') ||
        message.includes('supabase') ||
        code.startsWith('pgrst')
    ) {
        return ErrorCategory.DATABASE
    }

    // Validation errors
    if (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('required')
    ) {
        return ErrorCategory.VALIDATION
    }

    return ErrorCategory.UNKNOWN
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error, category) {
    // Custom error messages
    if (error.userMessage) {
        return error.userMessage
    }

    const message = error.message?.toLowerCase() || ''
    const code = (error.code || '').toLowerCase()

    // RLS / permission denied (often from Supabase with message about row-level security)
    const isRlsOrPermission =
        message.includes('row-level security') ||
        message.includes('violates') ||
        message.includes('policy') ||
        code === '42501' // insufficient_privilege

    // Category-based messages
    switch (category) {
        case ErrorCategory.NETWORK:
            return 'Network error. Please check your connection and try again.'

        case ErrorCategory.AUTH:
            return 'Authentication error. Please sign in again.'

        case ErrorCategory.DATABASE:
            if (isRlsOrPermission) {
                return "You don't have permission to create this booking. Your account may need Editor or Admin role and access to this vehicle's department."
            }
            return 'Database error. Please try again or contact support.'

        case ErrorCategory.VALIDATION:
            return error.message || 'Please check your input and try again.'

        default:
            return 'An unexpected error occurred. Please try again.'
    }
}

/**
 * Get error severity
 */
function getErrorSeverity(category) {
    switch (category) {
        case ErrorCategory.AUTH:
        case ErrorCategory.DATABASE:
            return ErrorSeverity.CRITICAL
        
        case ErrorCategory.NETWORK:
            return ErrorSeverity.ERROR
        
        case ErrorCategory.VALIDATION:
            return ErrorSeverity.WARNING
        
        default:
            return ErrorSeverity.ERROR
    }
}

/**
 * Main error handler
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred (e.g., 'BookingModal.save')
 * @param {Object} options - Additional options
 * @returns {Object} - Error details for display
 */
export async function handleError(error, context = 'Unknown', options = {}) {
    const {
        showToast = true,
        logToDatabase = true,
        userId = null,
        userEmail = null,
        displayName = null
    } = options

    // Categorize error
    const category = categorizeError(error)
    const severity = getErrorSeverity(category)
    const userMessage = getUserFriendlyMessage(error, category)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error(`[${context}] Error:`, {
            category,
            severity,
            error,
            message: error.message,
            stack: error.stack
        })
    }

    // Log to database (change_logs)
    if (logToDatabase && userId) {
        try {
            await logChange({
                entityType: 'error',
                entityId: null,
                entityName: context,
                actionType: 'error',
                beforeData: null,
                afterData: {
                    category,
                    severity,
                    message: error.message,
                    stack: error.stack,
                    userMessage,
                    timestamp: new Date().toISOString()
                },
                userId,
                userEmail,
                displayName,
                notes: `Error in ${context}: ${error.message}`
            })
        } catch (logError) {
            console.error('Failed to log error to database:', logError)
        }
    }

    return {
        category,
        severity,
        message: userMessage,
        originalError: error,
        context
    }
}

/**
 * Handle validation errors
 */
export function handleValidationError(fieldErrors, context = 'Validation') {
    const messages = Object.entries(fieldErrors)
        .map(([field, error]) => `${field}: ${error}`)
        .join(', ')

    return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.WARNING,
        message: messages || 'Please check your input',
        context
    }
}

/**
 * Create a custom error with user message
 */
export function createError(message, userMessage = null, category = ErrorCategory.UNKNOWN) {
    const error = new Error(message)
    error.userMessage = userMessage
    error.category = category
    return error
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error) {
    return categorizeError(error) === ErrorCategory.NETWORK
}

/**
 * Check if error is auth-related
 */
export function isAuthError(error) {
    return categorizeError(error) === ErrorCategory.AUTH
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            
            // Don't retry on auth or validation errors
            const category = categorizeError(error)
            if (category === ErrorCategory.AUTH || category === ErrorCategory.VALIDATION) {
                throw error
            }
            
            // Wait before retry (exponential backoff)
            if (i < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, i)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }
    
    throw lastError
}
