import { isValidYouTubeUrl } from '../utils/ytdl'
import { createJob } from '../utils/jobManager'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const url = body?.url
  const format = body?.format === 'mp3' ? 'mp3' : 'mp4'
  const title = body?.title || 'Video YouTube'

  if (!url || typeof url !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'URL YouTube wajib diisi.'
    })
  }

  if (!isValidYouTubeUrl(url)) {
    throw createError({
      statusCode: 400,
      message: 'Format link YouTube tidak valid.'
    })
  }

  const job = createJob(url, format, title)

  return {
    success: true,
    jobId: job.id,
    format: job.format,
    message: 'Tugas pengunduhan berhasil dibuat.'
  }
})
