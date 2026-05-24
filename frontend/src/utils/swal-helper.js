/**
 * Generates a nicely formatted HTML summary from an object for SweetAlert2.
 * @param {Object} data - The form data object to display.
 * @param {Object} displayMap - Optional mapping of keys to human-readable labels.
 */
export const generateSummaryHtml = (data, displayMap = {}) => {
    let html = '<div class="text-left text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 max-h-[40vh] overflow-y-auto space-y-2 mt-4">';
    
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === '' || value === undefined) continue;
        
        // Skip hidden or technical keys
        if (['id', 'pastor_id', 'church_id', 'district_id', 'parent_id', 'record_status'].includes(key)) continue;

        const label = displayMap[key] || key.replace(/_/g, ' ').toUpperCase();
        html += `
            <div class="flex flex-col border-b border-gray-200/50 pb-2 last:border-0 last:pb-0">
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${label}</span>
                <span class="font-bold text-gray-900">${value}</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}
