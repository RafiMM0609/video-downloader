import { cancelJob } from '../../utils/jobManager'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID unduhan tidak valid.' })
  }

  const cancelled = cancelJob(id)
  return {
    success: cancelled,
    message: cancelled ? 'Unduhan berhasil dibatalkan.' : 'Tugas tidak ditemukan atau sudah selesai.'
  }
})
