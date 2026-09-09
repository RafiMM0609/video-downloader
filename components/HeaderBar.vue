<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Download, Sparkles } from 'lucide-vue-next'

const deferredPrompt = ref<any>(null)
const canInstall = ref(false)

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      deferredPrompt.value = e
      canInstall.value = true
    })

    window.addEventListener('appinstalled', () => {
      deferredPrompt.value = null
      canInstall.value = false
    })
  }
})

async function installPwa() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    canInstall.value = false
  }
  deferredPrompt.value = null
}
</script>

<template>
  <header class="app-header">
    <div class="brand-group">
      <img src="/favicon.svg" alt="Logo UnduhVideo" class="brand-icon" />
      <div>
        <div class="brand-title">
          UnduhVideo
          <span class="brand-badge">PRO</span>
        </div>
      </div>
    </div>

    <!-- PWA Install Button (If supported on mobile/browser) -->
    <button
      v-if="canInstall"
      type="button"
      class="btn-install"
      @click="installPwa"
      title="Pasang aplikasi ke Layar Utama HP"
    >
      <Download :size="16" />
      <span>Pasang di HP</span>
    </button>
  </header>
</template>
