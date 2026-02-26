/**
 * YARIKIRU MCP Server - Validation Utilities
 *
 * This module provides validation functions for MCP tool inputs.
 * All functions are designed to work with the local-first and cloud-sync modes.
 */

/**
 * Validate a goal ID format and existence.
 *
 * @param goalId - The goal ID to validate (format: g_<timestamp>_<random>)
 * @param getGoalFn - Function to fetch goal from database (e.g., mcpGetGoal)
 * @param userId - The user ID for ownership verification
 * @returns Promise<boolean> - True if valid, false otherwise
 */
export async function validateGoalId(
    goalId: string,
    getGoalFn: (db: any, args: { goalId: string }, userId: string) => Promise<any>,
    db: any,
    userId: string
): Promise<boolean> {
    // Format check: g_<timestamp>_<random>
    // The pattern matches goal IDs like g_1234567890_abc123
    const pattern = /^g_\d+_[a-z0-9]+$/i
    if (!pattern.test(goalId)) {
        return false
    }

    // Existence and ownership check
    try {
        const result = await getGoalFn(db, { goalId }, userId)
        return result.goal !== undefined && result.goal !== null
    } catch (error) {
        // Goal not found or unauthorized
        return false
    }
}

/**
 * Validate a task/subtask ID format.
 *
 * @param taskId - The task ID to validate (format: s_<timestamp>_<random>)
 * @returns boolean - True if format is valid, false otherwise
 */
export function validateTaskIdFormat(taskId: string): boolean {
    const pattern = /^s_\d+_[a-z0-9]+$/i
    return pattern.test(taskId)
}

/**
 * Validate a project ID format.
 *
 * @param projectId - The project ID to validate (format: p_<timestamp>_<name>)
 * @returns boolean - True if format is valid, false otherwise
 */
export function validateProjectIdFormat(projectId: string): boolean {
    const pattern = /^p_\d+_[a-z0-9_]+$/i
    return pattern.test(projectId)
}

/**
 * Validate a work log ID format.
 *
 * @param logId - The work log ID to validate (format: wl_<timestamp>_<random>)
 * @returns boolean - True if format is valid, false otherwise
 */
export function validateWorkLogIdFormat(logId: string): boolean {
    const pattern = /^wl_\d+_[a-z0-9]+$/i
    return pattern.test(logId)
}

/**
 * Validate user ID format (user_xxx format).
 *
 * @param userId - The user ID to validate
 * @returns boolean - True if format is valid, false otherwise
 */
export function validateUserIdFormat(userId: string): boolean {
    // User IDs typically start with "user_" followed by alphanumeric characters
    const pattern = /^user_[a-zA-Z0-9]+$/
    return pattern.test(userId)
}

/**
 * Sanitize and validate user input for task/goal titles.
 *
 * @param title - The title to validate
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns object - { valid: boolean, error?: string }
 */
export function validateTitle(title: string, maxLength: number = 200): { valid: boolean; error?: string } {
    if (!title || typeof title !== 'string') {
        return { valid: false, error: 'Title must be a non-empty string' }
    }

    const trimmed = title.trim()
    if (trimmed.length === 0) {
        return { valid: false, error: 'Title cannot be empty or whitespace only' }
    }

    if (trimmed.length > maxLength) {
        return { valid: false, error: `Title must be ${maxLength} characters or less` }
    }

    return { valid: true }
}

/**
 * Validate priority value.
 *
 * @param priority - The priority value to validate
 * @returns boolean - True if valid, false otherwise
 */
export function validatePriority(priority: string): boolean {
    const validPriorities = ['critical', 'high', 'medium', 'low']
    return validPriorities.includes(priority)
}

/**
 * Validate status value.
 *
 * @param status - The status value to validate
 * @returns boolean - True if valid, false otherwise
 */
export function validateStatus(status: string): boolean {
    const validStatuses = ['todo', 'in_progress', 'done', 'archived']
    return validStatuses.includes(status)
}

/**
 * Validate estimated time in minutes.
 *
 * @param minutes - The estimated time in minutes
 * @returns object - { valid: boolean, error?: string }
 */
export function validateEstimatedMinutes(minutes: number): { valid: boolean; error?: string } {
    if (typeof minutes !== 'number' || isNaN(minutes)) {
        return { valid: false, error: 'Estimated minutes must be a number' }
    }

    if (minutes < 0) {
        return { valid: false, error: 'Estimated minutes cannot be negative' }
    }

    if (minutes > 480) { // 8 hours
        return { valid: false, error: 'Estimated minutes cannot exceed 480 (8 hours)' }
    }

    return { valid: true }
}

/**
 * Validate URL format.
 *
 * @param url - The URL to validate
 * @returns boolean - True if valid URL format, false otherwise
 */
export function validateUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Comprehensive validation for goal creation/update.
 *
 * @param data - The goal data to validate
 * @returns object - { valid: boolean, errors: string[] }
 */
export function validateGoalData(data: {
    title?: string
    description?: string
    deadline?: string
    priority?: number
}): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Title validation
    if (data.title !== undefined) {
        const titleValidation = validateTitle(data.title)
        if (!titleValidation.valid) {
            errors.push(titleValidation.error || 'Invalid title')
        }
    }

    // Description validation (optional)
    if (data.description !== undefined && data.description.length > 5000) {
        errors.push('Description must be 5000 characters or less')
    }

    // Deadline validation (optional)
    if (data.deadline !== undefined) {
        const deadlineDate = new Date(data.deadline)
        if (isNaN(deadlineDate.getTime())) {
            errors.push('Invalid deadline date format')
        }
    }

    // Priority validation (optional)
    if (data.priority !== undefined && (data.priority < 0 || data.priority > 3)) {
        errors.push('Priority must be between 0 and 3')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}
