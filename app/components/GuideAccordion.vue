<script setup lang="ts">
import { HelpCircle, Share2, Copy, Download } from 'lucide-vue-next'
</script>

<template>
  <div class="guide-section">
    <h3 class="guide-title">
      <HelpCircle :size="20" style="color: #38bdf8;" />
      <span>Cara Mudah Download Video YouTube:</span>
    </h3>

    <div class="steps-grid">
      <div class="step-box">
        <div class="step-num">1</div>
        <div class="step-text">
          Buka aplikasi <strong>YouTube</strong> di HP, pilih video lalu tekan tombol <strong>Bagikan (Share)</strong>.
        </div>
      </div>

      <div class="step-box">
        <div class="step-num">2</div>
        <div class="step-text">
          Pilih opsi <strong>Salin Link</strong> (Copy Link) untuk menyalin tautan video.
        </div>
      </div>

      <div class="step-box">
        <div class="step-num">3</div>
        <div class="step-text">
          Kembali ke web ini, tekan tombol <strong>Tempel Link</strong>, lalu klik tombol <strong>Download</strong>!
        </div>
      </div>
    </div>
  </div>
</template>
