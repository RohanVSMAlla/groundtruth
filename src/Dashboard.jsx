import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { exportGeoJSON, exportCSV } from './exportData'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const COLORS = { minimal: '#1d9e75', partial: '#ef9f27', destroyed: '#e24b4a' }

function Dashboard({ standalone = false }) {
  const [buildings, setBuildings] = useState([])
  const [reports, setReports] = useState([])
  const [damageFilter, setDamageFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [mapMode, setMapMode] = useState('pins')
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

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
      if (r.description) {
        const translated = await translateText(r.description, 'en')
        if (translated && translated.toLowerCase() !== r.description.toLowerCase()) {
          return { ...r, description_en: translated }
        }
      }
      return r
    }))
    setReports(withTranslation)
  }
  useEffect(() => { load() }, [])

  const countries = [...new Set(buildings.map(b => b.country).filter(Boolean))].sort()

  const filtered = buildings.filter(b =>
    (damageFilter === 'all' || b.current_damage_level === damageFilter) &&
    (countryFilter === 'all' || b.country === countryFilter)
  )

  const scoped = countryFilter === 'all' ? buildings : buildings.filter(b => b.country === countryFilter)
  const stats = {
    total: scoped.length,
    minimal: scoped.filter(b => b.current_damage_level === 'minimal').length,
    partial: scoped.filter(b => b.current_damage_level === 'partial').length,
    destroyed: scoped.filter(b => b.current_damage_level === 'destroyed').length,
    reports: scoped.reduce((s, b) => s + (b.report_count || 0), 0),
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20], zoom: 1.5,
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    function render() {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (map.getLayer('heat')) map.removeLayer('heat')
      if (map.getSource('reports')) map.removeSource('reports')

      if (mapMode === 'pins') {
        filtered.forEach((b) => {
          const el = document.createElement('div')
          const size = 16 + Math.min(b.report_count * 3, 18)
          el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;background:${COLORS[b.current_damage_level] || '#888'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700`
          if (b.report_count > 1) el.textContent = b.report_count
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([b.longitude, b.latitude])
            .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(
              `<strong>${b.current_damage_level}</strong><br/>${b.report_count} report(s)`
            ))
            .addTo(map)
          markersRef.current.push(marker)
        })
      } else {
        const features = filtered.map(b => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [b.longitude, b.latitude] },
          properties: { weight: b.report_count || 1 },
        }))
        map.addSource('reports', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        })
        map.addLayer({
          id: 'heat',
          type: 'heatmap',
          source: 'reports',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 1.2,
            'heatmap-radius': 30,
            'heatmap-opacity': 0.8,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,255,0)',
              0.2, 'rgba(29,158,117,0.6)',
              0.5, 'rgba(239,159,39,0.7)',
              1, 'rgba(226,75,74,0.9)',
            ],
          },
        })
      }
    }

    if (map.isStyleLoaded()) render()
    else map.once('load', render)
  }, [buildings, damageFilter, countryFilter, mapMode])

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <div>
            <h1>GroundTruth</h1>
            <p>Coordinator Dashboard — UNDP</p>
          </div>
        </div>
      </header>

      <main className="main">
        <h2>Coordinator dashboard</h2>

        <div className="stat-grid">
          <div className="stat"><span className="stat-num">{stats.total}</span><span className="stat-label">Buildings</span></div>
          <div className="stat"><span className="stat-num">{stats.reports}</span><span className="stat-label">Reports</span></div>
          <div className="stat minimal-stat"><span className="stat-num">{stats.minimal}</span><span className="stat-label">Minimal</span></div>
          <div className="stat partial-stat"><span className="stat-num">{stats.partial}</span><span className="stat-label">Partial</span></div>
          <div className="stat destroyed-stat"><span className="stat-num">{stats.destroyed}</span><span className="stat-label">Destroyed</span></div>
        </div>

        <label className="field-label">Filter by country</label>
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="select">
          <option value="all">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="field-label">Filter by damage level</label>
        <select value={damageFilter} onChange={(e) => setDamageFilter(e.target.value)} className="select">
          <option value="all">All levels</option>
          <option value="minimal">Minimal</option>
          <option value="partial">Partial</option>
          <option value="destroyed">Destroyed</option>
        </select>

        <div className="map-toggle">
          <button className={`toggle-btn ${mapMode === 'pins' ? 'active' : ''}`} onClick={() => setMapMode('pins')}>📍 Pins</button>
          <button className={`toggle-btn ${mapMode === 'heatmap' ? 'active' : ''}`} onClick={() => setMapMode('heatmap')}>🔥 Heatmap</button>
        </div>

        <div ref={containerRef} style={{ width: '100%', height: '380px', borderRadius: '16px', overflow: 'hidden', marginTop: '12px' }} />

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
    </div>
  )
}

export default Dashboard