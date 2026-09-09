import fs from 'node:fs'
import { getJob } from '../../utils/jobManager'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID unduhan tidak valid.' })
  }

  const job = getJob(id)
  if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'File hasil unduhan tidak ditemukan atau telah kedaluwarsa.'
    })
  }

  const fileName = job.fileName || `download.${job.format}`
  const contentType = job.format === 'mp3' ? 'audio/mpeg' : 'video/mp4'

  // Safe filename encoding for Content-Disposition header
  const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, '_')
  const utf8FileName = encodeURIComponent(fileName)

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Length', job.fileSize || fs.statSync(job.filePath).size)
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${asciiFileName}"; filename*=UTF-8''${utf8FileName}`
  )

  const stream = fs.createReadStream(job.filePath)

  // Auto clean up file 1 minute after user initiates download
  setTimeout(() => {
    if (job.filePath && fs.existsSync(job.filePath)) {
      try {
        fs.unlinkSync(job.filePath)
      } catch {
        // ignore
      }
    }
  }, 60 * 1000)

  return sendStream(event, stream)
})
