/**
 * Churches Page - State Management
 */
import { churchService } from '../../services/church.service.js';
import { districtService } from '../../services/district.service.js';
import { pastorService } from '../../services/pastor.service.js';
import { assignmentService } from '../../services/assignment.service.js';

export class ChurchesState {
    constructor() {
        this.allChurches = [];
        this.filteredChurches = [];
        this.districts = [];
        this.pastors = [];
        this.assignments = [];
        
        this.currentPage = 1;
        this.itemsPerPage = 10;
    }

    /**
     * Initial data load
     */
    async loadData() {
        try {
            const [churches, districts, pastors, assignments] = await Promise.all([
                churchService.fetchAll(),
                districtService.fetchAll(),
                pastorService.fetchAll(),
                assignmentService.fetchAll()
            ]);

            // Save raw data
            this.districts = districts || [];
            this.pastors = pastors || [];
            this.assignments = assignments || [];

            // Map churches safely to normalize field names for the View
            this.allChurches = (churches || []).map(c => {
                const district = this.districts.find(d => String(d.id) === String(c.district_id));
                
                // FIND CURRENT ACTIVE PASTOR from assignments
                const activeAssignment = this.assignments.find(a => 
                    String(a.church_id) === String(c.id) && 
                    a.status_code === 'active' && 
                    !a.end_date
                );

                const current_pastor_name = activeAssignment ? 
                    (this.pastors.find(p => String(p.id) === String(activeAssignment.pastor_id))?.full_name || 'Assigned') 
                    : '—';

                return {
                    ...c,
                    church_name: c.church_name || 'Unknown Church',
                    church_address: c.church_address || c.address || '—',
                    district_name: c.district_name || district?.district_name || '—',
                    current_pastor_name: current_pastor_name, // REAL CURRENT PASTOR
                    pioneer_pastor_name: c.pioneer_pastor_name || c.pioneer_name || '—',
                    church_scope: c.church_scope || c.location_type || 'local'
                };
            });

            this.applyFilters({}); // Reset filter state
            return { churches: this.allChurches, districts, pastors, assignments };
            
        } catch (err) {
            console.error('State Load Failed:', err);
            throw err;
        }
    }

    /**
     * Get specific data for detail view
     */
    getChurchContext(churchId) {
        const church = this.allChurches.find(c => String(c.id) === String(churchId));
        if (!church) return null;

        const history = this.assignments.filter(a => String(a.church_id) === String(churchId))
            .map(a => {
                const p = this.pastors.find(pastor => String(pastor.id) === String(a.pastor_id));
                return {
                    ...a,
                    pastor_name: p ? p.full_name : 'Unknown Pastor'
                };
            })
            .sort((a,b) => new Date(b.start_date) - new Date(a.start_date));

        const offspring = this.allChurches.filter(c => String(c.mother_church_id) === String(churchId));

        return { church, history, offspring };
    }

    /**
     * Filtering Logic
     */
    applyFilters({ query = '', districtId = '', scope = '' }) {
        const q = query.toLowerCase().trim();

        this.filteredChurches = this.allChurches.filter(c => {
            const matchesSearch = !q ||
                (c.church_name || '').toLowerCase().includes(q) ||
                (c.church_address || '').toLowerCase().includes(q) ||
                (c.district_name || '').toLowerCase().includes(q) ||
                (c.current_pastor_name || '').toLowerCase().includes(q);

            const matchesDistrict = !districtId || String(c.district_id) === String(districtId);
            const matchesScope = !scope || (c.church_scope || 'local') === scope;

            return matchesSearch && matchesDistrict && matchesScope;
        });

        this.currentPage = 1;
        return this.filteredChurches;
    }

    /**
     * Pagination Helper
     */
    getPaginatedData() {
        const total = this.filteredChurches.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        
        if (this.currentPage > totalPages) this.currentPage = totalPages || 1;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;

        return {
            items: this.filteredChurches.slice(start, end),
            total,
            totalPages,
            start,
            end
        };
    }
}
