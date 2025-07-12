<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    @keydown.enter.prevent="toggleTheme"
    @keydown.space.prevent="toggleTheme"
    :title="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
    aria-label="Переключить тему"
    type="button"
  >
    <span class="icon">
      <svg
        class="icon__shape icon__shape--sun"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="currentColor"
      >
        <circle cx="12" cy="12" r="5" />
        <g stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
      <svg
        class="icon__shape icon__shape--moon"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2A9.91 9.91 0 0 0 9 2.46A10 10 0 0 1 9 21.54A10 10 0 1 0 12 2Z" />
      </svg>
    </span>
  </button>
</template>

<script setup lang="ts">
const colorMode = useColorMode();
const isDark = ref(false);

onMounted(() => {
  isDark.value = colorMode.value === "dark";
});

function toggleTheme() {
  isDark.value = !isDark.value;
  colorMode.preference = isDark.value ? "dark" : "light";
}
</script>

<style scoped>
.theme-toggle {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.2s ease,
    background 0.3s ease,
    box-shadow 0.3s ease;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.theme-toggle:hover,
.theme-toggle:focus-visible {
  transform: scale(1.2);
  outline: none;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.icon {
  position: relative;
  width: 32px;
  height: 32px;
}

.icon__shape {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform-origin: center center;
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.icon__shape--sun {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.icon__shape--moon {
  opacity: 0;
  transform: rotate(-45deg) scale(1);
}
.dark {
  .theme-toggle {
    background: rgba(0, 0, 0, 0.6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .theme-toggle .icon__shape--sun {
    opacity: 0;
    transform: rotate(45deg) scale(1);
  }

  .theme-toggle .icon__shape--moon {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  .theme-toggle:hover,
  .theme-toggle:focus-visible {
    background: rgba(0, 0, 0, 0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
  }

  .theme-toggle .icon__shape--sun {
    opacity: 0;
    transform: rotate(45deg) scale(0.6);
  }

  .theme-toggle .icon__shape--moon {
    opacity: 1;
    transform: rotate(30deg) scale(1);
  }
}

.theme-toggle {
  color: var(--app-pink-500);
}
</style>
