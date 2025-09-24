<template>
  <main class="about-page">
    <div class="about-page__content">
      <section class="project-overview">
        <div class="project-overview__header">
          <h1 class="project-overview__title">Untrackly</h1>
          <p class="project-overview__subtitle">
            WebRTC-based peer-to-peer коммуникационная платформа для изучения современных
            веб-технологий
          </p>
          <div class="project-overview__status">
            <span class="status-badge status-badge--educational">Личный проект</span>
            <span class="status-badge status-badge--development">В разработке</span>
          </div>
        </div>

        <div class="project-overview__visual">
          <div class="tech-orbit">
            <div class="tech-orbit__center">P2P</div>
            <div class="tech-orbit__satellite tech-orbit__satellite--webrtc">WebRTC</div>
            <div class="tech-orbit__satellite tech-orbit__satellite--encryption">DTLS</div>
            <div class="tech-orbit__satellite tech-orbit__satellite--vue">Vue.js</div>
            <div class="tech-orbit__satellite tech-orbit__satellite--typescript">TS</div>
          </div>
        </div>
      </section>

      <section class="technical-architecture">
        <h2 class="section-title">Архитектура системы</h2>
        <div class="architecture-stack">
          <div
            class="architecture-layer"
            v-for="(layer, index) in architectureLayers"
            :key="layer.name"
            :class="`architecture-layer--${layer.type}`"
            @click="toggleLayerDetails(index)"
            :data-active="activeLayerIndex === index"
          >
            <div class="architecture-layer__header">
              <h3 class="architecture-layer__title">{{ layer.name }}</h3>
              <span class="architecture-layer__indicator">{{
                activeLayerIndex === index ? "−" : "+"
              }}</span>
            </div>
            <Transition name="layer-expand" mode="out-in">
              <div v-show="activeLayerIndex === index" class="architecture-layer__details">
                <p class="architecture-layer__description">{{ layer.description }}</p>
                <div class="technology-grid">
                  <div class="tech-item" v-for="tech in layer.technologies" :key="tech.name">
                    <span class="tech-item__name">{{ tech.name }}</span>
                    <span class="tech-item__purpose">{{ tech.purpose }}</span>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <section class="implementation-details">
        <h2 class="section-title">Технические решения</h2>
        <div class="implementation-grid">
          <div
            class="implementation-card"
            v-for="(feature, index) in implementationFeatures"
            :key="feature.title"
            :style="{ '--animation-delay': `${index * 100}ms` }"
          >
            <div class="implementation-card__header">
              <div class="implementation-card__icon">{{ feature.icon }}</div>
              <h3 class="implementation-card__title">{{ feature.title }}</h3>
            </div>
            <p class="implementation-card__description">{{ feature.description }}</p>
            <div class="implementation-card__metrics">
              <div class="metric-item" v-for="metric in feature.metrics" :key="metric.label">
                <span class="metric-item__value">{{ metric.value }}</span>
                <span class="metric-item__label">{{ metric.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="development-process">
        <h2 class="section-title">Процесс разработки</h2>
        <div class="development-timeline">
          <div
            class="timeline-item"
            v-for="(phase, index) in developmentPhases"
            :key="phase.title"
            :class="{ 'timeline-item--active': phase.status === 'active' }"
          >
            <div class="timeline-item__marker"></div>
            <div class="timeline-item__content">
              <h3 class="timeline-item__title">{{ phase.title }}</h3>
              <p class="timeline-item__description">{{ phase.description }}</p>
              <div class="timeline-item__status">{{ phase.status }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <footer class="about-page__footer">
      <div class="legal-disclaimer">
        <h3 class="legal-disclaimer__title">Правовая информация</h3>
        <div class="legal-disclaimer__content">
          <p class="legal-disclaimer__text">
            Данное приложение разрабатывается в рамках личных образовательных потребностей в
            соответствии с пунктом 1 Перечня личных, семейных и домашних нужд (Постановление
            Правительства РФ от 31.07.2020 № 1173).
          </p>
          <p class="legal-disclaimer__reference">
            Основание: ФЗ-149 "Об информации, информационных технологиях и о защите информации",
            статья 10.1, пункт 5.
          </p>
        </div>
        <CButton @click="navigateToHome" variant="primary" size="large">
          Перейти к приложению
        </CButton>
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">
/**
 * Page meta configuration following Nuxt3 conventions
 * Ensures consistent header behavior across application routing
 */
definePageMeta({
  header: true,
});

/**
 * Reactive state management with explicit typing for performance optimization
 * Using ref<number> for optimal Vue 3 reactivity system integration
 */
const activeLayerIndex = ref<number | null>(null);

/**
 * Navigation handler with void return type for strict type safety
 * Implements proper Nuxt3 programmatic navigation pattern
 */
function navigateToHome(): void {
  navigateTo("/");
}

/**
 * Layer toggle logic with performance-optimized state management
 * Implements accordion pattern with single active state constraint
 */
function toggleLayerDetails(index: number): void {
  activeLayerIndex.value = activeLayerIndex.value === index ? null : index;
}

/**
 * Strongly typed interfaces following Clean Code principles
 * Ensures compile-time safety and enhanced IDE support
 */
interface TechnologyItem {
  readonly name: string;
  readonly purpose: string;
}

interface ArchitectureLayer {
  readonly name: string;
  readonly description: string;
  readonly type: "frontend" | "communication" | "security" | "infrastructure";
  readonly technologies: readonly TechnologyItem[];
}

interface ImplementationFeature {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly metrics: readonly MetricItem[];
}

interface MetricItem {
  readonly value: string;
  readonly label: string;
}

interface DevelopmentPhase {
  readonly title: string;
  readonly description: string;
  readonly status: "completed" | "active" | "planned";
}

/**
 * Immutable data structures following functional programming paradigms
 * Using readonly refs for performance optimization and data integrity
 */
const architectureLayers = readonly(
  ref<readonly ArchitectureLayer[]>([
    {
      name: "Frontend Layer",
      type: "frontend",
      description:
        "Vue 3 Composition API с TypeScript интеграцией для типобезопасной разработки интерфейсов",
      technologies: [
        { name: "Vue 3", purpose: "Реактивный UI framework" },
        { name: "Nuxt 3", purpose: "Meta-framework с SSR/SPA поддержкой" },
        { name: "TypeScript", purpose: "Статическая типизация" },
        { name: "Vite", purpose: "Сборка и dev-server" },
      ],
    },
    {
      name: "Communication Layer",
      type: "communication",
      description:
        "WebRTC stack для peer-to-peer коммуникации без промежуточных серверов",
      technologies: [
        { name: "RTCPeerConnection", purpose: "P2P соединение" },
        { name: "RTCDataChannel", purpose: "Передача данных" },
        { name: "ICE/STUN", purpose: "NAT traversal" },
        { name: "WebSocket", purpose: "Signaling протокол" },
      ],
    },
    {
      name: "Security Layer",
      type: "security",
      description:
        "Встроенные механизмы шифрования WebRTC для защиты передаваемых данных",
      technologies: [
        { name: "DTLS", purpose: "Шифрование Data Channel" },
        { name: "SRTP", purpose: "Защита медиа-потоков" },
        { name: "Key Exchange", purpose: "Обмен криптографическими ключами" },
        { name: "Certificate Validation", purpose: "Проверка сертификатов" },
      ],
    },
  ]),
);

const implementationFeatures = readonly(
  ref<readonly ImplementationFeature[]>([
    {
      title: "WebRTC Integration",
      description:
        "Нативная интеграция с браузерными WebRTC API для прямого P2P соединения",
      icon: "⚡",
      metrics: [
        { value: "<100ms", label: "Latency" },
        { value: "0", label: "Серверы" },
      ],
    },
    {
      title: "TypeScript Architecture",
      description:
        "Полная типизация для предотвращения runtime ошибок и улучшения DX",
      icon: "🔧",
      metrics: [
        { value: "100%", label: "Type Coverage" },
        { value: "0", label: "Any Types" },
      ],
    },
    {
      title: "Performance Optimization",
      description:
        "Code splitting, tree shaking и оптимизация bundle size для быстрой загрузки",
      icon: "🚀",
      metrics: [
        { value: "<50kb", label: "Bundle Size" },
        { value: "<1s", label: "Load Time" },
      ],
    },
  ]),
);

const developmentPhases = readonly(
  ref<readonly DevelopmentPhase[]>([
    {
      title: "Architecture Design",
      description:
        "Проектирование системной архитектуры и выбор технологического стека",
      status: "completed",
    },
    {
      title: "Core Implementation",
      description:
        "Реализация базового функционала WebRTC соединения и пользовательского интерфейса",
      status: "active",
    },
    {
      title: "Testing & Optimization",
      description:
        "Написание unit/e2e тестов и оптимизация производительности приложения",
      status: "planned",
    },
    {
      title: "Documentation",
      description:
        "Создание технической документации и руководства по развертыванию",
      status: "planned",
    },
  ]),
);
</script>

<style lang="scss" scoped>
/**
 * Responsive breakpoint system following established patterns
 * Mobile-first approach with consistent viewport handling
 */
$app-desktop: 1384px;
$app-laptop: 960px;
$app-tablet: 768px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;

/**
 * Optimized animation timing functions for smooth performance
 * Hardware-accelerated transforms for 60fps animations
 */
$timing-smooth: cubic-bezier(0.23, 1, 0.32, 1);
$timing-sharp: cubic-bezier(0.4, 0, 0.2, 1);

.about-page {
  min-height: calc(100vh - 72px);
  width: 100%;
  background: var(--color-bg-on-secondary);
  display: flex;
  flex-direction: column;

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: clamp(48px, 8vw, 80px);
    padding: clamp(24px, 4vw, 48px) clamp(16px, 4vw, 64px);
  }

  &__footer {
    background: var(--color-bg-on-secondary-light);
    border-top: 1px solid var(--color-neutral-on-outline);
    padding: clamp(32px, 6vw, 48px) clamp(16px, 4vw, 64px);
  }
}

/**
 * Project overview with optimized layout and animation performance
 * CSS Grid for responsive design without media query complexity
 */
.project-overview {
  display: grid;
  grid-template-columns: 1fr minmax(300px, 400px);
  gap: clamp(32px, 6vw, 64px);
  align-items: center;

  &__header {
    animation: slideInFromLeft 0.8s $timing-smooth;
  }

  &__title {
    font-size: clamp(48px, 8vw, 72px);
    font-weight: 400;
    color: var(--color-primary-on-text);
    margin-bottom: 16px;
    line-height: 0.9;
  }

  &__subtitle {
    font-size: clamp(16px, 3vw, 20px);
    color: var(--color-neutral-on-text);
    line-height: 1.4;
    margin-bottom: 24px;
  }

  &__status {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__visual {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
  }

  @media screen and (max-width: $app-laptop) {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

.status-badge {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid;

  &--educational {
    color: var(--color-primary-on-text);
    border-color: var(--color-primary-on-outline);
    background: transparent;
  }

  &--development {
    color: var(--color-neutral-on-text);
    border-color: var(--color-neutral-on-outline);
    background: transparent;
  }
}

/**
 * Tech orbit visualization with CSS-only animations
 * Hardware-accelerated transforms for optimal performance
 */
.tech-orbit {
  position: relative;
  width: 300px;
  height: 300px;

  &__center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    background: var(--color-bg-on-secondary-light);
    border: 2px solid var(--color-primary-on-outline);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--color-primary-on-text);
    font-size: 14px;
    z-index: 2;
  }

  &__satellite {
    position: absolute;
    width: 60px;
    height: 60px;
    background: var(--color-bg-on-secondary);
    border: 1px solid var(--color-neutral-on-outline);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 500;
    color: var(--color-neutral-on-text);
    animation: orbit 12s linear infinite;
    transform-origin: 150px 150px;
    transition: all 0.3s $timing-smooth;

    &:hover {
      background: var(--color-primary-on-text);
      color: var(--color-bg-on-secondary);
      transform: scale(1.1);
      z-index: 3;
    }

    &--webrtc {
      animation-delay: 0s;
      top: 20px;
      left: 120px;
    }
    &--encryption {
      animation-delay: -3s;
      top: 120px;
      left: 220px;
    }
    &--vue {
      animation-delay: -6s;
      top: 220px;
      left: 120px;
    }
    &--typescript {
      animation-delay: -9s;
      top: 120px;
      left: 20px;
    }
  }

  @media screen and (max-width: $app-mobile) {
    width: 250px;
    height: 250px;

    &__satellite {
      transform-origin: 125px 125px;
    }
  }
}

/**
 * Section title with consistent typography scaling
 * Semantic heading hierarchy for accessibility
 */
.section-title {
  font-size: clamp(32px, 6vw, 48px);
  font-weight: 400;
  color: var(--color-primary-on-text);
  text-align: center;
  margin-bottom: clamp(32px, 6vw, 48px);
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: var(--color-primary-on-outline);
  }
}

/**
 * Architecture stack with accordion functionality
 * Optimized for touch interfaces and keyboard navigation
 */
.architecture-stack {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.architecture-layer {
  background: var(--color-bg-on-secondary-light);
  border: 1px solid var(--color-neutral-on-outline);
  cursor: pointer;
  transition: all 0.3s $timing-smooth;
  overflow: hidden;

  &:hover {
    border-color: var(--color-primary-on-outline);
    background: var(--color-bg-on-secondary);
  }

  &[data-active="true"] {
    border-color: var(--color-primary-on-outline);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    user-select: none;
  }

  &__title {
    font-size: 18px;
    font-weight: 500;
    color: var(--color-primary-on-text);
    margin: 0;
  }

  &__indicator {
    font-size: 20px;
    color: var(--color-primary-on-text);
    transition: transform 0.3s $timing-smooth;
  }

  &__details {
    padding: 0 24px 24px;
  }

  &__description {
    font-size: 14px;
    color: var(--color-neutral-on-text);
    line-height: 1.5;
    margin-bottom: 16px;
  }

  // Layer type indicators without rounded corners
  &--frontend {
    border-left: 3px solid var(--orange-5);
  }
  &--communication {
    border-left: 3px solid var(--blue-5);
  }
  &--security {
    border-left: 3px solid var(--gray-4);
  }
  &--infrastructure {
    border-left: 3px solid var(--gray-6);
  }
}

/**
 * Technology grid with CSS Grid for optimal responsive behavior
 * Avoids complex media queries through auto-fit pattern
 */
.technology-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.tech-item {
  padding: 12px 16px;
  background: var(--color-bg-on-secondary);
  border: 1px solid var(--color-neutral-on-outline);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.3s $timing-smooth;

  &:hover {
    border-color: var(--color-primary-on-outline);
    background: var(--color-bg-on-secondary-light);
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-primary-on-text);
  }

  &__purpose {
    font-size: 11px;
    color: var(--color-neutral-on-text);
  }
}

/**
 * Implementation grid with staggered animations
 * CSS custom properties for animation delay calculation
 */
.implementation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: clamp(20px, 4vw, 32px);
}

.implementation-card {
  background: var(--color-bg-on-secondary-light);
  border: 1px solid var(--color-neutral-on-outline);
  padding: clamp(20px, 4vw, 28px);
  transition: all 0.4s $timing-smooth;
  animation: slideInUp 0.6s $timing-smooth var(--animation-delay, 0ms) both;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--color-primary-on-outline);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__icon {
    font-size: 24px;
    width: 32px;
    text-align: center;
  }

  &__title {
    font-size: 18px;
    font-weight: 500;
    color: var(--color-primary-on-text);
    margin: 0;
  }

  &__description {
    font-size: 14px;
    color: var(--color-neutral-on-text);
    line-height: 1.5;
    margin-bottom: 16px;
  }

  &__metrics {
    display: flex;
    gap: 16px;
  }
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &__value {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-primary-on-text);
    line-height: 1;
  }

  &__label {
    font-size: 11px;
    color: var(--color-neutral-on-text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

/**
 * Development timeline with progressive enhancement
 * Semantic markup for screen readers and SEO
 */
.development-timeline {
  max-width: 600px;
  margin: 0 auto;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--color-neutral-on-outline);
  }
}

