import { supabase } from './supabaseClient'

export async function exportGeoJSON() {
  const { data } = await supabase.from('reports').select('*').not('latitude', 'is', null)
  const geojson = {
    type: 'FeatureCollection',
    features: (data || []).map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
      properties: {
        damage_level: r.damage_level,
        infrastructure_type: r.infrastructure_type,
        crisis_type: r.crisis_type,
        has_debris: r.has_debris,
        photo_url: r.photo_url,
        date: r.created_at,
      },
    })),
  }
  download(JSON.stringify(geojson, null, 2), 'groundtruth-reports.geojson', 'application/geo+json')
}

export async function exportCSV() {
  const { data } = await supabase.from('reports').select('*')
  const cols = ['created_at', 'damage_level', 'infrastructure_type', 'crisis_type', 'has_debris', 'latitude', 'longitude', 'photo_url']
  const header = cols.join(',')
  const rows = (data || []).map((r) => cols.map((c) => `"${r[c] ?? ''}"`).join(','))
  download([header, ...rows].join('\n'), 'groundtruth-reports.csv', 'text/csv')
}

function download(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}