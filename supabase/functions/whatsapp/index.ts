import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

// Hash a phone number → anonymous ID (no plaintext PII stored)
async function anonymize(phone: string) {
  const data = new TextEncoder().encode(phone + 'groundtruth_salt')
  const buf = await crypto.subtle.digest('SHA-256', data)
  return 'wa_' + Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

function twiml(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

async function getSession(phone: string) {
  const { data } = await supabase.from('wa_sessions').select('*').eq('phone', phone).single()
  return data
}
async function setSession(phone: string, fields: any) {
  await supabase.from('wa_sessions').upsert({ phone, ...fields, updated_at: new Date().toISOString() })
}
async function clearSession(phone: string) {
  await supabase.from('wa_sessions').delete().eq('phone', phone)
}

Deno.serve(async (req) => {
  const form = await req.formData()
  const from = form.get('From')?.toString() || ''
  const body = (form.get('Body')?.toString() || '').trim().toLowerCase()
  const numMedia = parseInt(form.get('NumMedia')?.toString() || '0')
  const mediaUrl = form.get('MediaUrl0')?.toString() || null
  const lat = form.get('Latitude')?.toString()
  const lng = form.get('Longitude')?.toString()

  if (body === 'hi' || body === 'hello' || body === 'report' || body === 'start') {
    await setSession(from, { step: 'await_photo', photo: null, lat: null, lng: null })
    return twiml('🆘 GroundTruth damage report.\n\nPlease send a *photo* of the damage.')
  }

  const s = await getSession(from)

  if (!s) {
    return twiml('👋 Welcome to GroundTruth. Send "hi" to report damage.')
  }

  if (s.step === 'await_photo') {
    if (numMedia > 0 && mediaUrl) {
      await setSession(from, { step: 'await_location', photo: mediaUrl })
      return twiml('✅ Photo received.\n\nNow share the *location*: tap 📎 → Location → Send your current location.')
    }
    return twiml('Please send a *photo* of the damage to begin.')
  }

  if (s.step === 'await_location') {
    if (lat && lng) {
      await setSession(from, { step: 'await_damage', lat: parseFloat(lat), lng: parseFloat(lng) })
      return twiml('✅ Location received.\n\nHow bad is the damage?\n\n*1* = Minimal\n*2* = Partial\n*3* = Destroyed\n\nReply 1, 2, or 3.')
    }
    return twiml('Please share your *location* using 📎 → Location.')
  }

  if (s.step === 'await_damage') {
    const map: Record<string, string> = { '1': 'minimal', '2': 'partial', '3': 'destroyed' }
    const level = map[body]
    if (!level) return twiml('Please reply *1*, *2*, or *3*.')

    const anonId = await anonymize(from)

    const { error } = await supabase.from('reports').insert({
      damage_level: level,
      latitude: s.lat,
      longitude: s.lng,
      photo_url: s.photo,
      channel: 'whatsapp',
      contributor_id: anonId,
    })

    await clearSession(from)
    if (error) return twiml('⚠️ Error saving report. Send "hi" to try again.')
    return twiml(`✅ *Report submitted!*\n\nDamage: ${level}\n\nThank you for helping your community. Send "hi" to report another.`)
  }

  return twiml('👋 Send "hi" to report damage.')
})