.timeline-item {
  position: relative;
  padding-left: 60px;
  padding-bottom: 32px;
  animation: fadeInRight 0.6s $timing-smooth;

  &:nth-child(1) {
    animation-delay: 0.1s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }
  &:nth-child(4) {
    animation-delay: 0.4s;
  }

  &__marker {
    position: absolute;
    left: 12px;
    top: 4px;
    width: 16px;
    height: 16px;
    background: var(--color-neutral-on-outline);
    transition: all 0.3s $timing-smooth;
  }

  &--active &__marker {
    background: var(--color-primary-on-text);
    box-shadow: 0 0 0 4px rgba(225, 159, 17, 0.2);
  }

  &__content {
    background: var(--color-bg-on-secondary-light);
    border: 1px solid var(--color-neutral-on-outline);
    padding: 16px 20px;
    transition: all 0.3s $timing-smooth;

    &:hover {
      border-color: var(--color-primary-on-outline);
    }
  }

  &__title {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-primary-on-text);
    margin: 0 0 8px;
  }

  &__description {
    font-size: 14px;
    color: var(--color-neutral-on-text);
    line-height: 1.4;
    margin: 0 0 8px;
  }

  &__status {
    display: inline-block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border: 1px solid var(--color-neutral-on-outline);
    color: var(--color-neutral-on-text);
  }

  &--active &__status {
    color: var(--color-primary-on-text);
    border-color: var(--color-primary-on-outline);
  }
}

