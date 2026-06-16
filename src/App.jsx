import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { queueReport, getQueueCount, syncQueue } from './offlineQueue'
import { LANGUAGES, tr } from './translations'
import MapView from './MapView'
import Dashboard from './Dashboard'
import './App.css'
import { getContributorId, getBadge } from './contributor'

const INFRA = ['Residential', 'Commercial', 'Government', 'Utility', 'Transport', 'Community', 'Public space', 'Other']
const CRISIS = ['Earthquake', 'Flood', 'Tsunami', 'Hurricane/Cyclone', 'Wildfire', 'Explosion', 'Chemical', 'Conflict', 'Civil unrest']
function detectLanguage() {
  const supported = ['en', 'ar', 'zh', 'fr', 'ru', 'es']
  const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return supported.includes(browserLang) ? browserLang : 'en'
}
function App() {
  const [lang, setLang] = useState(detectLanguage())
  const [view, setView] = useState('report')
  const [count, setCount] = useState(0)
  const [myReports, setMyReports] = useState(0)
  const [myConfirmed, setMyConfirmed] = useState(0)
  const [queued, setQueued] = useState(getQueueCount())
  const [online, setOnline] = useState(navigator.onLine)
  const [status, setStatus] = useState('')
  const [photo, setPhoto] = useState(null)
  const [coords, setCoords] = useState(null)
  const [damage, setDamage] = useState('')
  const [infra, setInfra] = useState('')
  const [crisis, setCrisis] = useState('')
  const [debris, setDebris] = useState(false)
  const [description, setDescription] = useState('')
  const [landmark, setLandmark] = useState('')
  const [gpsFailed, setGpsFailed] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const dir = LANGUAGES[lang].dir
  const t = (key) => tr(key, lang)

  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [dir, lang])

  async function loadCount() {
    const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true })
    setCount(count || 0)
  }
  async function loadMyStats() {
    const cid = getContributorId()
    const { data } = await supabase.from('reports').select('building_id').eq('contributor_id', cid)
    setMyReports(data?.length || 0)
    // confirmed = reports whose building has more than 1 report (corroborated by others)
    const buildingIds = [...new Set((data || []).map(r => r.building_id).filter(Boolean))]
    if (buildingIds.length) {
      const { data: bs } = await supabase.from('buildings').select('report_count').in('id', buildingIds)
      setMyConfirmed((bs || []).filter(b => b.report_count > 1).length)
    }
  }
  useEffect(() => { loadCount(); loadMyStats() }, [])

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
    setStatus('...')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsFailed(false); setStatus('✓') },
      () => { setGpsFailed(true); setStatus('') }
    )
  }
