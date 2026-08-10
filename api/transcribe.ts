import type { VercelRequest, VercelResponse } from '@vercel/node'
import FormData from 'form-data'
import fetch from 'node-fetch'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { audioBase64, mimeType, filename } = req.body as {
      audioBase64?: string
      mimeType?: string
      filename?: string
    }

    if (!audioBase64) return res.status(400).json({ error: 'No audio data provided' })

    const buffer = Buffer.from(audioBase64, 'base64')
    const ext = (filename ?? 'audio.m4a').split('.').pop() ?? 'm4a'
    const safeFilename = `voice.${ext}`

    const form = new FormData()
    form.append('file', buffer, {
      filename: safeFilename,
      contentType: mimeType ?? 'audio/m4a',
    })
    form.append('model', 'whisper-1')
    form.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    })

    const data = await response.json() as { text?: string; error?: { message: string } }
    if (!response.ok) throw new Error(data.error?.message ?? 'Transcription failed')

    return res.status(200).json({ text: data.text ?? '' })
  } catch (err: unknown) {
    console.error('Transcribe error:', err)
    const msg = err instanceof Error ? err.message : 'Transcription failed'
    return res.status(500).json({ error: msg })
  }
}
