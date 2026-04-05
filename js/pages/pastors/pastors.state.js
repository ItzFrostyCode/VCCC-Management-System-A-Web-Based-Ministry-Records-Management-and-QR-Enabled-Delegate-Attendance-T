/**
 * Pastors Page - State Management
 */
import { appState } from '../../state/app.state.js';

export class PastorsState {
    constructor() {
        this.filteredPastors = [];
        this.selectedIds = new Set();
        this.editingId = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.isMobile = window.innerWidth <= 1024;
        
        // Persistent Filters
        this.filters = {
            query: '',
            districtId: '',
            churchId: ''
        };
    }

    // Getters for Canonical Data
    get allPastors() { return appState.pastors; }
    get districtsData() { return appState.districts; }
    get churchesData() { return appState.churches; }

    /**
     * Initial data load
     */
    async loadData() {
        await appState.loadAll();
        
        this.applyFilters(this.filters);
        return { 
            districts: this.districtsData, 
            churches: this.churchesData, 
            pastors: this.allPastors 
        };
    }

    /**
     * Apply filtering logic
     */
    applyFilters(newFilters = {}) {
        this.filters = { ...this.filters, ...newFilters };
        const { query, districtId, churchId } = this.filters;
        const q = query.toLowerCase().trim();
        
        this.filteredPastors = this.allPastors.filter(p => {
            const matchesQuery = !q || 
                (p.full_name || '').toLowerCase().includes(q) ||
                (p.wife_name || '').toLowerCase().includes(q) ||
                (p.contact_number || '').toLowerCase().includes(q) ||
                (p.church_name || '').toLowerCase().includes(q);

            const matchesDist = !districtId || String(p.district_id) === String(districtId);
            const matchesChurch = !churchId || String(p.church_id) === String(churchId);

            return matchesQuery && matchesDist && matchesChurch;
        });

        this.currentPage = 1;
        return this.filteredPastors;
    }

    /**
     * Pagination Helper
     */
    getPaginatedData() {
        const totalPages = Math.ceil(this.filteredPastors.length / this.itemsPerPage);
        if (this.currentPage > totalPages) this.currentPage = totalPages || 1;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        
        return {
            items: this.filteredPastors.slice(start, end),
            total: this.filteredPastors.length,
            totalPages,
            start,
            end
        };
    }

    /**
     * Multi-select management
     */
    toggleSelection(id, force = null) {
        if (force === true) this.selectedIds.add(id);
        else if (force === false) this.selectedIds.delete(id);
        else {
            if (this.selectedIds.has(id)) this.selectedIds.delete(id);
            else this.selectedIds.add(id);
        }
    }

    clearSelection() {
        this.selectedIds.clear();
    }

    setPage(page) {
        this.currentPage = page;
    }
}
