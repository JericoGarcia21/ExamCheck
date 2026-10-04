import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = 'gemini-2.0-flash'

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
      'This image shows a student name written on paper. Extract ONLY the student name ' +
      'as written. Return just the name text, nothing else. If no name is readable, return EMPTY.'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
        }),
      },
    )

    if (!response.ok) {
      const text = await response.text()
      return Response.json({ error: `Gemini error: ${text}` }, { status: 502, headers: corsHeaders })
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
