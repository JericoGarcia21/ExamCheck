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
      return Response.json({ error: 'GEMINI_API_KEY secret is not set.' }, { status: 500, headers: corsHeaders })
    }

    const { imageBase64, mimeType, totalItems } = await req.json()
    if (!imageBase64 || !totalItems) {
      return Response.json({ error: 'imageBase64 and totalItems are required' }, { status: 400, headers: corsHeaders })
    }

    const prompt =
      'This is a handwritten exam answer sheet. There are ' + totalItems + ' questions, numbered 1 to ' + totalItems + '. ' +
      'For each question, read the student\'s answer (a letter like A/B/C/D, True/False, or a short written answer). ' +
      'Respond ONLY with a JSON array in this exact format, no extra text: ' +
      '[{"question_number":1,"student_answer":"B"}, ...]. If an answer is unreadable, use an empty string.'

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
              generationConfig: { maxOutputTokens: 2048, temperature: 0, responseMimeType: 'application/json' },
            }),
          },
        )
        lastStatus = response.status
        if (response.ok) break
        if (response.status === 404) break
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
        { error: lastStatus === 503 ? 'The paper reader is busy. Please try again.' : 'The paper reader is unavailable right now.' },
        { status: 503, headers: corsHeaders },
      )
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    try {
      const match = text.match(/\[[\s\S]*\]/)
      const parsed = JSON.parse(match ? match[0] : text)
      return Response.json({ answers: parsed }, { headers: corsHeaders })
    } catch {
      console.error('Gemini returned non-JSON:', text)
      return Response.json({ error: 'Could not understand the answer sheet. Please retake the photo.' }, { status: 422, headers: corsHeaders })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: corsHeaders })
  }
})