async function handlePhoto(file) {
    setPhoto(file)
    setAiSuggestion(null)
    if (!file || !navigator.onLine) return
    setAiThinking(true)
    try {
      const fileName = `${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('photos').upload(fileName, file)
      if (!error) {
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
        setPhotoUrl(data.publicUrl)
        const res = await fetch('https://guipfbivtvhbzkxjmkeu.supabase.co/functions/v1/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: data.publicUrl }),
        })
        const result = await res.json()
        if (result.suggestion) {
          setAiSuggestion(result.suggestion)
          setDamage(result.suggestion) // pre-select, user can change
        }
      }
    } catch (e) { /* AI is assistive — fail silently */ }
    setAiThinking(false)
  }
  async function submit() {
    if (!damage) { setStatus(t('damageLevel')); return }
    if (!infra) { setStatus(t('infraType')); return }
    setStatus('...')

    let finalPhotoUrl = photoUrl
    if (photo && !photoUrl && navigator.onLine) {
      const fileName = `${Date.now()}-${photo.name}`
      const { error: upErr } = await supabase.storage.from('photos').upload(fileName, photo)
      if (!upErr) {
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const report = {
      damage_level: damage, infrastructure_type: infra, crisis_type: crisis,
      has_debris: debris, latitude: coords?.lat, longitude: coords?.lng, photo_url: finalPhotoUrl, language: lang,
      description: description, landmark: landmark, contributor_id: getContributorId(),
    }
    

    if (!navigator.onLine) {
      queueReport(report)
      setQueued(getQueueCount())
      setStatus(t('offline'))
    } else {
      const { error } = await supabase.from('reports').insert(report)
      if (error) { setStatus('Error: ' + error.message); return }
      setStatus('✓ ' + t('submit'))
      loadCount(); loadMyStats()
    }
    setDamage(''); setInfra(''); setCrisis(''); setDebris(false); setPhoto(null); setCoords(null)
    setDescription(''); setLandmark(''); setGpsFailed(false)
    setAiSuggestion(null); setPhotoUrl(null)
  }

  return (
    <div className="app" dir={dir}>
      <header className="header">
        <div className="header-row">
          <div>
            <h1>{t('appTitle')}</h1>
            <p>{t('tagline')}</p>
          </div>
          <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.entries(LANGUAGES).map(([code, { name }]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      </header>
      <div className="badge-bar">
        <span className="badge-icon">{getBadge(myReports, myConfirmed).icon}</span>
        <div>
          <div className="badge-name">{getBadge(myReports, myConfirmed).name}</div>
          <div className="badge-sub">{myReports} reports · {myConfirmed} confirmed by others</div>
        </div>
      </div>
      <nav className="tabs">
        <button className={`tab ${view==='report'?'active':''}`} onClick={() => setView('report')}>{t('report')}</button>
        <button className={`tab ${view==='dashboard'?'active':''}`} onClick={() => setView('dashboard')}>{t('dashboard')}</button>
      </nav>

      {view === 'report' ? (
        <main className="main">
          <h2>{t('reportDamage')}</h2>

          <label className="field-label">{t('photo')}</label>
          <input type="file" accept="image/*" capture="environment"
            onChange={(e) => handlePhoto(e.target.files[0])} className="file-input" />
          {photo && <p className="hint">✓ {photo.name}</p>}
          {aiThinking && <p className="ai-hint">🔍 Analyzing photo...</p>}
          {aiSuggestion && <p className="ai-hint">🤖 AI suggests: <strong>{t(aiSuggestion)}</strong> — confirm or change below.</p>}

          <label className="field-label">{t('location')}</label>
          <button className="secondary-btn" onClick={getLocation}>{t('captureLocation')}</button>
          {coords && <p className="hint">✓ {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
          {gpsFailed && (
            <>
              <p className="map-hint" style={{ color: 'var(--partial)', marginTop: '8px' }}>{t('gpsFail')}</p>
              <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
                placeholder={t('landmarkPlaceholder')} className="select" style={{ marginTop: '8px' }} />
            </>
          )}

          <label className="field-label">{t('damageLevel')}</label>
          <div className="damage-grid">
            <button className={`damage minimal ${damage==='minimal'?'sel':''}`} onClick={() => setDamage('minimal')}>{t('minimal')}</button>
            <button className={`damage partial ${damage==='partial'?'sel':''}`} onClick={() => setDamage('partial')}>{t('partial')}</button>
            <button className={`damage destroyed ${damage==='destroyed'?'sel':''}`} onClick={() => setDamage('destroyed')}>{t('destroyed')}</button>
          </div>

          <label className="field-label">{t('infraType')}</label>
          <select value={infra} onChange={(e) => setInfra(e.target.value)} className="select">
            <option value="">{t('select')}</option>
            {INFRA.map(i => <option key={i} value={i}>{i}</option>)}
          </select>

          <label className="field-label">{t('crisisType')}</label>
          <select value={crisis} onChange={(e) => setCrisis(e.target.value)} className="select">
            <option value="">{t('select')}</option>
            {CRISIS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="field-label">{t('descriptionLabel')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')} className="select" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />

          <button className="submit-btn" onClick={submit}>{t('submit')}</button>

          <p className="status">{status}</p>
          <p className="queue-status">
            {online ? '● ' + t('online') : '○ ' + t('offline')}{queued > 0 ? ` — ${queued}` : ''}
          </p>

          <h2 style={{ marginTop: '32px' }}>{t('nearby')}</h2>
          <p className="map-hint">{t('nearbyHint')}</p>
          <MapView />
        </main>
      ) : (
        <Dashboard lang={lang} />
      )}
    </div>
  )
}

export default App