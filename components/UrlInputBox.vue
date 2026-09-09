<script setup lang="ts">
import { ref } from 'vue'
import { ClipboardCopy, Search, X, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'submit'): void
  (e: 'error', msg: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', val)
}

function clear() {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

async function handlePaste() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      inputRef.value?.focus()
      emit('error', 'Fitur clipboard otomatis tidak diizinkan oleh browser. Silakan tempel (paste) manual di kolom.')
      return
    }

    const text = await navigator.clipboard.readText()
    if (text && text.trim()) {
      emit('update:modelValue', text.trim())
      // Trigger automatic search on paste!
      emit('submit')
    } else {
      emit('error', 'Papan klip (clipboard) Anda kosong. Salin link video YouTube terlebih dahulu.')
    }
  } catch (err: any) {
    inputRef.value?.focus()
    emit('error', 'Tidak dapat mengakses papan klip. Silakan tempel link langsung di kotak input.')
  }
}

function handleSubmit() {
  if (props.loading || !props.modelValue.trim()) return
  emit('submit')
}
</script>

<template>
  <div class="glass-card input-card">
    <label for="youtube-url-input" class="input-label">
      Masukkan atau Tempel Link YouTube:
    </label>

    <form @submit.prevent="handleSubmit" class="input-wrapper">
      <div style="position: relative; flex: 1; display: flex; align-items: center;">
        <input
          id="youtube-url-input"
          ref="inputRef"
          type="url"
          inputmode="url"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="https://www.youtube.com/watch?v=..."
          :value="modelValue"
          :disabled="loading"
          class="main-input"
          @input="onInput"
          @keydown.enter.prevent="handleSubmit"
        />

        <!-- Clear Button -->
        <button
          v-if="modelValue && !loading"
          type="button"
          @click="clear"
          style="position: absolute; right: 14px; background: transparent; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px;"
          title="Hapus tautan"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Giant Paste Button -->
      <button
        type="button"
        class="btn-paste"
        :disabled="loading"
        @click="handlePaste"
        title="Tempel link langsung dari clipboard"
      >
        <ClipboardCopy :size="22" />
        <span>Tempel Link</span>
      </button>

      <!-- Submit / Search Button -->
      <button
        v-if="modelValue"
        type="submit"
        class="btn-paste"
        style="background: linear-gradient(135deg, #4f46e5, #4338ca); box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);"
        :disabled="loading"
        title="Ambil informasi video"
      >
        <Loader2 v-if="loading" class="spinner" :size="22" />
        <Search v-else :size="22" />
        <span>{{ loading ? 'Memeriksa...' : 'Ambil' }}</span>
      </button>
    </form>
  </div>
</template>
