<script setup lang="ts">
import { ref } from 'vue';
import { useRuntimeConfig } from '#app';

const props = defineProps<{
  modelValue?: string | null;
  label?: string;
  placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const uploadError = ref('');

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
      fileInput.value.value = ''; // сброс инпута
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
  <div class="image-uploader">
    <label v-if="label" class="block text-sm font-medium text-gray-300 mb-2">{{ label }}</label>
    
    <div 
      class="border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors bg-[#121216]"
      @click="triggerFileInput"
      :class="{ 'opacity-50 pointer-events-none': isUploading }"
    >
      <input 
        type="file" 
        ref="fileInput" 
        accept="image/jpeg, image/png, image/webp, image/gif, image/svg+xml"
        class="hidden" 
        @change="handleFileUpload" 
      />
      
      <div v-if="isUploading" class="text-indigo-400 font-medium animate-pulse">
        Загрузка...
      </div>
      
      <div v-else-if="modelValue" class="flex flex-col items-center">
        <img :src="modelValue" alt="Preview" class="w-32 h-32 object-cover rounded-lg mb-4" />
        <span class="text-sm text-gray-400">Нажмите, чтобы заменить фото</span>
      </div>
      
      <div v-else class="flex flex-col items-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span class="text-sm font-medium">{{ placeholder || 'Загрузить изображение' }}</span>
        <span class="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP до 10MB</span>
      </div>
    </div>
    
    <p v-if="uploadError" class="mt-2 text-sm text-red-500">{{ uploadError }}</p>
  </div>
</template>
