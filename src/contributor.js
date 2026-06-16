// lightweight anonymous contributor identity, stored on device
export function getContributorId() {
  let id = localStorage.getItem('gt_contributor')
  if (!id) {
    id = 'c_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('gt_contributor', id)
  }
  return id
}

export function getBadge(reportCount, confirmedCount) {
  if (confirmedCount >= 10) return { name: 'Community Guardian', icon: '🛡️', level: 4 }
  if (confirmedCount >= 5) return { name: 'Trusted Reporter', icon: '⭐', level: 3 }
  if (reportCount >= 3) return { name: 'Active Contributor', icon: '📍', level: 2 }
  if (reportCount >= 1) return { name: 'First Responder', icon: '🌱', level: 1 }
  return { name: 'New', icon: '👋', level: 0 }
}