import { isValidYouTubeUrl, fetchVideoInfo } from '../utils/ytdl'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const url = body?.url

  if (!url || typeof url !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'URL YouTube wajib diisi.'
    })
  }

  if (!isValidYouTubeUrl(url)) {
    throw createError({
      statusCode: 400,
      message: 'Format link YouTube tidak valid. Pastikan link diawali dengan youtube.com atau youtu.be'
    })
  }

  try {
    const info = await fetchVideoInfo(url)
    return {
      success: true,
      data: info
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Gagal memproses informasi video.'
    })
  }
})
