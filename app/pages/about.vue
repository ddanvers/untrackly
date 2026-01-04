<template>
  <main class="page-about">
    <div class="page-about__container">
      <div class="header-section">
        <h1 class="page-title">Технологии & Безопасность</h1>
        <p class="page-subtitle">
          Untrackly использует передовые стандарты шифрования и архитектуру без серверов для обеспечения полной приватности.
        </p>
      </div>
      
      <div class="info-grid">
        <section class="info-card">
          <div class="info-card__content">
            <div class="info-card__header">
              <div class="icon-wrapper">
                <NuxtImg src="/icons/main/cards/web.svg" alt="P2P Architecture" />
              </div>
              <h2 class="info-card__title">Архитектура WebRTC</h2>
            </div>
            <p class="info-card__text">
              Мы используем децентрализованную сеть для прямой связи между устройствами.
              Сервер выполняет роль только <span class="highlight">сигнального брокера</span>.
            </p>
            
            <div class="tech-stack">
              <div 
                v-for="(item, key) in techData.webrtc" 
                :key="key"
                class="tech-item"
                @click="openDialog(item)"
              >
                <span class="tech-item__label">{{ item.label }}</span>
                <span class="tech-item__desc">{{ item.shortDesc }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="info-card">
          <div class="info-card__content">
            <div class="info-card__header">
               <div class="icon-wrapper">
                <NuxtImg src="/icons/main/cards/lock.svg" alt="Cryptography" />
              </div>
              <h2 class="info-card__title">Криптография E2EE</h2>
            </div>
            <p class="info-card__text">
              Все данные шифруются перед отправкой.
              Комбинация асимметричного и симметричного шифрования для максимальной защиты.
            </p>

             <div class="tech-stack">
              <div 
                v-for="(item, key) in techData.crypto" 
                :key="key"
                class="tech-item"
                @click="openDialog(item)"
              >
                <span class="tech-item__label">{{ item.label }}</span>
                <span class="tech-item__desc">{{ item.shortDesc }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="info-card">
          <div class="info-card__content">
            <div class="info-card__header">
               <div class="icon-wrapper">
                <NuxtImg src="/icons/main/cards/anon.svg" alt="Privacy" />
              </div>
              <h2 class="info-card__title">Приватность</h2>
            </div>
            <p class="info-card__text">
              Архитектура <strong>Zero-Knowledge</strong> гарантирует, что даже разработчики не могут получить доступ к вашим данным.
            </p>

             <div class="tech-stack">
              <div 
                v-for="(item, key) in techData.privacy" 
                :key="key"
                class="tech-item"
                @click="openDialog(item)"
              >
                <span class="tech-item__label">{{ item.label }}</span>
                <span class="tech-item__desc">{{ item.shortDesc }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <CDialog v-model="isDialogOpen" :mainTitle="selectedTech?.label" :showClose="true">
      <template #content>
        <div class="dialog-content">
          <p class="dialog-description">{{ selectedTech?.fullDesc }}</p>
          <div class="dialog-meta" v-if="selectedTech?.meta">
            <div class="meta-item" v-for="(val, key) in selectedTech.meta" :key="key">
              <span class="meta-label">{{ key }}:</span>
              <span class="meta-value">{{ val }}</span>
            </div>
          </div>
        </div>
      </template>
      <!-- Hide buttons for info dialog -->
      <template #footer><span></span></template>
    </CDialog>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  header: true,
});

interface TechItem {
  label: string;
  shortDesc: string;
  fullDesc: string;
  meta?: Record<string, string>;
}

const isDialogOpen = ref(false);
const selectedTech = ref<TechItem | null>(null);

function openDialog(item: TechItem) {
  selectedTech.value = item;
  isDialogOpen.value = true;
}

const techData: Record<string, TechItem[]> = {
  webrtc: [
    {
      label: "WebRTC Mesh",
      shortDesc: "Прямое соединение",
      fullDesc:
        "В архитектуре Mesh каждый участник чата устанавливает прямое, зашифрованное соединение с каждым другим участником. Это обеспечивает минимальную задержку и исключает необходимость в центральном сервере для ретрансляции медиапотоков, что повышает приватность, так как данные не проходят через третьи узлы.",
      meta: { Topology: "Full Mesh", Latency: "Minimal" },
    },
    {
      label: "PeerJS",
      shortDesc: "Signaling & Discovery",
      fullDesc:
        "PeerJS используется в качестве сигнального слоя. Он помогает браузерам найти друг друга и обменяться сетевой информацией (SDP) для начала соединения. После того как 'рукопожатие' завершено, PeerJS больше не участвует в передаче данных, и связь становится полностью прямой.",
      meta: { Role: "Signaling Broker", "Data Access": "None" },
    },
    {
      label: "SCTP",
      shortDesc: "Надежная доставка",
      fullDesc:
        "SCTP (Stream Control Transmission Protocol) используется внутри WebRTC Data Channels для передачи текстовых сообщений и файлов. Он обеспечивает гарантированную доставку (как TCP), но сохраняет границы сообщений (как UDP), что идеально подходит для чата.",
      meta: { Type: "Transport Protocol", Reliability: "High" },
    },
    {
      label: "STUN/TURN",
      shortDesc: "Обход NAT",
      fullDesc:
        "STUN серверы позволяют узнать свой публичный IP адрес за NAT. TURN серверы используются как релэй только в крайних случаях, когда прямое P2P соединение невозможно (например, из-за строгого корпоративного фаервола). Мы используем metered.live для надежности.",
      meta: { Provider: "metered.live" },
    },
  ],
  crypto: [
    {
      label: "ECDH P-256",
      shortDesc: "Обмен ключами",
      fullDesc:
        "Алгоритм Диффи-Хеллмана на эллиптических кривых (Elliptic Curve Diffie-Hellman) позволяет двум сторонам получить общий секретный ключ, используя незащищенный канал связи. Мы используем кривую NIST P-256, являющуюся современным стандартом веб-безопасности.",
      meta: { Curve: "P-256 (prime256v1)", Security: "128-bit level" },
    },
    {
      label: "AES-256-GCM",
      shortDesc: "Шифрование",
      fullDesc:
        "AES (Advanced Encryption Standard) в режиме GCM (Galois/Counter Mode) обеспечивает конфиденциальность и целостность данных. 256-битный ключ делает перебор практически невозможным, а GCM предотвращает подмену сообщений злоумышленником.",
      meta: { Algorithm: "AES", Mode: "GCM", "Key Length": "256 bits" },
    },
    {
      label: "Double Ratchet",
      shortDesc: "Смена ключей",
      fullDesc:
        "Протокол Double Ratchet обновляет ключи шифрования с каждым новым сообщением. Это обеспечивает прямую секретность (Forward Secrecy): компрометация одного ключа не дает доступа к предыдущей переписке, а также самовосстановление (Self-healing) при компрометации.",
      meta: { Property: "Forward Secrecy" },
    },
    {
      label: "HKDF SHA-256",
      shortDesc: "Деривация ключей",
      fullDesc:
        "Функция формирования ключа на основе HMAC (HKDF) используется для превращения общего секрета ECDH в криптографически стойкие ключи шифрования. Использование SHA-256 гарантирует высокую устойчивость к коллизиям.",
      meta: { Hash: "SHA-256", RFC: "5869" },
    },
  ],
  privacy: [
    {
      label: "Ephemeral Keys",
      shortDesc: "Ключи в RAM",
      fullDesc:
        "Все приватные ключи шифрования генерируются с флагом extractable: false (где поддерживается) и хранятся только в оперативной памяти браузера. Они никогда не записываются на диск и безвозвратно исчезают при закрытии вкладки.",
      meta: { Storage: "RAM Only", Persistence: "None" },
    },
    {
      label: "No DB",
      shortDesc: "Без баз данных",
      fullDesc:
        "Архитектура приложения исключает серверную базу данных для сообщений. Сервер не имеет функционала 'сохранить сообщение', так как он просто не может их прочитать. История чата существует только в момент общения.",
      meta: { Backend: "Stateless" },
    },
    {
      label: "Local Identity",
      shortDesc: "Анонимный ID",
      fullDesc:
        "Вместо регистрации через Email или телефон, приложение генерирует случайный UUID v4 на стороне клиента. Этот идентификатор используется только для маршрутизации WebRTC соединений в текущей сессии.",
      meta: { "ID Type": "UUID v4", Generated: "Client-side" },
    },
  ],
};
</script>

<style lang="scss" scoped>
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;

.page-about {
  min-height: calc(100vh - 72px);
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center; // Center vertically on desktop
  padding: 0 48px;
  overflow: hidden; // Prevent scrolling on main container for desktop

  @media screen and (max-width: $app-desktop) {
    height: auto;
    min-height: 100vh;
    padding: 24px;
    align-items: flex-start;
    overflow-y: auto;
  }

  @media screen and (max-height: 900px) {
    align-items: flex-start;
    overflow-y: auto;
    height: auto;
    padding-top: 32px;
    padding-bottom: 32px;
    
    .page-about__container {
      justify-content: flex-start;
    }
  }
}

.page-about__container {
  max-width: 1600px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center; // Center content vertically
  gap: 32px; // Reduced gap for tight desktop layout

  @media screen and (max-width: $app-desktop) {
    justify-content: flex-start;
    padding-top: 48px;
    gap: 48px;
  }
}

.header-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  
  // Flex-shrink ensures header doesn't eat too much space on small desktop heights
  flex-shrink: 0; 
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary-on-text) 0%, #fff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  
  @media screen and (max-width: $app-mobile) {
    font-size: 32px;
  }
}

