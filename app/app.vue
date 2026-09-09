<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { AlertCircle, X } from 'lucide-vue-next'
import HeaderBar from './components/HeaderBar.vue'
import UrlInputBox from './components/UrlInputBox.vue'
import VideoPreviewCard from './components/VideoPreviewCard.vue'
import DownloadProgressBar from './components/DownloadProgressBar.vue'
import GuideAccordion from './components/GuideAccordion.vue'

interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  durationFormatted: string
  uploader: string
  webpageUrl: string
}

interface ActiveJob {
  id: string
  status: string
  progress: number
  speed: string
  eta: string
  statusText: string
  fileName?: string
  fileSize?: number
  error?: string
}

const url = ref('')
const isFetchingInfo = ref(false)
const videoInfo = ref<VideoInfo | null>(null)
const activeJob = ref<ActiveJob | null>(null)
const activeFormat = ref<'mp4' | 'mp3' | undefined>(undefined)
const errorMessage = ref('')

let pollTimer: any = null
let eventSource: EventSource | null = null

const isDownloading = computed(() => {
  if (!activeJob.value) return false
  return ['queued', 'downloading', 'merging'].includes(activeJob.value.status)
})

function setError(msg: string) {
  errorMessage.value = msg
  if (msg) {
    setTimeout(() => {
      if (errorMessage.value === msg) {
        errorMessage.value = ''
      }
    }, 8000)
  }
}

function clearError() {
  errorMessage.value = ''
}

// Watch URL changes to reset state if input is cleared
watch(url, (newVal) => {
  if (!newVal.trim()) {
    videoInfo.value = null
  }
})

async function fetchInfo() {
  if (!url.value.trim() || isFetchingInfo.value) return
  isFetchingInfo.value = true
  clearError()

  try {
    const res: any = await $fetch('/api/info', {
      method: 'POST',
      body: { url: url.value.trim() }
    })

    if (res && res.success && res.data) {
      videoInfo.value = res.data
    } else {
      setError('Gagal mendapatkan informasi video.')
    }
  } catch (err: any) {
    const msg = err?.data?.message || err?.data?.statusMessage || err?.message || 'Gagal memproses link YouTube. Pastikan link benar.'
    setError(msg)
  } finally {
    isFetchingInfo.value = false
  }
}

async function startDownload(format: 'mp4' | 'mp3') {
  if (!videoInfo.value || isDownloading.value) return
  clearError()
  activeFormat.value = format

  try {
    const res: any = await $fetch('/api/download', {
      method: 'POST',
      body: {
        url: videoInfo.value.webpageUrl,
        format,
        title: videoInfo.value.title
      }
    })

    if (res && res.success && res.jobId) {
      activeJob.value = {
        id: res.jobId,
        status: 'queued',
        progress: 0,
        speed: '',
        eta: '',
        statusText: 'Menyiapkan unduhan di server...'
      }

      startProgressTracking(res.jobId)
    } else {
      setError('Gagal membuat tugas pengunduhan.')
    }
  } catch (err: any) {
    const msg = err?.data?.message || err?.data?.statusMessage || err?.message || 'Gagal memulai unduhan.'
    setError(msg)
  }
}

function startProgressTracking(jobId: string) {
  stopProgressTracking()

  // Use standard polling for maximum reliability across all browser engines
  pollTimer = setInterval(async () => {
    try {
      const data: any = await $fetch(`/api/progress/${jobId}`)
      if (!data) return

      activeJob.value = {
        id: data.id,
        status: data.status,
        progress: data.progress,
        speed: data.speed,
        eta: data.eta,
        statusText: data.statusText,
        fileName: data.fileName,
        fileSize: data.fileSize,
        error: data.error
      }

      if (data.status === 'ready') {
        stopProgressTracking()
        // Trigger browser native file download automatically!
        triggerBrowserDownload(jobId, data.fileName)
      } else if (data.status === 'error' || data.status === 'cancelled') {
        stopProgressTracking()
        if (data.error) {
          setError(data.error)
        }
      }
    } catch {
      // Continue polling unless stopped
    }
  }, 800)
}

function stopProgressTracking() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
}

function triggerBrowserDownload(jobId: string, fileName?: string) {
  if (!import.meta.client) return
  const downloadUrl = `/api/file/${jobId}`
  const a = document.createElement('a')
  a.href = downloadUrl
  if (fileName) {
    a.download = fileName
  }
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function cancelDownload() {
  if (!activeJob.value) return
  const jobId = activeJob.value.id
  stopProgressTracking()

  try {
    await $fetch(`/api/cancel/${jobId}`, { method: 'POST' })
  } catch {
    // ignore
  }

  activeJob.value = null
  activeFormat.value = undefined
}

onUnmounted(() => {
  stopProgressTracking()
})
</script>

<template>
  <main class="container">
    <!-- Header -->
    <HeaderBar />

    <!-- Hero Title -->
    <section class="hero-section">
      <h1 class="hero-title">
        Download Video & Musik <span>YouTube</span>
      </h1>
      <p class="hero-subtitle">
        Tinggal salin link dari YouTube, tempel di sini, dan tekan unduh. Gampang, cepat, dan ramah untuk siapa saja!
      </p>
    </section>

    <!-- Error Alert Box -->
    <div v-if="errorMessage" class="alert-box alert-danger">
      <AlertCircle :size="20" style="flex-shrink: 0;" />
      <div style="flex: 1;">
        {{ errorMessage }}
      </div>
      <button
        type="button"
        @click="clearError"
        style="background: transparent; border: none; color: inherit; cursor: pointer;"
        title="Tutup pesan"
      >
        <X :size="18" />
      </button>
    </div>

    <!-- Input Form with Giant Paste Button -->
    <UrlInputBox
      v-model="url"
      :loading="isFetchingInfo"
      @submit="fetchInfo"
      @error="setError"
    />

    <!-- Video Preview Card with 2 Giant Download Buttons -->
    <VideoPreviewCard
      v-if="videoInfo"
      :video="videoInfo"
      :downloading="isDownloading"
      :active-format="activeFormat"
      @download="startDownload"
    />

    <!-- Real-time Progress Bar & Status -->
    <DownloadProgressBar
      v-if="activeJob"
      :progress="activeJob.progress"
      :status="activeJob.status"
      :status-text="activeJob.statusText"
      :speed="activeJob.speed"
      :eta="activeJob.eta"
      :file-name="activeJob.fileName"
      :file-size="activeJob.fileSize"
      :format="activeFormat"
      @cancel="cancelDownload"
    />

    <!-- Guide for Parents -->
    <GuideAccordion />
  </main>
</template>
