/**
 * Pastor Domain Logic Layer
 * Orchestrates rules for pastor creation, updates, and validations.
 */
import { pastorService } from '../services/pastor.service.js';
import { EventMap } from '../utils/events.map.js';
import { events } from '../utils/events.js';

class PastorDomain {
    
    /**
     * Process saving of pastor data (create or update)
     * 
     * @param {Object} data - The pastor data payload
     * @param {string} id - The pastor ID (if updating)
     * @returns {Object} result
     */
    async processSave(data, id = null) {
        if (id) {
            const dataResult = await pastorService.update(id, data);
            events.emit(EventMap.PASTOR.UPDATED);
            return {
                success: true,
                message: 'Pastor updated successfully',
                action: 'updated',
                data: dataResult
            };
        } else {
            const dataResult = await pastorService.create(data);
            events.emit(EventMap.PASTOR.UPDATED);
            return {
                success: true,
                message: 'Pastor created successfully',
                action: 'created',
                data: dataResult
            };
        }
    }

    /**
     * Delete a pastor
     * @param {string} id
     */
    async processDelete(id) {
        if (!id) throw new Error('Pastor ID is required for deletion');

        await pastorService.remove(id);
        events.emit(EventMap.PASTOR.UPDATED);
        
        return {
            success: true,
            message: 'Pastor removed'
        };
    }
}

export const pastorDomain = new PastorDomain();
