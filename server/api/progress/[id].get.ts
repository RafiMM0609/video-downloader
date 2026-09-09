import { getJob } from '../../utils/jobManager'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID unduhan tidak valid.' })
  }

  const query = getQuery(event)
  const isSSE = query.stream === 'true' || getHeader(event, 'accept')?.includes('text/event-stream')

  const job = getJob(id)
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Tugas unduhan tidak ditemukan atau telah kedaluwarsa.' })
  }

  // If SSE is requested, use Nitro EventStream
  if (isSSE) {
    const eventStream = createEventStream(event)

    const interval = setInterval(async () => {
      const current = getJob(id)
      if (!current) {
        await eventStream.push(JSON.stringify({ status: 'error', error: 'Tugas tidak ditemukan.' }))
        clearInterval(interval)
        await eventStream.close()
        return
      }

      await eventStream.push(JSON.stringify({
        id: current.id,
        status: current.status,
        progress: current.progress,
        speed: current.speed,
        eta: current.eta,
        statusText: current.statusText,
        fileName: current.fileName,
        fileSize: current.fileSize,
        error: current.error
      }))

      if (current.status === 'ready' || current.status === 'error' || current.status === 'cancelled') {
        clearInterval(interval)
        await eventStream.close()
      }
    }, 500)

    eventStream.onClosed(() => {
      clearInterval(interval)
    })

    return eventStream.send()
  }

  // Standard JSON response
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    statusText: job.statusText,
    fileName: job.fileName,
    fileSize: job.fileSize,
    error: job.error
  }
})
