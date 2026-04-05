/**
 * Assignments Page - State Management (View Model)
 */
import { appState } from '../../state/app.state.js';

export class AssignmentsState {
    constructor() {
        this.filteredAssignments = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;

        // Current filters
        this.filters = {
            query: '',
            roleCode: '',
            statusCode: ''
        };
    }

    // Getters for Canonical Data
    get allAssignments() { return appState.assignments; }
    get pastors() { return appState.pastors; }
    get churches() { return appState.churches; }

    /**
     * Sync with global state
     */
    async loadData() {
        await appState.loadAll();
        this.applyFilters(this.filters);
        
        return { 
            assignments: this.allAssignments, 
            pastors: this.pastors, 
            churches: this.churches 
        };
    }

    /**
     * Filtering Logic
     */
    applyFilters(newFilters = {}) {
        this.filters = { ...this.filters, ...newFilters };
        const { query, roleCode, statusCode } = this.filters;
        const q = query.toLowerCase().trim();

        this.filteredAssignments = this.allAssignments.filter(a => {
            const matchQ = !q || 
                (a.pastor_name || '').toLowerCase().includes(q) || 
                (a.church_name || '').toLowerCase().includes(q);
            
            const matchRole = !roleCode || a.role_code === roleCode;
            const matchStatus = !statusCode || a.status_code === statusCode;

            return matchQ && matchRole && matchStatus;
        });

        this.currentPage = 1;
        return this.filteredAssignments;
    }

    /**
     * Pagination Helper
     */
    getPaginatedData() {
        const total = this.filteredAssignments.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        
        if (this.currentPage > totalPages) this.currentPage = totalPages || 1;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, total);

        return {
            items: this.filteredAssignments.slice(start, end),
            total,
            totalPages,
            start,
            end
        };
    }
}
