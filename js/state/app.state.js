/**
 * App State
 * Canonical data cache for core application entities.
 * Acts as the single source of truth to avoid redundant API hits.
 */
import { EventMap } from '../utils/events.map.js';
import { events } from '../utils/events.js';

import { pastorService } from '../services/pastor.service.js';
import { churchService } from '../services/church.service.js';
import { districtService } from '../services/district.service.js';
import { assignmentService } from '../services/assignment.service.js';

class AppState {
    constructor() {
        this.pastors = [];
        this.churches = [];
        this.districts = [];
        this.assignments = [];
        this.isLoaded = false;
        
        // Listen for domain events for targeted refresh
        events.on(EventMap.PASTOR.UPDATED, () => this.refreshPastors());
        events.on(EventMap.CHURCH.UPDATED, () => this.refreshChurches());
        events.on(EventMap.DISTRICT.UPDATED, () => this.refreshDistricts());
        events.on(EventMap.ASSIGNMENT.UPDATED, () => this.refreshAssignments());
    }

    /**
     * Initial full load
     */
    async loadAll() {
        if (this.isLoaded) return;
        
        const [pastors, churches, districts, assignments] = await Promise.all([
            pastorService.fetchAll(),
            churchService.fetchAll(),
            districtService.fetchAll(),
            assignmentService.fetchAll()
        ]);

        this.pastors = pastors || [];
        this.churches = churches || [];
        this.districts = districts || [];
        this.assignments = assignments || [];

        this.isLoaded = true;
        events.emit(EventMap.APP.STATE_READY);
    }

    // Targeted Refreshes
    async refreshPastors() {
        this.pastors = await pastorService.fetchAll() || [];
        events.emit(EventMap.APP.STATE_UPDATED, { entity: 'pastors' });
    }

    async refreshChurches() {
        this.churches = await churchService.fetchAll() || [];
        events.emit(EventMap.APP.STATE_UPDATED, { entity: 'churches' });
    }

    async refreshDistricts() {
        this.districts = await districtService.fetchAll() || [];
        events.emit(EventMap.APP.STATE_UPDATED, { entity: 'districts' });
    }

    async refreshAssignments() {
        this.assignments = await assignmentService.fetchAll() || [];
        events.emit(EventMap.APP.STATE_UPDATED, { entity: 'assignments' });
    }
}

export const appState = new AppState();
