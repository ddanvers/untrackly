<template>
  <main class="chat-page" aria-label="Чат">
    <ChatInvitation :session-id="sessionId" :is-invited="isInvited" />
  </main>
</template>

<script setup lang="ts">
import ChatInvitation from "~/components/chat/invitation/ChatInvitation.vue";

const route = useRoute();
definePageMeta({
  header: false,
});

const sessionId = route.params.id as string;
const isInvited = computed(() => !!route.query.invited);
</script>

<style scoped lang="scss">
@import "@/assets/styles/pages/chat.scss";
</style>
