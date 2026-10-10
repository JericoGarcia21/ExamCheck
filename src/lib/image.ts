export async function imageFileToJpeg(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.')
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.')
  const image = await createImageBitmap(file)
  try {
    if (!image.width || !image.height || image.width * image.height > 40_000_000) throw new Error('Choose an image smaller than 40 megapixels.')
    const scale = Math.min(1, 1920 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare this image.')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  } finally { image.close() }
}
