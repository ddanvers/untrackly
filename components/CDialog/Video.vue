<template>
  <div class="c-dialog-images">
    <CDialog :model-value="isDialogOpened" @update:modelValue="closeDialog">
      <template #content>
        <CVideoPlayer @click.stop :src="getVideo()" />
      </template>
    </CDialog>
  </div>
</template>

<script setup lang="ts">
const { isDialogOpened, getVideo, closeDialog } = useDialogVideo();
</script>
