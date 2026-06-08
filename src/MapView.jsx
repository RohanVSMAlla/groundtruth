import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from './supabaseClient'

const COLORS = { minimal: '#1d9e75', partial: '#ef9f27', destroyed: '#e24b4a' }

function MapView() {
  const mapRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20],
      zoom: 1.5,
    })
    mapRef.current = map

    async function loadPins() {
      const { data } = await supabase
        .from('reports')
        .select('latitude, longitude, damage_level')
        .not('latitude', 'is', null)

      data?.forEach((r) => {
        const el = document.createElement('div')
        el.style.cssText = `width:16px;height:16px;border-radius:50%;border:2px solid #fff;background:${COLORS[r.damage_level] || '#888'};box-shadow:0 1px 4px rgba(0,0,0,0.4)`
        new maplibregl.Marker({ element: el })
          .setLngLat([r.longitude, r.latitude])
          .addTo(map)
      })
    }

    map.on('load', loadPins)
    return () => map.remove()
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '420px', borderRadius: '16px', overflow: 'hidden' }} />
}

export default MapView