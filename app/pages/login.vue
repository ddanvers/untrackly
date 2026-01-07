<template>
  <main class="page-hero">
    <div class="login-container">
      <div class="login-card">
        <div class="logo-wrapper">
          <Logo class="logo-icon" :isClosed="isLogoClosed" />
        </div>
        
        <h2 class="login-title">{{ mode === 'login' ? 'Авторизация' : 'Регистрация' }}</h2>
        
        <CForm ref="form" @submit.prevent="handleLogin" class="login-form">
          <CInput
            v-model="authData.username"
            label="Логин"
            placeholder="Введите логин"
            valid
            errorShow
            :errorMessage="error"
            @update:modelValue="error = ''"
          />
          <CInput
            v-model="authData.password"
            label="Пароль"
            type="password"
            placeholder="Введите пароль"
            valid
            errorShow
            :errorMessage="error"
             @update:modelValue="error = ''"
             @toggle-visibility="(visible) => isLogoClosed = visible"
          />
          <CInput
            v-if="mode === 'register'"
            v-model="authData.displayName"
            label="Имя"
            placeholder="Введите ваше имя"
            valid
            errorShow
            :errorMessage="error"
            @update:modelValue="error = ''"
          />
          <CInput
            v-if="mode === 'register'"
            v-model="authData.secretKey"
            label="Секретный ключ"
            placeholder="Введите ключ"
            valid
            errorShow
            :errorMessage="error"
            @update:modelValue="error = ''"
          />
          <div         v-if="mode === 'register'" class="agreement-checkbox-wrapper">
          <CCheckbox
            v-model="isAgreed"
            class="agreement-checkbox mt-2"
            :class="{ 'agreement-checkbox--error': showAgreementError }"
          >
            <span class="agreement-text">
              Я согласен с 
              <NuxtLink to="/terms">правилами пользования</NuxtLink> 
              и 
              <NuxtLink to="/privacy">политикой конфиденциальности</NuxtLink>
            </span>
          </CCheckbox>  
          </div>
          <CButton 
            type="submit" 
            fill 
            :loading="isLoading"
            @click="handleLogin"
            :class="mode === 'register' ? 'mt-6' : 'mt-2'"
          >
            {{ mode === 'login' ? 'Войти' : 'Зарегистрироваться' }}
          </CButton>
        </CForm>
        <section class="change-mode">
          <p v-if="mode === 'login'">Нет аккаунта? <span @click="changeMode">Зарегистрироваться</span></p>
          <p v-else>Есть аккаунт? <span @click="changeMode">Войти</span></p>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  header: false,
});

const { login, register } = useAuth();
const route = useRoute();
const router = useRouter();
const { showAlert } = useAlert();

const formBlock = useTemplateRef("form");
const authData = reactive({
  username: "",
  password: "",
  displayName: "",
  secretKey: "",
});
const error = ref("");
const isLoading = ref(false);
const isLogoClosed = ref(false);

const getInitialMode = (): "login" | "register" => {
  const queryMode = route.query.mode;
  if (queryMode === "register") return "register";
  return "login";
};

const mode = shallowRef<"login" | "register">(getInitialMode());
const isAgreed = ref(false);
const showAgreementError = ref(false);

watch(
  () => route.query.mode,
  (newMode) => {
    if (newMode === "register" || newMode === "login") {
      mode.value = newMode;
    } else {
      mode.value = "login";
    }
  },
);

watch(isAgreed, (val) => {
  if (val) showAgreementError.value = false;
});

const handleLogin = async () => {
  error.value = "";
  showAgreementError.value = !isAgreed.value;

  const isFormValid = formBlock.value?.validate();

  if (!isFormValid || (!isAgreed.value && mode.value === "register")) {
    if (!isFormValid) error.value = "Обязательно к заполнению";
    return;
  }

  isLoading.value = true;
  try {
    if (mode.value === "login") {
      const success = await login(authData.username, authData.password);
      if (success) {
        const redirect = (route.query.redirect as string) || "/";
        navigateTo(redirect);
      } else {
        showAlert("Неверные данные", "error");
      }
    } else {
      const success = await register(authData);
      if (success) {
        const redirect = (route.query.redirect as string) || "/";
        navigateTo(redirect);
      } else {
        showAlert("Произошла ошибка", "error");
      }
    }
  } catch (e) {
    showAlert("Произошла ошибка", "error");
  } finally {
    isLoading.value = false;
  }
};

const changeMode = () => {
  const newMode = mode.value === "login" ? "register" : "login";
  router.replace({ query: { ...route.query, mode: newMode } });

  if (newMode === "register") {
    authData.displayName = "";
    authData.secretKey = "";
    authData.password = "";
    authData.username = "";
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
.agreement-checkbox-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
}
.agreement-checkbox {
  align-items: flex-start;
  &--error {
    :deep(.c-checkbox__box) {
      border-color: var(--color-negative-on-text);
    }
  }
}

.agreement-text {
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-neutral-on-text);
  
  a {
    color: var(--color-primary-on-text);
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 0.8;
    }
  }
}

.change-mode {
  color: var(--color-neutral-on-text);
  p {
    display: flex;
    gap: 8px;
    align-items: center;
    span {
      cursor: pointer;
      color: var(--color-primary-on-text);
      transition: opacity 0.2s ease;
      &:hover {
        opacity: 0.8;
      }
    }
  }
}
</style>