.page-subtitle {
  font-size: 16px;
  color: var(--color-neutral-on-text);
  max-width: 600px;
  line-height: 1.5;
  opacity: 0.8;
}

.info-grid {
  display: flex;
  gap: 24px;
  width: 100%;
  align-items: stretch; // Make cards equal height
  
  // Desktop: Single row
  flex-direction: row;

  @media screen and (max-width: $app-desktop) {
    flex-direction: column; // Stack on tablet
  }

  @media screen and (max-width: $app-mobile) {
    // Mobile: Vertical stack taking full height logic
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }
}

.info-card {
  flex: 1; // Take equal width
  display: flex;
  flex-direction: column;
  background: var(--liquid-glass-bg);
  backdrop-filter: var(--liquid-glass-backdrop);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  
  @media screen and (max-width: $app-mobile) {
    min-height: 75vh; // Mobile: Take most of the screen
    justify-content: center; // Center content in the mobile view
  }

  &:hover {
    @media screen and (min-width: $app-desktop) {
      transform: translateY(-4px);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
    }
  }

  &__content {
    padding: 32px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    
    @media screen and (max-width: $app-mobile) {
      padding: 24px;
      gap: 32px;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 16px;
    
    @media screen and (max-width: $app-mobile) {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  }

  &__title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-black);
    margin: 0;

    @media screen and (max-width: $app-mobile) {
      font-size: 24px;
    }
  }

  .icon-wrapper {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 10px;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    @media screen and (max-width: $app-mobile) {
      width: 80px;
      height: 80px;
      padding: 16px;
      border-radius: 20px;
    }
  }

  &__text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-neutral-on-text);
    opacity: 0.9;
    flex-grow: 1; // Content fills space
    
    .highlight {
      color: var(--color-primary-on-text);
      font-weight: 500;
    }

    @media screen and (max-width: $app-mobile) {
       text-align: center;
       font-size: 16px;
       flex-grow: 0;
    }
  }
}

.tech-stack {
  display: grid;
  // Compact grid for desktop
  grid-template-columns: 1fr; 
  gap: 12px;
  margin-top: auto; // Push to bottom if space permits
}

.tech-item {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--color-primary-on-text);
    transform: translateX(4px);
  }

  &__label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-primary-on-text);
  }

  &__desc {
    font-size: 12px;
    color: var(--color-neutral-on-text);
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// Dialog Styles
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dialog-description {
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-neutral-on-text);
}

.dialog-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 12px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .meta-label {
    color: var(--color-neutral-on-text);
    opacity: 0.7;
  }
  
  .meta-value {
    color: var(--color-primary-on-text);
    font-family: monospace;
    font-weight: 600;
  }
}
</style>
