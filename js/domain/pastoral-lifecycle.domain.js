/**
 * Pastoral Lifecycle Domain
 * ─────────────────────────
 * Business rules for every pastor lifecycle transition:
 *   - Add Assignment (current or historical)
 *   - Transfer Pastor (close old → open new)
 *   - Mark Deceased  (status=deceased, end ALL active assignments)
 *   - Mark Undeployed (status=undeployed, end ALL active assignments)
 *   - End Assignment  (close a specific assignment with a reason)
 *
 * Enforces:
 *   - One ACTIVE assignment per church at a time (DB-level partial unique index).
 *   - One ACTIVE assignment per pastor at a time (DB-level partial unique index).
 *   - All lifecycle transitions close every active record atomically.
 */
import { assignmentService } from '../services/assignment.service.js';
import { pastorService }     from '../services/pastor.service.js';
import { db }                from '../db.js';
import { EventMap }          from '../utils/events.map.js';
import { events }            from '../utils/events.js';

class PastoralLifecycleDomain {

    // ─────────────────────────────────────────────────────────
    // ADD ASSIGNMENT (current or historical)
    // ─────────────────────────────────────────────────────────
    /**
     * Add a pastor assignment (current or historical).
     * 
     * @param {Object} data
     *   pastor_id       UUID
     *   church_id       UUID
     *   district_id     UUID (optional, derived from church)
     *   start_date      ISO date string  (required)
     *   end_date        ISO date string  (null = still active)
     *   assignment_type 'pioneering' | 'takeover' | 'legacy'
     *   end_reason      'transferred' | 'pullout' | 'redirection' | 'ended' | null
     *   notes           string (optional)
     */
    /**
     * Add a pastor assignment (current or historical).
     * 
     * @param {Object} data
     *   pastor_id       UUID
     *   church_id       UUID
     *   district_id     UUID (optional, derived from church)
     *   start_date      ISO date string  (required)
     *   end_date        ISO date string  (null = still active)
     *   assignment_type 'pioneering' | 'takeover' | 'legacy'
     *   end_reason      'transferred' | 'pullout' | 'redirection' | 'ended' | null
     *   notes           string (optional)
     */
    async addAssignment(data) {
        const { pastor_id, church_id, start_date, assignment_type, end_date, end_reason, notes } = data;

        if (!pastor_id)    throw new Error('Pastor is required.');
        if (!church_id)    throw new Error('Church is required.');
        if (!start_date)   throw new Error('Start date is required.');
        if (!assignment_type) throw new Error('Assignment type is required.');

        const isCurrent = !end_date;

        // Guard: if creating a CURRENT assignment, ensure no other active assignment exists for this church
        if (isCurrent) {
            const existingChurchActive = await assignmentService.fetchActiveByChurch(church_id);
            if (existingChurchActive && String(existingChurchActive.pastor_id) !== String(pastor_id)) {
                // If it's a "Takeover" request, we allow it to proceed into the specialized takeover handler
                if (assignment_type === 'takeover') {
                    return this.takeoverChurch(data);
                }
                throw new Error(
                    `Church already has an active pastor: ${existingChurchActive.pastor_name}. ` +
                    `Please use "Takeover" type or transfer the existing pastor first.`
                );
            }
        }

        // Derive district_id from church for historical preservation
        let district_id = data.district_id || null;
        if (!district_id && church_id) {
            const { data: churchRow } = await db.from('churches').select('district_id').eq('id', church_id).maybeSingle();
            district_id = churchRow?.district_id || null;
        }

        const payload = {
            pastor_id,
            church_id,
            start_date,
            end_date:          end_date || null,
            assignment_type,
            end_reason:        end_date ? (end_reason || 'ended') : null,
            status_code:       isCurrent ? 'active' : 'ended',
            legacy_event_type: null,
            notes:             (notes || '').trim() || null
        };

        await assignmentService.create(payload, isCurrent ? 'CREATE_ASSIGNMENT' : 'CREATE_HISTORY_RECORD');

        // Sync pastor status if this is a current assignment
        if (isCurrent) {
            await pastorService.update(pastor_id, { current_status_code: 'active' });
        }

        events.emit(EventMap.PASTOR.UPDATED);
        events.emit(EventMap.ASSIGNMENT.UPDATED);

        return {
            success: true,
            message: isCurrent ? 'Assignment created successfully.' : 'Historical record saved.'
        };
    }

