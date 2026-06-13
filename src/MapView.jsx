import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from './supabaseClient'

const COLORS = { minimal: '#1d9e75', partial: '#ef9f27', destroyed: '#e24b4a' }

function MapView() {
  const containerRef = useRef(null)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20],
      zoom: 1.5,
    })

    async function loadPins() {
      const { data } = await supabase
        .from('buildings')
        .select('latitude, longitude, current_damage_level, report_count')
        .not('latitude', 'is', null)

      data?.forEach((b) => {
        const el = document.createElement('div')
        const size = 16 + Math.min(b.report_count * 3, 18)
        el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;background:${COLORS[b.current_damage_level] || '#888'};box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;cursor:pointer`
        if (b.report_count > 1) el.textContent = b.report_count
        new maplibregl.Marker({ element: el })
          .setLngLat([b.longitude, b.latitude])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(
            `<strong>${b.current_damage_level}</strong><br/>${b.report_count} report(s)`
          ))
          .addTo(map)
      })
    }

    map.on('load', loadPins)
    return () => map.remove()
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '420px', borderRadius: '16px', overflow: 'hidden' }} />
}

export default MapView
