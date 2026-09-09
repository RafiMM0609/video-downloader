<script setup lang="ts">
import { Video, Music, User, Sparkles } from 'lucide-vue-next'
import type { VideoInfo } from '~/server/utils/ytdl'

const props = defineProps<{
  video: VideoInfo
  downloading: boolean
  activeFormat?: 'mp4' | 'mp3'
}>()

const emit = defineEmits<{
  (e: 'download', format: 'mp4' | 'mp3'): void
}>()
</script>

<template>
  <div class="glass-card preview-card">
    <div class="preview-content">
      <div class="thumbnail-container">
        <img
          :src="video.thumbnail || '/favicon.svg'"
          :alt="video.title"
          class="thumbnail-img"
          loading="lazy"
        />
        <div class="duration-badge">
          {{ video.durationFormatted }}
        </div>
      </div>

      <div class="preview-details">
        <h2 class="video-title" :title="video.title">
          {{ video.title }}
        </h2>
        <div class="video-channel">
          <User :size="16" />
          <span>{{ video.uploader }}</span>
        </div>
      </div>
    </div>

    <!-- 2 Giant Action Buttons for Parents -->
    <div class="download-actions">
      <!-- Download Video MP4 -->
      <button
        type="button"
        class="btn-download-video"
        :disabled="downloading"
        @click="emit('download', 'mp4')"
      >
        <Video :size="26" />
        <div class="btn-text-group">
          <span>Download Video (MP4)</span>
          <span class="btn-subtext">Kualitas Terbaik (Otomatis)</span>
        </div>
      </button>

      <!-- Download Audio MP3 -->
      <button
        type="button"
        class="btn-download-audio"
        :disabled="downloading"
        @click="emit('download', 'mp3')"
      >
        <Music :size="26" />
        <div class="btn-text-group">
          <span>Download Musik (MP3)</span>
          <span class="btn-subtext">Audio Jernih (320kbps)</span>
        </div>
      </button>
    </div>
  </div>
</template>
