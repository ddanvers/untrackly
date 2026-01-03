<template>
  <main class="page-hero">
    <div class="login-container">
      <div class="login-card">
        <div class="logo-wrapper">
          <Logo class="logo-icon" :isClosed="isLogoClosed" />
        </div>
        
        <h2 class="login-title">Авторизация</h2>
        
        <CForm ref="form" @submit.prevent="handleLogin" class="login-form">
          <CInput
            v-model="username"
            label="Логин"
            placeholder="Введите логин"
            valid
            errorShow
            :errorMessage="error"
            @update:modelValue="error = ''"
          />

          <CInput
            v-model="password"
            label="Пароль"
            type="password"
            placeholder="Введите пароль"
            valid
            errorShow
            :errorMessage="error"
             @update:modelValue="error = ''"
             @toggle-visibility="(visible) => isLogoClosed = visible"
          />

          <CButton 
            type="submit" 
            fill 
            :loading="isLoading"
            @click="handleLogin"
          >
            Войти
          </CButton>
        </CForm>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const { login } = useAuth();
const route = useRoute();
const { showAlert } = useAlert();

const formBlock = useTemplateRef("form");

const username = ref("");
const password = ref("");
const error = ref("");
const isLoading = ref(false);
const isLogoClosed = ref(false);

const handleLogin = async () => {
  error.value = "";
  if (!formBlock.value?.validate()) {
    error.value = "Обязательно к заполнению";
    return;
  }

  isLoading.value = true;
  try {
    const success = await login(username.value, password.value);
    if (success) {
      const redirect = (route.query.redirect as string) || "/";
      navigateTo(redirect);
    } else {
      showAlert("Неверные данные", "error");
    }
  } catch (e) {
    showAlert("Произошла ошибка", "error");
  } finally {
    isLoading.value = false;
  }
};
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
  padding: 20px;
}

.login-container {
  width: 100%;
  border-radius: var(--radius-lg);
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  width: 440px;
  max-width: 100%;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;

  @media screen and (max-width: $app-mobile) {
    padding: 24px;
    width: 100%;
  }
}

.logo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .logo-icon {
    width: 80px;
    height: 80px;
  }

  .brand-name {
    font-weight: 700;
    font-size: 32px;
    background: linear-gradient(135deg, var(--orange-3) 0%, var(--orange-5) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }
}

.login-title {
  font-size: 20px;
  color: var(--color-primary-on-text);
  font-weight: 400;
  text-align: center;
  opacity: 0.9;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-text {
  color: #ef4444;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
}
</style>
