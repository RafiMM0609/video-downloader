import { spawn, type ChildProcess } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getYtDlpPath, getFfmpegPath, getCookiesPath, checkJsRuntimesSupport } from './ytdl'

export type JobStatus = 'queued' | 'downloading' | 'merging' | 'ready' | 'error' | 'cancelled'

export interface Job {
  id: string
  url: string
  format: 'mp4' | 'mp3'
  title: string
  status: JobStatus
  progress: number
  speed: string
  eta: string
  statusText: string
  filePath?: string
  fileName?: string
  fileSize?: number
  error?: string
  createdAt: number
  updatedAt: number
  process?: ChildProcess
}

const jobs = new Map<string, Job>()
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT || 3)
const CLEANUP_TTL_MS = 15 * 60 * 1000 // 15 menit

export function getDownloadDir(): string {
  const configured = process.env.DOWNLOAD_DIR
  let dir: string

  if (configured) {
    if (path.isAbsolute(configured)) {
      dir = configured
    } else if (process.cwd().endsWith('.output') || process.cwd().endsWith(`.output${path.sep}`)) {
      dir = path.resolve(process.cwd(), '..', configured)
    } else {
      dir = path.resolve(process.cwd(), configured)
    }
  } else {
    if (process.cwd().endsWith('.output') || process.cwd().endsWith(`.output${path.sep}`)) {
      dir = path.resolve(process.cwd(), '..', 'downloads')
    } else {
      dir = path.resolve(process.cwd(), 'downloads')
    }
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

// Sanitize filename for safe Content-Disposition
export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 150) || 'download'
}

