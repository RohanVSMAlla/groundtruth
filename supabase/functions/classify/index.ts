Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Content-Type': 'application/json',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) return new Response(JSON.stringify({ suggestion: null }), { headers })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'You are assessing building/infrastructure damage from a disaster. Look at this photo and classify the damage as exactly one word: "minimal" (sound, cosmetic only), "partial" (damaged but standing), or "destroyed" (collapsed/unsafe). Reply with ONLY that one word, lowercase. If you cannot tell, reply "minimal".' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        }],
        max_tokens: 10,
        temperature: 0,
      }),
    })

    const data = await res.json()
    let suggestion = (data.choices?.[0]?.message?.content || '').trim().toLowerCase()
    if (!['minimal', 'partial', 'destroyed'].includes(suggestion)) suggestion = null

    return new Response(JSON.stringify({ suggestion }), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ suggestion: null, error: String(e) }), { headers })
  }
})