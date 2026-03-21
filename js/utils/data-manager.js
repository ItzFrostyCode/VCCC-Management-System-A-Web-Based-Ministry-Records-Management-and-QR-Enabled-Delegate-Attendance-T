/**
 * Utility to manage pre-defined District and Church data from JSON
 */
const dataManager = {
  data: [],

  async load() {
    try {
      const resp = await fetch('../js/data/district_church.json')
      this.data = await resp.json()
      return this.data
    } catch (err) {
      console.error('Failed to load district_church.json:', err)
      return []
    }
  },

  getDistricts() {
    return this.data.map(d => d.district)
  },

  getChurches(districtName) {
    const found = this.data.find(d => d.district === districtName)
    return found ? found.churchname : []
  },

  /**
   * Helper to ensure District and Church exist in DB and return their IDs
   */
  async ensureDistrictAndChurch(districtName, churchName) {
    // 1. Get or Create District
    let distId
    const dists = await districtService.fetchAll()
    const existingDist = dists.find(d => d.name === districtName)
    
    if (existingDist) {
      distId = existingDist.id
    } else {
      const newDist = await districtService.create(districtName)
      distId = newDist.id
    }

    // 2. Get or Create Church
    let churchId
    const churches = await churchService.fetchAll()
    const existingChurch = churches.find(c => c.name === churchName && c.district_id === distId)

    if (existingChurch) {
      churchId = existingChurch.id
    } else {
      const newChurch = await churchService.create(churchName, distId)
      churchId = newChurch.id
    }

    return { distId, churchId }
  }
}
