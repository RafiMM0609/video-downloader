import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Cache for --js-runtimes support check
let _supportsJsRuntimes: boolean | null = null

export function checkJsRuntimesSupport(ytDlpPath: string): boolean {
  if (_supportsJsRuntimes !== null) return _supportsJsRuntimes
  try {
    const res = spawnSync(ytDlpPath, ['--help'], { encoding: 'utf-8', timeout: 5000 })
    _supportsJsRuntimes = Boolean(res.stdout && res.stdout.includes('--js-runtimes'))
  } catch {
    _supportsJsRuntimes = false
  }
  return _supportsJsRuntimes
}

// Helper to resolve files across potential working directories (root, .output, etc.)
function resolveCandidatePath(envVal?: string, fallbackRelPath?: string): string | undefined {
  if (envVal) {
    if (fs.existsSync(envVal)) return envVal
    const fromCwd = path.resolve(process.cwd(), envVal)
    if (fs.existsSync(fromCwd)) return fromCwd
    const fromParent = path.resolve(process.cwd(), '..', envVal)
    if (fs.existsSync(fromParent)) return fromParent
  }

  if (fallbackRelPath) {
    const candidates = [
      path.resolve(process.cwd(), fallbackRelPath),
      path.resolve(process.cwd(), '..', fallbackRelPath),
      path.resolve(process.cwd(), '.output', fallbackRelPath)
    ]
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand
      }
    }
  }

  return undefined
}

// Helper to determine executable paths
export function getYtDlpPath(): string {
  const resolved = resolveCandidatePath(process.env.YTDL_PATH, 'bin/yt-dlp')
  if (resolved) {
    return resolved
  }
  return 'yt-dlp'
}

let _systemFfmpegAvailable: boolean | null = null

export function getFfmpegPath(): string | undefined {
  const resolved = resolveCandidatePath(process.env.FFMPEG_PATH, 'bin/ffmpeg')
  if (resolved) return resolved

  if (_systemFfmpegAvailable === null) {
    try {
      const res = spawnSync('ffmpeg', ['-version'], { timeout: 2000 })
      _systemFfmpegAvailable = res.status === 0
    } catch {
      _systemFfmpegAvailable = false
    }
  }

  return _systemFfmpegAvailable ? 'ffmpeg' : undefined
}

export function getCookiesPath(): string | undefined {
  return resolveCandidatePath(process.env.YTDL_COOKIES_PATH, 'cookies.txt')
}

export interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  durationFormatted: string
  uploader: string
  webpageUrl: string
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  const ytRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(.*)?$/
  return ytRegex.test(trimmed)
}

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const ytDlp = getYtDlpPath()
  const ffmpeg = getFfmpegPath()
  const cookies = getCookiesPath()

  const args = [
    '--no-playlist',
    '--no-warnings',
    '-J',
    url.trim()
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

  return new Promise((resolve, reject) => {
    const proc = spawn(ytDlp, args)
    let stdoutData = ''
    let stderrData = ''

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString()
    })

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        let msg = stderrData || 'Gagal mengambil informasi video.'
        if (msg.includes('Sign in to confirm you’re not a bot')) {
          msg = 'YouTube memblokir akses bot pada video ini. Silakan coba lagi sebentar lagi.'
        } else if (msg.includes('Video unavailable') || msg.includes('Private video')) {
          msg = 'Video tidak tersedia, bersifat privat, atau telah dihapus.'
        }
        return reject(new Error(msg))
      }

      try {
        const json = JSON.parse(stdoutData)
        // Check max duration (max 3 hours / 10800s)
        const maxDuration = Number(process.env.MAX_VIDEO_DURATION || 10800)
        if (json.duration && json.duration > maxDuration) {
          return reject(new Error(`Durasi video terlalu panjang (${formatDuration(json.duration)}). Maksimal durasi adalah ${formatDuration(maxDuration)}.`))
        }

        // Get best thumbnail
        let thumbnail = json.thumbnail || ''
        if (Array.isArray(json.thumbnails) && json.thumbnails.length > 0) {
          const best = json.thumbnails[json.thumbnails.length - 1]
          if (best && best.url) thumbnail = best.url
        }

        resolve({
          id: json.id,
          title: json.title || 'Video YouTube',
          thumbnail,
          duration: json.duration || 0,
          durationFormatted: formatDuration(json.duration || 0),
          uploader: json.uploader || json.channel || 'Channel YouTube',
          webpageUrl: json.webpage_url || url
        })
      } catch (err: any) {
        reject(new Error(`Gagal memproses data video: ${err.message}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Tidak dapat menjalankan mesin yt-dlp: ${err.message}`))
    })
  })
}
