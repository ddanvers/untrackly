<template>
  <main class="page-hero">
    <div class="legal-container">
      <div class="legal-card">
        <div class="logo-wrapper">
          <NuxtLink to="/">
            <Logo class="logo-icon" />
          </NuxtLink>
        </div>
        
        <h1 class="legal-title">Правила пользования</h1>
        
        <div class="legal-content">
          <p class="last-updated">Последнее обновление: 4 января 2026 г.</p>

          <section>
            <h2>1. Общие положения</h2>
            <p>Добро пожаловать в untrackly — сервис для приватного общения через прямое соединение (P2P). Используя наше приложение, вы соглашаетесь с данными правилами.</p>
          </section>

          <section>
            <h2>2. Принципы работы сервиса</h2>
            <p>untrackly функционирует по принципу Peer-to-Peer. Сообщения передаются напрямую между устройствами пользователей с использованием сквозного шифрования (E2EE) и не хранятся на наших серверах.</p>
          </section>

          <section>
            <h2>3. Ответственность сторон</h2>
            <p>Вы несете полную ответственность за сохранность ваших ключей шифрования и кодов доступа к комнатам. Мы не имеем технической возможности восстановить доступ к вашим перепискам в случае утери ключей.</p>
            <p><strong>Пользователи обязуются строго соблюдать законодательство Российской Федерации и не использовать сервис для совершения любых противоправных действий.</strong></p>
          </section>

          <section>
            <h2>4. Запрещенное использование</h2>
            <p>Запрещается использовать сервис для осуществления любой незаконной деятельности, предусмотренной законодательством Российской Федерации, включая, но не ограничиваясь: распространение вредоносного ПО, пропаганду насилия, нарушение авторских прав, а также любые иные действия, нарушающие нормы УК РФ, КоАП РФ и иных нормативных актов.</p>
          </section>

          <section>
            <h2>5. Изменения в правилах</h2>
            <p>Мы оставляем за собой право изменять данные правила. Продолжение использования сервиса после внесения изменений означает ваше согласие с новой редакцией в соответствии с актуальными нормами права РФ.</p>
          </section>
        </div>

        <CButton v-if="canGoBack" @click="router.back()" variant="secondary">Назад</CButton>
        <CButton v-else @click="navigateTo('/')" variant="secondary">На главную</CButton>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const router = useRouter();
const canGoBack = ref(false);

onMounted(() => {
  if (window.history.length > 1) {
    canGoBack.value = true;
  }
});

definePageMeta({
  header: false,
});
</script>

<style scoped lang="scss">
@import "@/assets/styles/responsive_screen_breakpoints.scss";

.page-hero {
  min-height: 100vh;
  width: 100%;
  background: var(--color-bg-on-secondary);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.legal-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.legal-card {
  width: 800px;
  max-width: 100%;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;

  @media screen and (max-width: $app-mobile) {
    padding: 24px;
  }
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  
  .logo-icon {
    width: 60px;
    height: 60px;
  }
}

.legal-title {
  font-size: 28px;
  color: var(--color-primary-on-text);
  font-weight: 700;
  text-align: center;
}

.legal-content {
  color: var(--color-neutral-on-text);
  display: flex;
  flex-direction: column;
  gap: 24px;
  line-height: 1.6;

  .last-updated {
    font-size: 14px;
    opacity: 0.7;
    text-align: center;
    margin-bottom: 8px;
  }

  section {
    h2 {
      font-size: 20px;
      margin-bottom: 12px;
      color: var(--color-primary-on-text);
    }
    p {
      font-size: 16px;
      opacity: 0.9;
    }
  }
}
</style>
