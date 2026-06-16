import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { exportGeoJSON, exportCSV } from './exportData'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRef } from 'react'

const COLORS = { minimal: '#1d9e75', partial: '#ef9f27', destroyed: '#e24b4a' }
const CRISIS = ['Earthquake', 'Flood', 'Tsunami', 'Hurricane/Cyclone', 'Wildfire', 'Explosion', 'Chemical', 'Conflict', 'Civil unrest']

function Dashboard({ lang = 'en' }) {
  const [buildings, setBuildings] = useState([])
  const [reports, setReports] = useState([])
  const [damageFilter, setDamageFilter] = useState('all')
  const [crisisFilter, setCrisisFilter] = useState('all')
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  async function translateText(text, target = 'en') {
    try {
      const res = await fetch('https://guipfbivtvhbzkxjmkeu.supabase.co/functions/v1/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target }),
      })
      const data = await res.json()
      return data.translated || ''
    } catch { return '' }
  }

  async function load() {
    const { data } = await supabase.from('buildings').select('*').not('latitude', 'is', null)
    setBuildings(data || [])

    const { data: reps } = await supabase.from('reports')
      .select('*').not('description', 'is', null).neq('description', '')
      .order('created_at', { ascending: false }).limit(20)

    const withTranslation = await Promise.all((reps || []).map(async (r) => {
      if (r.language && r.language !== 'en' && r.description) {
        const translated = await translateText(r.description, 'en')
        return { ...r, description_en: translated }
      }
      return r
    }))
    setReports(withTranslation)
  }
  useEffect(() => { load() }, [])

  const filtered = buildings.filter(b =>
    (damageFilter === 'all' || b.current_damage_level === damageFilter)
  )

  const stats = {
    total: buildings.length,
    minimal: buildings.filter(b => b.current_damage_level === 'minimal').length,
    partial: buildings.filter(b => b.current_damage_level === 'partial').length,
    destroyed: buildings.filter(b => b.current_damage_level === 'destroyed').length,
    reports: buildings.reduce((s, b) => s + (b.report_count || 0), 0),
  }

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20], zoom: 1.5,
    })
    mapRef.current = map
    map.on('load', () => {
      filtered.forEach((b) => {
        const el = document.createElement('div')
        const size = 16 + Math.min(b.report_count * 3, 18)
        el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;background:${COLORS[b.current_damage_level] || '#888'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700`
        if (b.report_count > 1) el.textContent = b.report_count
        new maplibregl.Marker({ element: el }).setLngLat([b.longitude, b.latitude]).addTo(map)
      })
    })
    return () => map.remove()
  }, [buildings, damageFilter, crisisFilter])

  return (
    <main className="main">
      <h2>Coordinator dashboard</h2>

      <div className="stat-grid">
        <div className="stat"><span className="stat-num">{stats.total}</span><span className="stat-label">Buildings</span></div>
        <div className="stat"><span className="stat-num">{stats.reports}</span><span className="stat-label">Reports</span></div>
        <div className="stat minimal-stat"><span className="stat-num">{stats.minimal}</span><span className="stat-label">Minimal</span></div>
        <div className="stat partial-stat"><span className="stat-num">{stats.partial}</span><span className="stat-label">Partial</span></div>
        <div className="stat destroyed-stat"><span className="stat-num">{stats.destroyed}</span><span className="stat-label">Destroyed</span></div>
      </div>

      <label className="field-label">Filter by damage level</label>
      <select value={damageFilter} onChange={(e) => setDamageFilter(e.target.value)} className="select">
        <option value="all">All levels</option>
        <option value="minimal">Minimal</option>
        <option value="partial">Partial</option>
        <option value="destroyed">Destroyed</option>
      </select>

      <div ref={containerRef} style={{ width: '100%', height: '380px', borderRadius: '16px', overflow: 'hidden', marginTop: '20px' }} />

      <div className="export-row">
        <button className="secondary-btn" onClick={exportGeoJSON}>Export GeoJSON</button>
        <button className="secondary-btn" onClick={exportCSV}>Export CSV</button>
      </div>
      {reports.length > 0 && (
        <>
          <h2 style={{ marginTop: '32px' }}>Recent descriptions</h2>
          <div className="report-list">
            {reports.map((r) => (
              <div key={r.id} className="report-card">
                <span className={`badge ${r.damage_level}`}>{r.damage_level}</span>
                <p className="report-desc">{r.description}</p>
                {r.description_en && r.description_en !== r.description && (
                  <p className="report-trans">🌐 {r.description_en}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}

export default Dashboard