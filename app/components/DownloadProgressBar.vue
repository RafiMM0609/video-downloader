<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-vue-next'

const props = defineProps<{
  progress: number
  status: string
  statusText: string
  speed?: string
  eta?: string
  fileName?: string
  fileSize?: number
  format?: 'mp4' | 'mp3'
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const isDone = computed(() => props.status === 'ready')
const isError = computed(() => props.status === 'error')
</script>

<template>
  <div class="progress-card">
    <div class="progress-header">
      <div class="progress-status-text">
        <CheckCircle2 v-if="isDone" :size="22" style="color: #10b981;" />
        <AlertCircle v-else-if="isError" :size="22" style="color: #ef4444;" />
        <Loader2 v-else class="spinner" :size="20" style="color: #38bdf8;" />
        <span>{{ statusText }}</span>
      </div>

      <div class="progress-percent">
        {{ Math.round(progress) }}%
      </div>
    </div>

    <!-- Progress bar track -->
    <div class="progress-bar-track">
      <div
        class="progress-bar-fill"
        :style="{
          width: `${Math.min(Math.max(progress, 2), 100)}%`,
          background: isDone
            ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
            : isError
            ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
            : undefined
        }"
      />
    </div>

    <!-- Meta Speed, ETA, or File Size -->
    <div class="progress-meta">
      <div>
        <span v-if="speed">Kecepatan: {{ speed }}</span>
        <span v-else-if="fileName">{{ fileName }}</span>
      </div>
      <div>
        <span v-if="eta && !isDone">Sisa waktu: ~{{ eta }}</span>
        <span v-else-if="fileSize && isDone">Ukuran: {{ formatBytes(fileSize) }}</span>
      </div>
    </div>

    <!-- Done banner -->
    <div
      v-if="isDone"
      style="margin-top: 1rem; padding: 0.75rem; background: rgba(16, 185, 129, 0.15); border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.3); text-align: center; font-size: 0.95rem; color: #a7f3d0;"
    >
      🎉 File otomatis terunduh ke HP/Laptop Anda! Jika belum, 
      <a :href="`/api/file/${props.fileName}`" style="color: #ffffff; font-weight: 700; text-decoration: underline;">
        klik di sini untuk mengunduh lagi
      </a>.
    </div>

    <!-- Cancel button -->
    <button
      v-if="!isDone && !isError"
      type="button"
      class="btn-cancel"
      @click="emit('cancel')"
    >
      Batalkan Unduhan
    </button>
  </div>
</template>
