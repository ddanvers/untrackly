<template>
  <main class="page-hero">
    <div class="legal-container">
      <div class="legal-card">
        <div class="logo-wrapper">
          <NuxtLink to="/">
            <Logo class="logo-icon" />
          </NuxtLink>
        </div>
        
        <h1 class="legal-title">Политика конфиденциальности</h1>
        
        <div class="legal-content">
          <div class="disclaimer-box">
            <p>Данное приложение разрабатывается в рамках личных образовательных потребностей в соответствии с пунктом 1 Перечня личных, семейных и домашних нужд (Постановление Правительства РФ от 31.07.2020 № 1173).</p>
            <p>Основание: ФЗ-149 "Об информации, информационных технологиях и о защите информации", статья 10.1, пункт 5.</p>
          </div>

          <p class="last-updated">Последнее обновление: 4 января 2026 г.</p>

          <section v-for="section in privacySections" :key="section.id" class="policy-section">
            <h2>{{ section.id }}. {{ section.title }}</h2>
            
            <div v-if="section.type === 'definitions'" class="definitions-list">
              <div v-for="(item, idx) in section.items" :key="idx" class="definition-item">
                <strong>{{ item.term }}</strong> <span v-html="item.definition"></span>
              </div>
            </div>

            <div v-else-if="section.type === 'mixed'" class="mixed-content">
              <div v-for="(item, idx) in section.items" :key="idx" class="mixed-item">
                <p v-html="item.text"></p>
                <ul v-if="item.items && item.items.length">
                  <li v-for="(subItem, subIdx) in item.items" :key="subIdx" v-html="subItem"></li>
                </ul>
              </div>
              <table v-if="section.tableRows" class="policy-table">
                <tr v-for="(row, rIdx) in section.tableRows" :key="rIdx">
                  <td><strong>{{ row.param }}</strong></td>
                  <td v-html="row.value"></td>
                </tr>
              </table>
            </div>

            <div v-else-if="section.type === 'paragraphs'" class="paragraphs-content">
              <p v-for="(item, idx) in section.items" :key="idx" v-html="item.text"></p>
            </div>
          </section>

          <section class="policy-section">
            <h2>Особенности регистрации</h2>
            <p>Регистрация в сервисе доступна исключительно для пользователей, которым был выдан актуальный секретный ключ лично Оператором. В процессе регистрации собираются следующие данные:</p>
            <ul>
              <li>Имя пользователя (отображаемое имя)</li>
              <li>Логин (идентификатор для входа)</li>
              <li>Пароль (в зашифрованном виде)</li>
            </ul>
            <p>Доступ к функционалу мессенджера ограничен кругом доверенных лиц.</p>
          </section>
        </div>

        <div class="footer-actions">
           <CButton v-if="canGoBack" @click="router.back()" variant="secondary">Назад</CButton>
           <CButton v-else @click="navigateTo('/')" variant="secondary">На главную</CButton>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  header: false,
});

const router = useRouter();
const canGoBack = ref(false);

onMounted(() => {
  if (window.history.length > 1) {
    canGoBack.value = true;
  }
});

const privacySections = [
  {
    id: 1,
    title: "Общие положения",
    type: "mixed",
    items: [
      {
        text: "Настоящая политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006. № 152-ФЗ «О персональных данных» (далее — Закон о персональных данных) и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые разработчиком приложения (далее — Оператор). Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну. Настоящая политика Оператора в отношении обработки персональных данных (далее — Политика) применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта untrackly.",
      },
    ],
  },
  {
    id: 2,
    title: "Основные понятия, используемые в Политике",
    type: "definitions",
    items: [
      {
        term: "Автоматизированная обработка персональных данных",
        definition:
          "- обработка персональных данных с помощью средств вычислительной техники.",
      },
      {
        term: "Блокирование персональных данных",
        definition:
          "- временное прекращение обработки персональных данных (за исключением случаев, если обработка необходима для уточнения персональных данных).",
      },
      {
        term: "Веб-сайт",
        definition:
          "- совокупность графических и информационных материалов, а также программ для ЭВМ и баз данных, обеспечивающих их доступность в сети интернет.",
      },
      {
        term: "Информационная система персональных данных",
        definition:
          "- совокупность содержащихся в базах данных персональных данных и обеспечивающих их обработку информационных технологий и технических средств.",
      },
      {
        term: "Обезличивание персональных данных",
        definition:
          "- действия, в результате которых невозможно определить без использования дополнительной информации принадлежность персональных данных конкретному Пользователю.",
      },
      {
        term: "Обработка персональных данных",
        definition:
          "- любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными.",
      },
      { term: "Пользователь", definition: "- любой посетитель веб-сайта." },
      {
        term: "Уничтожение персональных данных",
        definition:
          "- любые действия, в результате которых персональные данные уничтожаются безвозвратно.",
      },
    ],
  },
  {
    id: 3,
    title: "Основные права и обязанности Оператора",
    type: "mixed",
    items: [
      {
        text: "Оператор имеет право:",
        items: [
          "— получать от субъекта персональных данных достоверные информацию и/или документы, содержащие персональные данные;",
          "— самостоятельно определять состав и перечень мер, необходимых для выполнения обязанностей по Закону о персональных данных.",
        ],
      },
      {
        text: "Оператор обязан:",
        items: [
          "— предоставлять субъекту персональных данных информацию, касающуюся обработки его данных;",
          "— принимать технические меры для защиты персональных данных.",
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Принципы обработки персональных данных",
    type: "paragraphs",
    items: [
      {
        text: "Обработка персональных данных осуществляется на законной и справедливой основе.",
      },
      {
        text: "Обработка ограничивается достижением конкретных, заранее определенных целей.",
      },
      {
        text: "Содержание и объем обрабатываемых данных соответствуют заявленным целям.",
      },
    ],
  },
  {
    id: 5,
    title: "Цели обработки персональных данных",
    type: "mixed",
    tableRows: [
      {
        param: "Цель обработки",
        value: "предоставление доступа Пользователю к сервисам P2P-мессенджера",
      },
      {
        param: "Персональные данные",
        value: "Логин, Пароль, Отображаемое имя",
      },
      {
        param: "Правовые основания",
        value:
          "ФЗ-149 «Об информации, информационных технологиях и о защите информации»",
      },
    ],
  },
];
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
  width: 900px;
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

  .disclaimer-box {
    background: rgba(255, 176, 0, 0.1);
    border: 1px solid var(--color-primary-on-fill);
    border-radius: var(--radius-md);
    padding: 16px;
    font-size: 14px;
    color: var(--color-primary-on-text);
  }

  .last-updated {
    font-size: 14px;
    opacity: 0.7;
    text-align: center;
  }

  .policy-section {
    h2 {
      font-size: 20px;
      margin-bottom: 16px;
      color: var(--color-primary-on-text);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
    }

    .definition-item {
      margin-bottom: 12px;
      strong {
        color: var(--color-primary-on-text);
      }
    }

    .mixed-item {
      margin-bottom: 16px;
      ul {
        margin-top: 8px;
        padding-left: 20px;
        list-style-type: disc;
      }
    }

    .policy-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      
      td {
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 14px;

        strong {
          color: var(--color-primary-on-text);
        }
      }
    }
  }
}

.footer-actions {
  display: flex;
}
</style>
