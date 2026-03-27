// district-view.js

let allChurches = []
let allAssignments = []
let currentDistrict = null

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth()
        const urlParams = new URLSearchParams(window.location.search)
        const id = urlParams.get('id')
        if (!id) {
            window.location.href = 'district.html'
            return
        }
        await loadData(id)
        initListeners()
    } catch (e) {
        console.error('Init failed:', e)
        alert('Init failed: ' + e.message)
    }
})

async function loadData(id) {
    try {
        // Fetch district details, all churches, and all active assignments
        const [district, churches, assignments] = await Promise.all([
            districtService.fetchById(id),
            churchService.fetchAll(), // We'll filter this locally
            assignmentService.fetchAll()
        ])

        currentDistrict = district
        // Filter churches belonging to this district
        allChurches = churches.filter(c => c.district_id === id)
        // Active assignments only
        allAssignments = (assignments || []).filter(a => a.status_code === 'active' && !a.end_date)

        renderHeader()
        renderStats()
        renderList()

        document.getElementById('loading-state').style.display = 'none'
        document.getElementById('content-area').style.display = 'block'
    } catch (e) {
        console.error('Data load failed:', e)
        document.getElementById('loading-state').innerHTML = `
            <div style="color:var(--red); padding:40px;">
                <h3>Error Loading Dashboard</h3>
                <p>${e.message}</p>
                <button class="btn btn-ghost" onclick="location.reload()">Retry</button>
            </div>
        `
    }
}

function renderHeader() {
    const d = currentDistrict
    const hero = document.getElementById('district-hero')
    if (d.theme_color) {
        hero.style.background = d.theme_color
    }
    document.getElementById('d-name-hero').textContent = d.district_name
    document.getElementById('leader-name').textContent = d.leader_name || 'No leader assigned'
    document.getElementById('leader-avatar').textContent = (d.leader_name || '?')[0].toUpperCase()
    document.getElementById('d-notes').textContent = d.notes || ''
}

function renderStats() {
    const total = allChurches.length
    // A church is occupied if it has an active assignment
    const activeChurchIds = new Set(allAssignments.map(a => a.church_id))
    const occupied = allChurches.filter(c => activeChurchIds.has(c.id)).length
    const vacant = total - occupied
    const activePastors = allAssignments.filter(a => allChurches.some(c => c.id === a.church_id)).length

    document.getElementById('stat-total').textContent = total
    document.getElementById('stat-occupied').textContent = occupied
    document.getElementById('stat-vacant').textContent = vacant
    document.getElementById('stat-pastors').textContent = activePastors
}

function renderList() {
    const container = document.getElementById('church-list')
    const search = document.getElementById('search-input').value.toLowerCase().trim()
    const statusFilter = document.getElementById('filter-status').value

    const activeChurchMap = {}
    allAssignments.forEach(a => {
        activeChurchMap[a.church_id] = a.pastor_name
    })

    const filtered = allChurches.filter(c => {
        const pastor = activeChurchMap[c.id] || ''
        const matchesSearch = c.church_name.toLowerCase().includes(search) || pastor.toLowerCase().includes(search)
        
        const isOccupied = !!activeChurchMap[c.id]
        let matchesStatus = true
        if (statusFilter === 'occupied') matchesStatus = isOccupied
        if (statusFilter === 'vacant') matchesStatus = !isOccupied
        
        return matchesSearch && matchesStatus
    })

    if (!filtered.length) {
        container.innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-3); font-weight:500; background:var(--bg-input); border-radius:12px; border:2px dashed var(--border);">No churches found matching criteria.</div>`
        return
    }

    container.innerHTML = filtered.map(c => {
        const pastor = activeChurchMap[c.id]
        return `
            <div class="church-card" onclick="window.location.href='church-view.html?id=${c.id}'">
                <div class="church-info">
                    <div class="church-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </div>
                    <div>
                        <div class="church-name">${esc(c.church_name)}</div>
                        <div class="church-pastor">${pastor ? pastor : 'No active pastor'}</div>
                    </div>
                </div>
                <span class="status-badge ${pastor ? 'status-occupied' : 'status-vacant'}">
                    ${pastor ? 'Occupied' : 'Vacant'}
                </span>
            </div>
        `
    }).join('')
}

function initListeners() {
    document.getElementById('search-input').oninput = renderList
    document.getElementById('filter-status').onchange = renderList
}

function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
