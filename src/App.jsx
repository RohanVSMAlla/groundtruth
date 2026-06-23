import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { queueReport, getQueueCount, syncQueue } from './offlineQueue'
import { LANGUAGES, tr } from './translations'
import MapView from './MapView'
import './App.css'
import { getContributorId, getBadge } from './contributor'
import { coordsToWords, wordsToCoords } from './what3words'
import { getCountry } from './geocode'
const INFRA = ['Residential', 'Commercial', 'Government', 'Utility', 'Transport', 'Community', 'Public space', 'Other']
const CRISIS = ['Earthquake', 'Flood', 'Tsunami', 'Hurricane/Cyclone', 'Wildfire', 'Explosion', 'Chemical', 'Conflict', 'Civil unrest']
const SPEECH_LANG = { en: 'en-US', ar: 'ar-SA', zh: 'zh-CN', fr: 'fr-FR', ru: 'ru-RU', es: 'es-ES' }
function Help({ text }) {
  return <span className="help-icon" title={text}>?</span>
}
function detectLanguage() {
  const supported = ['en', 'ar', 'zh', 'fr', 'ru', 'es']
  const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return supported.includes(browserLang) ? browserLang : 'en'
}
function App() {
  const [lang, setLang] = useState(detectLanguage())
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
  const [words, setWords] = useState('')
  const [wordsInput, setWordsInput] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [wantContact, setWantContact] = useState(false)
  const [contactInfo, setContactInfo] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
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

  function toggleListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setStatus('Speech not supported on this browser'); return }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SR()
    rec.lang = SPEECH_LANG[lang] || 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setDescription((prev) => (prev ? prev + ' ' : '') + text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  function getLocation() {
    setStatus('...')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude
        setCoords({ lat, lng }); setGpsFailed(false); setStatus('✓')
        const w = await coordsToWords(lat, lng)
        if (w) setWords(w)
      },
      () => { setGpsFailed(true); setStatus('') }
    )
  }

  async function resolveWords() {
    if (!wordsInput.trim()) return
    setStatus('Finding location...')
    const c = await wordsToCoords(wordsInput)
    if (c) {
      setCoords(c); setWords(wordsInput.replace(/^\/+/, '').trim()); setStatus('✓ Location found')
    } else {
      setStatus('Could not find that Plus Code — check it and try again')
    }
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
          setDamage(result.suggestion)
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
        finalPhotoUrl = data.publicUrl
      }
    }

    const report = {
      damage_level: damage, infrastructure_type: infra, crisis_type: crisis,
      has_debris: debris, latitude: coords?.lat, longitude: coords?.lng, photo_url: finalPhotoUrl, language: lang,
      description: description, landmark: landmark, contributor_id: getContributorId(),
      what3words: words || null,
      country: (coords ? await getCountry(coords.lat, coords.lng) : null),
      contact_info: wantContact ? contactInfo : null,
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
    setWords(''); setWordsInput('')
    setWantContact(false); setContactInfo('')
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

      <main className="main">
        <h2>{t('reportDamage')}</h2>

        <label className="field-label">{t('photo')} <Help text="Take or upload a clear photo of the damaged building or infrastructure." /></label>
        <input type="file" accept="image/*" capture="environment"
          onChange={(e) => handlePhoto(e.target.files[0])} className="file-input" />
        {photo && <p className="hint">✓ {photo.name}</p>}
        {aiThinking && <p className="ai-hint">🔍 Analyzing photo...</p>}
        {aiSuggestion && <p className="ai-hint">🤖 AI suggests: <strong>{t(aiSuggestion)}</strong> — confirm or change below.</p>}

        <label className="field-label">{t('location')} <Help text="Tap to capture your GPS location automatically. If GPS fails, describe a nearby landmark." /></label>
        <button className="secondary-btn" onClick={getLocation}>{t('captureLocation')}</button>
        {coords && <p className="hint">✓ {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
        {words && <p className="w3w">⊞ {words}</p>}
        {gpsFailed && (
          <>
            <p className="map-hint" style={{ color: 'var(--partial)', marginTop: '8px' }}>{t('gpsFail')}</p>
            <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
              placeholder={t('landmarkPlaceholder')} className="select" style={{ marginTop: '8px' }} />
            <p className="field-label" style={{ marginTop: '14px' }}>Or enter a Plus Code:</p>
            <div className="w3w-row">
              <input type="text" value={wordsInput} onChange={(e) => setWordsInput(e.target.value)}
                placeholder="8FW4V75V+8Q" className="select" />
              <button className="secondary-btn w3w-btn" onClick={resolveWords}>Find</button>
            </div>
          </>
        )}

        <label className="field-label">{t('damageLevel')} <Help text="Minimal: cosmetic only. Partial: damaged but standing. Destroyed: collapsed or unsafe." /></label>
        <div className="damage-grid">
          <button className={`damage minimal ${damage==='minimal'?'sel':''}`} onClick={() => setDamage('minimal')}>{t('minimal')}</button>
          <button className={`damage partial ${damage==='partial'?'sel':''}`} onClick={() => setDamage('partial')}>{t('partial')}</button>
          <button className={`damage destroyed ${damage==='destroyed'?'sel':''}`} onClick={() => setDamage('destroyed')}>{t('destroyed')}</button>
        </div>

        <label className="field-label">{t('infraType')} <Help text="What kind of building or structure is this? e.g. home, school, road, hospital." /></label>
        <select value={infra} onChange={(e) => setInfra(e.target.value)} className="select">
          <option value="">{t('select')}</option>
          {INFRA.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        <label className="field-label">{t('crisisType')} <Help text="What caused the damage? e.g. flood, earthquake, cyclone, conflict." /></label>
        <select value={crisis} onChange={(e) => setCrisis(e.target.value)} className="select">
          <option value="">{t('select')}</option>
          {CRISIS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="field-label">{t('descriptionLabel')} <Help text="Optional. Describe what you see in your own words, or tap the mic to speak — any language is fine." /></label>
        <div className="desc-row">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')} className="select" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          <button type="button" className={`mic-btn ${listening ? 'listening' : ''}`} onClick={toggleListening} title="Speak your description">
            {listening ? '⏹' : '🎤'}
          </button>
        </div>
        {listening && <p className="ai-hint">🎙️ Listening... speak now</p>}

        <label className="checkbox-row">
          <input type="checkbox" checked={wantContact} onChange={(e) => setWantContact(e.target.checked)} />
          Contact me about this report (optional)
        </label>
        {wantContact && (
          <input type="text" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)}
            placeholder="Phone or email" className="select" style={{ marginTop: '8px' }} />
        )}

        <button className="submit-btn" onClick={submit}>{t('submit')}</button>

        <p className="status">{status}</p>
        <p className="queue-status">
          {online ? '● ' + t('online') : '○ ' + t('offline')}{queued > 0 ? ` — ${queued}` : ''}
        </p>

        <h2 style={{ marginTop: '32px' }}>{t('nearby')}</h2>
        <p className="map-hint">{t('nearbyHint')}</p>
        <MapView />
      </main>
    </div>
  )
}

export default App