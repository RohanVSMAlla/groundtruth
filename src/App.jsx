import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { exportGeoJSON, exportCSV } from './exportData'
import { queueReport, getQueueCount, syncQueue } from './offlineQueue'
import MapView from './MapView'
import Dashboard from './Dashboard'
import './App.css'

const INFRA = ['Residential', 'Commercial', 'Government', 'Utility', 'Transport', 'Community', 'Public space', 'Other']
const CRISIS = ['Earthquake', 'Flood', 'Tsunami', 'Hurricane/Cyclone', 'Wildfire', 'Explosion', 'Chemical', 'Conflict', 'Civil unrest']

function App() {
  const [view, setView] = useState('report')
  const [count, setCount] = useState(0)
  const [queued, setQueued] = useState(getQueueCount())
  const [online, setOnline] = useState(navigator.onLine)
  const [status, setStatus] = useState('')
  const [photo, setPhoto] = useState(null)
  const [coords, setCoords] = useState(null)
  const [damage, setDamage] = useState('')
  const [infra, setInfra] = useState('')
  const [crisis, setCrisis] = useState('')
  const [debris, setDebris] = useState(false)

  async function loadCount() {
    const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true })
    setCount(count || 0)
  }
  useEffect(() => { loadCount() }, [])

  useEffect(() => {
    async function handleOnline() {
      setOnline(true)
      const n = await syncQueue()
      if (n > 0) { setStatus(`Synced ${n} queued report(s)`); setQueued(getQueueCount()); loadCount() }
    }
    function handleOffline() { setOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  function getLocation() {
    setStatus('Getting location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('Location captured') },
      () => setStatus('Location unavailable — you can add a landmark instead')
    )
  }

  async function submit() {
    if (!damage) { setStatus('Pick a damage level'); return }
    if (!infra) { setStatus('Pick an infrastructure type'); return }
    setStatus('Saving...')

    let photoUrl = null
    if (photo && navigator.onLine) {
      const fileName = `${Date.now()}-${photo.name}`
      const { error: upErr } = await supabase.storage.from('photos').upload(fileName, photo)
      if (!upErr) {
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const report = {
      damage_level: damage, infrastructure_type: infra, crisis_type: crisis,
      has_debris: debris, latitude: coords?.lat, longitude: coords?.lng, photo_url: photoUrl,
    }

    if (!navigator.onLine) {
      queueReport(report)
      setQueued(getQueueCount())
      setStatus('No internet — report queued, will send when online')
    } else {
      const { error } = await supabase.from('reports').insert(report)
      if (error) { setStatus('Error: ' + error.message); return }
      setStatus('Report submitted!')
      loadCount()
    }
    setDamage(''); setInfra(''); setCrisis(''); setDebris(false); setPhoto(null); setCoords(null)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>GroundTruth</h1>
        <p>Community crisis damage reporting</p>
      </header>

      <nav className="tabs">
        <button className={`tab ${view==='report'?'active':''}`} onClick={() => setView('report')}>Report</button>
        <button className={`tab ${view==='dashboard'?'active':''}`} onClick={() => setView('dashboard')}>Dashboard</button>
      </nav>

      {view === 'report' ? (
        <main className="main">
          <h2>Report damage</h2>

          <label className="field-label">1. Photo</label>
          <input type="file" accept="image/*" capture="environment"
            onChange={(e) => setPhoto(e.target.files[0])} className="file-input" />
          {photo && <p className="hint">✓ {photo.name}</p>}

          <label className="field-label">2. Location</label>
          <button className="secondary-btn" onClick={getLocation}>Capture my location</button>
          {coords && <p className="hint">✓ {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}

          <label className="field-label">3. Damage level</label>
          <div className="damage-grid">
            <button className={`damage minimal ${damage==='minimal'?'sel':''}`} onClick={() => setDamage('minimal')}>Minimal</button>
            <button className={`damage partial ${damage==='partial'?'sel':''}`} onClick={() => setDamage('partial')}>Partial</button>
            <button className={`damage destroyed ${damage==='destroyed'?'sel':''}`} onClick={() => setDamage('destroyed')}>Destroyed</button>
          </div>

          <label className="field-label">4. Infrastructure type</label>
          <select value={infra} onChange={(e) => setInfra(e.target.value)} className="select">
            <option value="">Select...</option>
            {INFRA.map(i => <option key={i} value={i}>{i}</option>)}
          </select>

          <label className="field-label">5. Crisis type</label>
          <select value={crisis} onChange={(e) => setCrisis(e.target.value)} className="select">
            <option value="">Select...</option>
            {CRISIS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="checkbox-row">
            <input type="checkbox" checked={debris} onChange={(e) => setDebris(e.target.checked)} />
            Debris present at site
          </label>

          <button className="submit-btn" onClick={submit}>Submit report</button>

        <p className="status">{status}</p>
          <p className="queue-status">
            {online ? '● Online' : '○ Offline'}{queued > 0 ? ` — ${queued} report(s) waiting to sync` : ''}
          </p>

          <h2 style={{ marginTop: '32px' }}>Already reported nearby</h2>
          <p className="map-hint">Check the map before reporting to avoid duplicates.</p>
          <MapView />
        </main>  
      ) : (
        <Dashboard />
      )}
    </div>
  )
}

export default App