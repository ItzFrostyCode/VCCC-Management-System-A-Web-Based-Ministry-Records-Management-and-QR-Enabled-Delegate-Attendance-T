/**
 * Assignment Domain Logic Layer
 * Encapsulates business rules around assignment saving, correction detection,
 * and automated transfer coordination.
 */
import { assignmentService } from '../services/assignment.service.js';
import { EventMap } from '../utils/events.map.js';
import { events } from '../utils/events.js';

class AssignmentDomain {
    
    /**
     * Process saving of an assignment, orchestrating active assignment checks,
     * corrections, and transfers.
     * 
     * @param {Object} data - The assignment data payload from the view
     * @returns {Object} result - Indicates success, message to show, and action taken
     */
    async processSave(data, options = {}) {
        if (!data.pastor_id || !data.church_id || !data.start_date) {
            throw new Error('Pastor, Church, and Start Date are required.');
        }

        let auditAction = data.id ? 'UPDATE_ASSIGNMENT' : 'CREATE_ASSIGNMENT';
        let isAutomatedTransfer = false;

        // SPECIAL LOGIC: New Active Assignment Detection
        if (!data.id && data.status_code === 'active') {
            const existing = await assignmentService.fetchActiveByPastor(data.pastor_id);
            if (existing) {
                // Scenario A: Formal Correction / Mistake Fix
                if (data.event_type === 'Correction / Update') {
                    if (!options.forceCorrection && !options.forceTransfer) {
                        return {
                            require_confirmation: true,
                            confirmation_type: 'CORRECTION_OR_TRANSFER',
                            existing_church_name: existing.church_name,
                            existing_id: existing.id
                        };
                    }

                    if (options.forceCorrection) {
                        await assignmentService.update(existing.id, data, 'CORRECT_ASSIGNMENT');
                        events.emit(EventMap.ASSIGNMENT.UPDATED);
                        return { 
                            success: true, 
                            message: 'Assignment corrected successfully',
                            action: 'corrected'
                        };
                    }
                    // If forceTransfer, fall through to Scenario B
                }
                
                // Scenario B: Regular Transfer (Auto-close old)
                isAutomatedTransfer = true;
                await assignmentService.close(existing.id, data.start_date, 'transferred');
                auditAction = 'TRANSFER_PASTOR';
            }
        }

        // Execute standard Save
        if (data.id) {
            if (data.event_type === 'Correction / Update') auditAction = 'CORRECT_ASSIGNMENT';
            await assignmentService.update(data.id, data, auditAction);
            events.emit(EventMap.ASSIGNMENT.UPDATED);
            return {
                success: true,
                message: 'Assignment record updated',
                action: 'updated'
            };
        } else {
            await assignmentService.create(data, auditAction);
            events.emit(EventMap.ASSIGNMENT.UPDATED);
            return {
                success: true,
                message: isAutomatedTransfer ? 'Pastor transferred successfully' : 'New assignment recorded',
                action: isAutomatedTransfer ? 'transferred' : 'created'
            };
        }
    }
}

export const assignmentDomain = new AssignmentDomain();
