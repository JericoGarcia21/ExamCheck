import { useEffect, useRef, useState } from 'react'

export default function CameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (base64: string, mimeType: string) => void
  disabled?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setError(null)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setStream(media)
      if (videoRef.current) {
        videoRef.current.srcObject = media
        await videoRef.current.play()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open camera.')
    }
  }

  function stop() {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream])

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    onCapture(dataUrl.split(',')[1], 'image/jpeg')
    stop()
  }

  return (
    <div className="mt-3 space-y-3">
      {!stream ? (
        <button
          type="button"
          disabled={disabled}
          onClick={start}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Open camera
        </button>
      ) : (
        <div className="space-y-3">
          <video ref={videoRef} playsInline muted className="w-full rounded-md border" />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={capture}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Capture photo
            </button>
            <button type="button" onClick={stop} className="rounded-md border px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
