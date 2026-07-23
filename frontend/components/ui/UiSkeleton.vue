<script setup lang="ts">
interface Props {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '20px',
  borderRadius: '8px',
  className: '',
});
</script>

<template>
  <div 
    class="ui-skeleton" 
    :class="className"
    :style="{ 
      width, 
      height, 
      borderRadius 
    }"
  ></div>
</template>

<style scoped>
.ui-skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s infinite ease-in-out;
  display: block;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
