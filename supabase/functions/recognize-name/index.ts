import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODELS = ['gemini-3.8-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GEMINI_API_KEY) {
      return Response.json(
        { error: 'GEMINI_API_KEY secret is not set on the Edge Function.' },
        { status: 500, headers: corsHeaders },
      )
    }

    const { imageBase64, mimeType } = await req.json()
    if (!imageBase64) {
      return Response.json({ error: 'imageBase64 is required' }, { status: 400, headers: corsHeaders })
    }

    const prompt =
      'This is an exam paper photo. Find the student\'s name — it is usually next to a "Name:" label near the top, ' +
      'but it may also be any clearly written name at the top of the page. Return ONLY the name text. If you really cannot find any name, return EMPTY.'

    let response: Response | null = null
    let lastStatus = 0
    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType ?? 'image/jpeg', data: imageBase64 } },
                  ],
                },
              ],
              generationConfig: { maxOutputTokens: 64, temperature: 0 },
            }),
          },
        )
        lastStatus = response.status
        if (response.ok) break
        // Model not available -> try next model immediately
        if (response.status === 404) break
        // Busy -> retry once after a short wait
        if (response.status === 503) {
          await new Promise((r) => setTimeout(r, 1500))
          continue
        }
        break
      }
      if (response?.ok) break
    }

    if (!response || !response.ok) {
      console.error('Gemini error:', lastStatus, await response?.text())
      return Response.json(
        {
          error:
            lastStatus === 503
              ? 'The name reader is busy right now. Please wait a moment and try again.'
              : 'The name reader is unavailable right now. Please try again or check the photo.',
        },
        { status: 503, headers: corsHeaders },
      )
    }

    const data = await response.json()
    const detected = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    return Response.json(
      { detectedName: detected === 'EMPTY' ? '' : detected },
      { headers: corsHeaders },
    )
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: corsHeaders })
  }
})