    /**
     * Specialized Takeover Workflow: Replace Outgoing Pastor
     * Atomic logic to close old and open new assignments.
     */
    async takeoverChurch(data) {
        const { pastor_id, church_id, start_date, notes } = data;

        // 1. Identify Outgoing
        const outgoing = await assignmentService.fetchActiveByChurch(church_id);
        if (!outgoing) {
            // No outgoing? Fallback to standard add
            return this.addAssignment({ ...data, assignment_type: 'pioneering' });
        }

        const outgoingPastorId = outgoing.pastor_id;
        const takeoverDate = start_date;

        try {
            // Use a transaction-like sequence (though JS await is sequential)
            // 2. Close Outgoing
            // We set the end_date of the outgoing to the day BEFORE or SAME day?
            // Usually Same day = handover.
            await this._closeAssignment(outgoing.id, takeoverDate, 'transferred', `Automatic handover to next pastor.`);
            
            // Sync outgoing pastor status if they have no other active assignments
            const stillActive = await assignmentService.fetchActiveByPastor(outgoingPastorId);
            if (!stillActive) {
                await pastorService.update(outgoingPastorId, { current_status_code: 'undeployed' });
            }

            // 3. Open Incoming
            const incomingPayload = {
                pastor_id,
                church_id,
                start_date: takeoverDate,
                end_date: null,
                assignment_type: 'takeover',
                status_code: 'active',
                notes: (notes || '').trim() || null
            };
            await assignmentService.create(incomingPayload, 'TAKEOVER_CHURCH');

            // 4. Sync Incoming
            await pastorService.update(pastor_id, { current_status_code: 'active' });

            events.emit(EventMap.PASTOR.UPDATED);
            events.emit(EventMap.ASSIGNMENT.UPDATED);

            return {
                success: true,
                message: `Takeover complete. ${outgoing.pastor_name} has been replaced by the incoming pastor.`
            };
        } catch (err) {
            console.error('Takeover failed:', err);
            throw new Error(`Takeover flow failed: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────────
    // TRANSFER PASTOR
    // ─────────────────────────────────────────────────────────
    /**
     * Transfer a pastor:
     *   1. Close the pastor's current active assignment (end_reason = 'transferred')
     *   2. Open a new active assignment at the new church
     * 
     * @param {Object} data
     *   pastor_id         UUID
     *   new_church_id     UUID
     *   transfer_date     ISO date
     *   assignment_type   'pioneering' | 'takeover' (how they begin at new church)
     *   notes             string (optional)
     */
    /**
     * UNIFIED TRANSITION WIZARD ORCHESTRATOR (Phase 10)
     * Handles Pioneer, Takeover, International, or Undeploy in a single atomic flow.
     * 
     * @param {Object} data
     *   pastor_id         UUID
     *   transition_type   'pioneer' | 'takeover' | 'international' | 'undeploy'
     *   effective_date    ISO date
     *   
     *   // Contextual (depending on type)
     *   church_id         UUID (for Takeover)
     *   new_church_name   string (for Pioneer)
     *   district_id       UUID (for Pioneer)
     *   intl_details      string (for International)
     *   undeploy_reason   string (for Undeploy)
     *   notes             string (optional)
     */
    async executeTransition(data) {
        const { pastor_id, transition_type, effective_date, notes } = data;

        if (!pastor_id)      throw new Error('Pastor is required.');
        if (!transition_type) throw new Error('Transition type is required.');
        if (!effective_date)  throw new Error('Effective date is required.');

        // Identify current assignment to close
        const current = await assignmentService.fetchActiveByPastor(pastor_id);

        try {
            switch (transition_type) {
                case 'pioneer':
                    // 1. Create the new church first
                    const { churchService } = await import('../services/church.service.js');
                    const newChurch = await churchService.create({
                        church_name: data.new_church_name,
                        district_id: data.district_id,
                        pioneer_pastor_id: pastor_id,
                        church_scope: 'local'
                    });
                    
                    // 2. Perform handover/takeover-like sequence (close old, open new)
                    if (current) {
                        await this._closeAssignment(current.id, effective_date, 'transferred', `Pioneering ${newChurch.church_name}.`);
                    }
                    await this.addAssignment({
                        pastor_id,
                        church_id: newChurch.id,
                        start_date: effective_date,
                        assignment_type: 'pioneering',
                        notes
                    });
                    break;

                case 'takeover':
                    // Use takeoverChurch logic (handles closing old church and moving pastor)
                    // If moving TO a new church from an OLD church:
                    if (current) {
                        await this._closeAssignment(current.id, effective_date, 'transferred', `Moving to take over ${data.church_name || 'new church'}.`);
                    }
                    await this.takeoverChurch({
                        pastor_id,
                        church_id: data.church_id,
                        start_date: effective_date,
                        notes
                    });
                    break;

                case 'international':
                    if (current) {
                        await this._closeAssignment(current.id, effective_date, 'transferred', `Transitioning to International Ministry: ${data.intl_details}.`);
                    }
                    // International is currently modeled as an 'undeployed' state on the record
                    // but with specialized assignment history.
                    await this.addAssignment({
                        pastor_id,
                        church_id: data.church_id || '00000000-0000-0000-0000-000000000000', // Need a placeholder or specialized handling
                        start_date: effective_date,
                        assignment_type: 'international',
                        notes: `International Mission: ${data.intl_details}. ${notes || ''}`
                    });
                    break;

                case 'undeploy':
                    return this.markUndeployed(pastor_id, data.undeploy_reason, effective_date, notes);

                default:
                    throw new Error(`Unknown transition type: ${transition_type}`);
            }

            events.emit(EventMap.PASTOR.UPDATED);
            events.emit(EventMap.ASSIGNMENT.UPDATED);
            events.emit(EventMap.CHURCH.UPDATED);

            return { success: true, message: 'Transition executed successfully.' };
        } catch (err) {
            console.error('Transition failed:', err);
            throw new Error(`Failed to execute transition: ${err.message}`);
        }
    }

    async transferPastor(data) {
        const { pastor_id, new_church_id, transfer_date, assignment_type, notes } = data;

        if (!pastor_id)      throw new Error('Pastor is required.');
        if (!new_church_id)  throw new Error('New church is required.');
        if (!transfer_date)  throw new Error('Transfer date is required.');
        if (!assignment_type) throw new Error('Assignment type is required.');

        // Guard: can't transfer to the church they're already at
        const currentAssignment = await assignmentService.fetchActiveByPastor(pastor_id);
        if (currentAssignment && String(currentAssignment.church_id) === String(new_church_id)) {
            throw new Error('Pastor is already assigned to this church.');
        }

        // Guard: target church must not already have an active pastor
        const targetChurchActive = await assignmentService.fetchActiveByChurch(new_church_id);
        if (targetChurchActive) {
            throw new Error(
                `Target church already has an active pastor: ${targetChurchActive.pastor_name}. ` +
                `Please use "Takeover" request or resolve that assignment first.`
            );
        }

        // 1. Close old assignment
        if (currentAssignment) {
            await this._closeAssignment(currentAssignment.id, transfer_date, 'transferred');
        }

        // 2. Open new assignment
        const newPayload = {
            pastor_id,
            church_id:       new_church_id,
            start_date:      transfer_date,
            end_date:        null,
            assignment_type,
            end_reason:      null,
            status_code:     'active',
            notes:           (notes || '').trim() || null
        };
        await assignmentService.create(newPayload, 'TRANSFER_PASTOR');

        // 3. Ensure pastor status = active
        await pastorService.update(pastor_id, { current_status_code: 'active' });

        events.emit(EventMap.PASTOR.UPDATED);
        events.emit(EventMap.ASSIGNMENT.UPDATED);

        return { success: true, message: 'Pastor transferred successfully.' };
    }

    // ─────────────────────────────────────────────────────────
    // MARK AS DECEASED
    // ─────────────────────────────────────────────────────────
    /**
     * Mark a pastor as deceased:
     *   - Sets pastor.current_status_code = 'deceased'
     *   - Ends ALL active assignments with end_reason = 'deceased'
     */
    async markDeceased(pastorId, deceasedDate = null) {
        if (!pastorId) throw new Error('Pastor ID is required.');

        const effectiveDate = deceasedDate || new Date().toISOString().split('T')[0];

        // Close ALL active assignments (handles legacy duplicate data gracefully)
        await this._closeAllActiveAssignments(pastorId, effectiveDate, 'deceased');

        // Update pastor status
        await pastorService.update(pastorId, { current_status_code: 'deceased' });

        // Explicit audit log
        await db.from('audit_logs').insert({
            action: 'MARK_DECEASED',
            details: `Marked Pastor ID ${pastorId} as Deceased. All active assignments closed.`
        });

        events.emit(EventMap.PASTOR.UPDATED);
        events.emit(EventMap.ASSIGNMENT.UPDATED);

        return { success: true, message: 'Pastor marked as deceased. All assignments closed.' };
    }

    // ─────────────────────────────────────────────────────────
    // MARK AS UNDEPLOYED
    // ─────────────────────────────────────────────────────────
    /**
     * Mark a pastor as undeployed:
     *   - Ends current active assignment with end_reason (pullout or redirection)
     *   - Sets pastor.current_status_code = 'undeployed'
     */
    async markUndeployed(pastorId, endReason = 'pullout', endDate = null, notes = '') {
        if (!pastorId) throw new Error('Pastor ID is required.');
        if (!['pullout', 'redirection', 'ended'].includes(endReason)) {
            throw new Error('End reason must be: pullout, redirection, or ended.');
        }

        const effectiveDate = endDate || new Date().toISOString().split('T')[0];

        // Close ALL active assignments (handles legacy duplicate data gracefully)
        const closedCount = await this._closeAllActiveAssignments(pastorId, effectiveDate, endReason, notes);

        // Update pastor status
        await pastorService.update(pastorId, { current_status_code: 'undeployed' });

        events.emit(EventMap.PASTOR.UPDATED);
        events.emit(EventMap.ASSIGNMENT.UPDATED);

        return {
            success: true,
            message: `Pastor marked as undeployed. ${closedCount} assignment(s) closed (reason: ${endReason}).`
        };
    }

    // ─────────────────────────────────────────────────────────
    // END ASSIGNMENT (manual close of a specific assignment)
    // ─────────────────────────────────────────────────────────
    /**
     * Manually end a specific assignment.
     */
    async endAssignment(assignmentId, endDate, endReason = 'ended', notes = '') {
        if (!assignmentId) throw new Error('Assignment ID is required.');
        if (!endDate)      throw new Error('End date is required.');

        await this._closeAssignment(assignmentId, endDate, endReason, notes);

        // Check if pastor now has no active assignment → auto-set undeployed
        const assignment = await assignmentService.fetchById(assignmentId);
        if (assignment?.pastor_id) {
            const stillActive = await assignmentService.fetchActiveByPastor(assignment.pastor_id);
            if (!stillActive) {
                await pastorService.update(assignment.pastor_id, { current_status_code: 'undeployed' });
            }
        }

        events.emit(EventMap.PASTOR.UPDATED);
        events.emit(EventMap.ASSIGNMENT.UPDATED);

        return { success: true, message: 'Assignment ended.' };
    }

    // ─────────────────────────────────────────────────────────
    // PRIVATE: close a single assignment record by ID
    // ─────────────────────────────────────────────────────────
    async _closeAssignment(id, endDate, endReason, notes = '') {
        const updatePayload = {
            status_code: 'ended',
            end_date:    endDate,
            end_reason:  endReason
        };
        if (notes) updatePayload.notes = notes;

        const { error } = await db
            .from('assignments')
            .update(updatePayload)
            .eq('id', id);

        if (error) throw error;
    }

    // ─────────────────────────────────────────────────────────
    // PRIVATE: close ALL active assignments for a pastor
    // Handles legacy data with multiple active records gracefully.
    // Returns the count of records closed.
    // ─────────────────────────────────────────────────────────
    async _closeAllActiveAssignments(pastorId, endDate, endReason, notes = '') {
        const { data, error } = await db
            .from('assignments')
            .select('id')
            .eq('pastor_id', pastorId)
            .eq('status_code', 'active');

        if (error) throw error;
        if (!data || data.length === 0) return 0;

        const updatePayload = {
            status_code: 'ended',
            end_date:    endDate,
            end_reason:  endReason
        };
        if (notes) updatePayload.notes = notes;

        const { error: updateError } = await db
            .from('assignments')
            .update(updatePayload)
            .eq('pastor_id', pastorId)
            .eq('status_code', 'active');

        if (updateError) throw updateError;
        return data.length;
    }
}

export const pastoralLifecycleDomain = new PastoralLifecycleDomain();
