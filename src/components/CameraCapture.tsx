import { imageFileToJpeg } from '../lib/image'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface CameraCaptureHandle {
  /** Open the camera (used by a parent "Retake photo" button). */
  open: () => void
}

const CameraCapture = forwardRef<CameraCaptureHandle, {
  onCapture: (base64: string, mimeType: string) => void
  disabled?: boolean
  label?: string
}>(function CameraCapture({ onCapture, disabled, label = 'Open camera' }, ref) {
  const mountedRef = useRef(true)
  const openingRef = useRef(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    if (disabled || openingRef.current || imageLoading) return
    openingRef.current = true
    setVideoReady(false)
    setError(null)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      if (!mountedRef.current) { media.getTracks().forEach((t) => t.stop()); return }
      setStream(media)
    } catch (e) {
      setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access or upload a paper image.' : 'Could not open the camera. Try again or upload a paper image.')
    } finally { openingRef.current = false }
  }

  useImperativeHandle(ref, () => ({ open: () => void start() }))

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  function stop() {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream])

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight || disabled) return
    const MAX = 1920
    const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    onCapture(dataUrl.split(',')[1], 'image/jpeg')
    stop()
  }

  return (
    <div className="space-y-3">
      {!stream ? (
        <button
          type="button"
          disabled={disabled || imageLoading}
          onClick={start}
          className="rounded-full bg-gradient-to-b from-primary to-primary/85 px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/25 disabled:opacity-50"
        >
          {label}
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <video ref={videoRef} onLoadedData={() => setVideoReady(true)} playsInline muted className="h-full w-full flex-1 object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-6">
            <button
              type="button"
              disabled={!videoReady || disabled}
              onClick={capture}
              className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black shadow-lg"
            >
              Capture photo
            </button>
            <button
              type="button"
              onClick={stop}
              className="rounded-full border border-white/60 px-6 py-4 text-sm font-medium text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!stream && (
        <label className="block text-sm">
          Upload paper image
          <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" disabled={disabled || imageLoading}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setImageLoading(true)
              setError(null)
              try { const b64 = await imageFileToJpeg(file); if (mountedRef.current) onCapture(b64, 'image/jpeg') }
              catch { setError('Could not read this image. Choose a JPEG, PNG, or WebP smaller than 5 MB.') }
              finally { if (mountedRef.current) setImageLoading(false) }
            }} />
        </label>
      )}
      {imageLoading && <p role="status">Preparing image…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
})

export default CameraCapture
