<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRuntimeConfig } from '#app';

const props = withDefaults(defineProps<{
  modelValue?: string | null;
  label?: string;
  placeholder?: string;
  variant?: 'default' | 'avatar';
}>(), {
  variant: 'default'
});

const emit = defineEmits(['update:modelValue']);

const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const uploadError = ref('');

const isAvatarMode = computed(() => {
  if (props.variant === 'avatar') return true;
  if (!props.label) return false;
  const l = props.label.toLowerCase();
  return l.includes('аватар') || l.includes('фото профиля');
});

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  const config = useRuntimeConfig();

  const formData = new FormData();
  formData.append('file', file);

  isUploading.value = true;
  uploadError.value = '';

  try {
    const response = await $fetch<any>(`${config.public.apiUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (response.success && response.url) {
      emit('update:modelValue', response.url);
    } else {
      uploadError.value = response.error || 'Ошибка при загрузке файла';
    }
  } catch (error: any) {
    uploadError.value = error.data?.error || 'Сетевая ошибка при загрузке файла';
  } finally {
    isUploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = ''; // Reset input
    }
  }
}

function triggerFileInput() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}
</script>

<template>
  <div class="image-uploader" :class="{ 'is-avatar-layout': isAvatarMode }">
    <label v-if="label" class="uploader-label">{{ label }}</label>

    <input 
      type="file" 
      ref="fileInput" 
      accept="image/jpeg, image/png, image/webp, image/gif, image/svg+xml"
      class="hidden-file-input" 
      @change="handleFileUpload" 
    />
    
    <!-- AVATAR CIRCLE VARIANT -->
    <div 
      v-if="isAvatarMode" 
      class="avatar-uploader-container"
      @click="triggerFileInput"
      :class="{ 'uploading': isUploading }"
    >
      <div class="avatar-ring">
        <div v-if="isUploading" class="avatar-spinner-overlay">
          <div class="spinner-ring"></div>
          <span class="spinner-text">Загрузка...</span>
        </div>

        <template v-else-if="modelValue">
          <img :src="modelValue" alt="Avatar Preview" class="avatar-img" />
          <div class="avatar-hover-overlay">
            <span class="camera-icon">📷</span>
            <span class="hover-text">Сменить</span>
          </div>
        </template>

        <template v-else>
          <div class="avatar-empty-placeholder">
            <span class="placeholder-icon">👤</span>
            <span class="upload-badge">+ Фото</span>
          </div>
        </template>
      </div>

      <div class="avatar-hint">
        <span class="hint-title">{{ placeholder || 'Загрузить аватар' }}</span>
        <span class="hint-sub">JPG, PNG, WEBP до 10MB</span>
      </div>
    </div>

    <!-- DEFAULT BOX VARIANT (For portfolio & covers) -->
    <div 
      v-else 
      class="default-upload-box"
      @click="triggerFileInput"
      :class="{ 'uploading': isUploading }"
    >
      <div v-if="isUploading" class="box-spinner-wrapper">
        <div class="spinner-ring"></div>
        <span>Идёт загрузка изображения...</span>
      </div>
      
      <div v-else-if="modelValue" class="box-preview-wrapper">
        <img :src="modelValue" alt="Preview" class="box-preview-img" />
        <div class="box-overlay-badge">📷 Нажмите, чтобы заменить изображение</div>
      </div>
      
      <div v-else class="box-empty-wrapper">
        <svg class="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span class="box-placeholder-text">{{ placeholder || 'Загрузить изображение' }}</span>
        <span class="box-sub-text">JPEG, PNG, WEBP до 10MB</span>
      </div>
    </div>
    
    <p v-if="uploadError" class="uploader-error-text">{{ uploadError }}</p>
  </div>
</template>

<style scoped>
.image-uploader {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.uploader-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
}

.hidden-file-input {
  display: none;
}

/* --- AVATAR MODE STYLES --- */
.avatar-uploader-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  cursor: pointer;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  transition: all 0.25s ease;
}

.avatar-uploader-container:hover {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.4);
}

.avatar-ring {
  position: relative;
  width: 104px;
  height: 104px;
  min-width: 104px;
  min-height: 104px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(99, 102, 241, 0.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(99, 102, 241, 0.2);
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: #fff;
}

.avatar-ring:hover .avatar-hover-overlay {
  opacity: 1;
}

.camera-icon {
  font-size: 1.2rem;
}

.hover-text {
  font-size: 0.7rem;
  font-weight: 600;
  margin-top: 0.2rem;
}

.avatar-empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.placeholder-icon {
  font-size: 2rem;
}

.upload-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: #818cf8;
  margin-top: 0.2rem;
}

.avatar-hint {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hint-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #f8fafc);
}

.hint-sub {
  font-size: 0.8rem;
  color: #64748b;
}

/* --- DEFAULT BOX MODE STYLES --- */
.default-upload-box {
  background: rgba(18, 18, 22, 0.8);
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}

.default-upload-box:hover {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.04);
}

.box-preview-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.box-preview-img {
  max-width: 100%;
  max-height: 220px;
  aspect-ratio: 16/9;
  object-fit: contain;
  border-radius: 10px;
}

.box-overlay-badge {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #818cf8;
  font-weight: 500;
}

.box-empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #64748b;
  text-align: center;
}

.upload-icon {
  width: 36px;
  height: 36px;
  margin-bottom: 0.5rem;
  color: #6366f1;
}

.box-placeholder-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
}

.box-sub-text {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.2rem;
}

/* --- SPINNER ANIMATION --- */
.box-spinner-wrapper, .avatar-spinner-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #818cf8;
  font-size: 0.85rem;
  font-weight: 600;
}

.avatar-spinner-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.9);
  justify-content: center;
}

.spinner-text {
  font-size: 0.65rem;
}

.spinner-ring {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.uploader-error-text {
  font-size: 0.8rem;
  color: #ef4444;
  margin-top: 0.25rem;
}
</style>
