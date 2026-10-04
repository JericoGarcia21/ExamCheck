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
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      setStream(media)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open camera.')
    }
  }

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
    if (!video) return
    const MAX = 896
    const scale = Math.min(1, MAX / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.filter = 'contrast(1.15) brightness(1.05)'
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
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
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Open camera
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <video ref={videoRef} playsInline muted className="h-full w-full flex-1 object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-6">
            <button
              type="button"
              onClick={capture}
              className="rounded-none bg-white px-8 py-4 text-sm font-semibold text-black shadow-lg"
            >
              Capture photo
            </button>
            <button
              type="button"
              onClick={stop}
              className="rounded-none border border-white/60 px-6 py-4 text-sm font-medium text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
