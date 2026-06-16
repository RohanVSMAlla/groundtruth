Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Content-Type': 'application/json',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const { text, target = 'en' } = await req.json()
    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ translated: '' }), { headers })
    }

    // Free Google translate endpoint (unofficial, fine for prototype)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const data = await res.json()
    const translated = (data[0] || []).map((seg: any) => seg[0]).join('')

    return new Response(JSON.stringify({ translated }), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ translated: '', error: String(e) }), { headers })
  }
})