import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('')

  async function loadCount() {
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
    setCount(count || 0)
  }

  useEffect(() => { loadCount() }, [])

  async function submit(level) {
    setStatus('Saving...')
    const { error } = await supabase.from('reports').insert({
      damage_level: level,
    })
    if (error) {
      setStatus('Error: ' + error.message)
    } else {
      setStatus('Saved!')
      loadCount()
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>GroundTruth</h1>
        <p>Community crisis damage reporting</p>
      </header>

      <main className="main">
        <h2>Report damage</h2>
        <div className="damage-grid">
          <button className="damage minimal" onClick={() => submit('minimal')}>Minimal</button>
          <button className="damage partial" onClick={() => submit('partial')}>Partial</button>
          <button className="damage destroyed" onClick={() => submit('destroyed')}>Destroyed</button>
        </div>
        <p className="status">{status}</p>
        <p className="count">Reports saved: {count}</p>
      </main>
    </div>
  )
}

export default App