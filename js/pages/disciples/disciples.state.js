/**
 * Disciples Page - State Management
 */
import { discipleService } from '../../services/disciple.service.js';
import { churchService } from '../../services/church.service.js';
import { districtService } from '../../services/district.service.js';
import { pastorService } from '../../services/pastor.service.js';

export class DisciplesState {
    constructor() {
        this.allDisciples = [];
        this.filteredDisciples = [];
        this.churches = [];
        this.districts = [];
        this.pastors = [];

        this.currentPage = 1;
        this.itemsPerPage = 20;

        // Current filters
        this.filters = {
            query: '',
            districtId: '',
            pastorId: ''
        };
    }

    /**
     * Initial data load
     */
    async loadData() {
        const [disciples, churches, districts, pastors] = await Promise.all([
            discipleService.fetchAll(),
            churchService.fetchAll(),
            districtService.fetchAll(),
            pastorService.fetchAll()
        ]);

        this.allDisciples = (disciples || []).sort((a, b) => a.full_name.localeCompare(b.full_name));
        this.churches = (churches || []).sort((a, b) => a.church_name.localeCompare(b.church_name));
        this.districts = (districts || []).sort((a, b) => a.district_name.localeCompare(b.district_name));
        this.pastors = (pastors || []).sort((a, b) => a.full_name.localeCompare(b.full_name));

        this.applyFilters(this.filters);
        
        return { disciples, churches, districts, pastors };
    }

    /**
     * Filtering Logic
     */
    applyFilters(newFilters = {}) {
        this.filters = { ...this.filters, ...newFilters };
        const { query, districtId, pastorId } = this.filters;
        const q = query.toLowerCase().trim();

        this.filteredDisciples = this.allDisciples.filter(d => {
            const matchesSearch = !q || 
                (d.full_name || '').toLowerCase().includes(q) || 
                (d.church_name || '').toLowerCase().includes(q) || 
                (d.district_name || '').toLowerCase().includes(q);
            
            const matchesDistrict = !districtId || String(d.district_id) === String(districtId);

            let matchesPastor = true;
            if (pastorId) {
                const pastor = this.pastors.find(p => String(p.id) === String(pastorId));
                // A disciple matches a pastor if they belong to the same church
                matchesPastor = pastor && String(d.church_id) === String(pastor.church_id);
            }

            return matchesSearch && matchesDistrict && matchesPastor;
        });

        this.currentPage = 1;
        return this.filteredDisciples;
    }

    /**
     * Pagination Helper
     */
    getPaginatedData() {
        const total = this.filteredDisciples.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        
        if (this.currentPage > totalPages) this.currentPage = totalPages || 1;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, total);

        return {
            items: this.filteredDisciples.slice(start, end),
            total,
            totalPages,
            start,
            end
        };
    }
}