export function createJob(url: string, format: 'mp4' | 'mp3', title: string): Job {
  const id = crypto.randomUUID()
  const job: Job = {
    id,
    url,
    format,
    title: title || 'Video YouTube',
    status: 'queued',
    progress: 0,
    speed: '',
    eta: '',
    statusText: 'Menunggu antrean server...',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  jobs.set(id, job)
  processQueue()
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function cancelJob(id: string): boolean {
  const job = jobs.get(id)
  if (!job) return false

  if (job.process && !job.process.killed) {
    try {
      job.process.kill('SIGTERM')
    } catch {
      // ignore
    }
  }

  job.status = 'cancelled'
  job.statusText = 'Unduhan dibatalkan.'
  job.updatedAt = Date.now()

  // Clean any partially created files
  cleanupJobFiles(job.id)
  processQueue()
  return true
}

function getActiveJobsCount(): number {
  let count = 0
  for (const job of jobs.values()) {
    if (job.status === 'downloading' || job.status === 'merging') {
      count++
    }
  }
  return count
}

function processQueue() {
  const active = getActiveJobsCount()
  if (active >= MAX_CONCURRENT) return

  for (const job of jobs.values()) {
    if (job.status === 'queued') {
      executeJob(job)
      break
    }
  }
}

function cleanupJobFiles(jobId: string) {
  const dir = getDownloadDir()
  try {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      if (f.startsWith(jobId)) {
        try {
          fs.unlinkSync(path.join(dir, f))
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}

function executeJob(job: Job) {
  job.status = 'downloading'
  job.statusText = 'Sedang memulai pengunduhan...'
  job.updatedAt = Date.now()

  const ytDlp = getYtDlpPath()
  const ffmpeg = getFfmpegPath()
  const cookies = getCookiesPath()
  const downloadDir = getDownloadDir()

  const outPattern = path.join(downloadDir, `${job.id}.%(ext)s`)

  const args = [
    '--no-playlist',
    '--no-warnings',
    '--newline',
    '--progress-template', 'download:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    '-o', outPattern
  ]

  if (checkJsRuntimesSupport(ytDlp)) {
    args.splice(2, 0, '--js-runtimes', 'node')
  }

  if (ffmpeg) {
    args.unshift('--ffmpeg-location', ffmpeg)
  }
  if (cookies) {
    args.unshift('--cookies', cookies)
  }

  if (job.format === 'mp3') {
    if (ffmpeg) {
      args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0')
    } else {
      args.push('-f', 'ba/b', '-x', '--audio-format', 'm4a')
    }
  } else {
    // Video MP4 - Selalu ambil video & audio kualitas terbaik mutlak (resolusi, fps, bitrate tertinggi)
    if (ffmpeg) {
      args.push(
        '-f', 'bv*+ba/b',
        '-S', 'res,fps,br',
        '--merge-output-format', 'mp4'
      )
    } else {
      args.push('-f', 'best[ext=mp4]/best')
    }
  }

  args.push(job.url)

  const proc = spawn(ytDlp, args)
  job.process = proc

  let stderrData = ''

  proc.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.startsWith('download:')) {
        // e.g. download: 45.2%|4.52MiB/s|00:06
        const parts = trimmed.substring(9).split('|')
        const percentStr = parts[0]?.replace('%', '').trim()
        const speedStr = parts[1]?.trim() || ''
        const etaStr = parts[2]?.trim() || ''

        const pct = parseFloat(percentStr)
        if (!isNaN(pct)) {
          job.progress = Math.min(Math.max(pct, 0), 99)
          job.speed = speedStr
          job.eta = etaStr
          job.status = 'downloading'
          job.statusText = `Sedang mengunduh kualitas terbaik... ${job.progress.toFixed(0)}%`
          job.updatedAt = Date.now()
        }
      } else if (trimmed.includes('[Merger]') || trimmed.includes('[FixupM4a]') || trimmed.includes('Merging formats')) {
        job.status = 'merging'
        job.progress = 95
        job.statusText = 'Menggabungkan video dan audio kualitas tinggi...'
        job.updatedAt = Date.now()
      } else if (trimmed.includes('[ExtractAudio]') || (job.format === 'mp3' && trimmed.includes('Destination:'))) {
        job.status = 'merging'
        job.progress = 95
        job.statusText = 'Mengonversi file ke audio MP3...'
        job.updatedAt = Date.now()
      }
    }
  })

  proc.stderr.on('data', (chunk) => {
    stderrData += chunk.toString()
  })

  proc.on('close', (code) => {
    job.process = undefined

    if (job.status === 'cancelled') {
      processQueue()
      return
    }

    if (code !== 0) {
      job.status = 'error'
      let msg = stderrData || 'Gagal mengunduh media dari YouTube.'
      if (msg.includes('Sign in to confirm you’re not a bot')) {
        msg = 'YouTube mendeteksi aktivitas bot. Coba lagi dalam beberapa saat.'
      }
      job.error = msg
      job.statusText = 'Terjadi kesalahan saat mengunduh.'
      job.updatedAt = Date.now()
      cleanupJobFiles(job.id)
      processQueue()
      return
    }

    // Locate the finished file
    try {
      const files = fs.readdirSync(downloadDir)
      const targetFile = files.find(f => f.startsWith(job.id))

      if (!targetFile) {
        job.status = 'error'
        job.error = 'File hasil unduhan tidak ditemukan di server.'
        job.statusText = 'Gagal menemukan file hasil unduhan.'
        job.updatedAt = Date.now()
        processQueue()
        return
      }

      const fullPath = path.join(downloadDir, targetFile)
      const stat = fs.statSync(fullPath)
      const ext = path.extname(targetFile).slice(1) || (job.format === 'mp3' ? 'mp3' : 'mp4')

      job.filePath = fullPath
      job.fileSize = stat.size
      job.fileName = `${sanitizeFileName(job.title)}.${ext}`
      job.status = 'ready'
      job.progress = 100
      job.statusText = 'Selesai! File siap diunduh ke perangkat.'
      job.updatedAt = Date.now()
    } catch (err: any) {
      job.status = 'error'
      job.error = `Error membaca file: ${err.message}`
      job.statusText = 'Gagal memproses file hasil unduhan.'
    }

    processQueue()
  })

  proc.on('error', (err) => {
    job.status = 'error'
    job.error = `Gagal menjalankan proses downloader: ${err.message}`
    job.statusText = 'Gagal memulai mesin downloader.'
    job.updatedAt = Date.now()
    processQueue()
  })
}

// Background cleanup loop
setInterval(() => {
  const now = Date.now()
  const dir = getDownloadDir()

  // Clean old jobs in memory
  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > CLEANUP_TTL_MS) {
      jobs.delete(id)
      cleanupJobFiles(id)
    }
  }

  // Also sweep physical files older than TTL
  try {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      const fullPath = path.join(dir, f)
      const stat = fs.statSync(fullPath)
      if (now - stat.mtimeMs > CLEANUP_TTL_MS) {
        try {
          fs.unlinkSync(fullPath)
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}, 2 * 60 * 1000)