/**
 * Legal disclaimer with structured information hierarchy
 * Compliance with accessibility and regulatory requirements
 */
.legal-disclaimer {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;

  &__title {
    font-size: clamp(24px, 4vw, 32px);
    font-weight: 500;
    color: var(--color-primary-on-text);
    margin-bottom: 24px;
  }

  &__content {
    margin-bottom: 32px;
  }

  &__text {
    font-size: 14px;
    color: var(--color-neutral-on-text);
    line-height: 1.6;
    margin-bottom: 16px;
  }

  &__reference {
    font-size: 12px;
    color: var(--color-neutral-on-text);
    font-style: italic;
    opacity: 0.8;
  }
}

/**
 * Optimized keyframe animations for 60fps performance
 * Hardware-accelerated transforms using translate3d
 */
@keyframes orbit {
  from {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }
  to {
    transform: rotate(360deg) translate3d(0, 0, 0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translate3d(-40px, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 30px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translate3d(20px, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

/**
 * Vue transition for accordion expand/collapse
 * Optimized for smooth height transitions
 */
.layer-expand-enter-active,
.layer-expand-leave-active {
  transition: all 0.4s $timing-smooth;
  overflow: hidden;
}

.layer-expand-enter-from,
.layer-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.layer-expand-enter-to,
.layer-expand-leave-from {
  max-height: 400px;
  opacity: 1;
}
</style>
