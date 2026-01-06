<template>
  <div class="admin-page">
    <div class="users-card">
      <h2 class="users-card__title">Пользователи</h2>
      
      <div v-if="loading" class="loading-state">
        Загрузка...
      </div>
      
      <div v-else-if="error" class="error-state">
        {{ error }}
      </div>

      <div class="table-wrapper" v-else>
        <CTable :headers="headers">
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.displayName }}</td>
            <td>
              <span :class="['role-badge', user.role]">
                {{ user.role === 'admin' ? 'Админ' : 'Пользователь' }}
              </span>
            </td>
            <td>
              <CButton 
                v-if="user.role !== 'admin'"
                @click="deleteUser(user.id)" 
                variant="primary" 
                size="small"
                bgColor="var(--red-700)"
                :loading="deleting === user.id"
              >
                Удалить
              </CButton>
            </td>
          </tr>
        </CTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableHeader } from "~/components/CTable/Index.vue";

definePageMeta({
  header: true,
});

const loading = ref(true);
const error = ref("");
const users = ref<any[]>([]);
const deleting = ref<number | null>(null);

const headers: TableHeader[] = [
  { key: "id", label: "ID", width: "60px" },
  { key: "username", label: "Логин", width: "1.5fr" },
  { key: "displayName", label: "Отображаемое имя", width: "1.5fr" },
  { key: "role", label: "Роль", width: "140px" },
  { key: "actions", label: "Действия", width: "120px" },
];

const fetchUsers = async () => {
  try {
    loading.value = true;
    error.value = "";
    const data = await $fetch("/api/admin/users");
    users.value = [...data.users, ...data.users];
  } catch (e: any) {
    error.value =
      "Ошибка загрузки пользователей: " + (e.response?.statusText || e.message);
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const deleteUser = async (id: number) => {
  if (!confirm("Вы уверены, что хотите удалить этого пользователя?")) return;

  deleting.value = id;
  try {
    await $fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    users.value = users.value.filter((u) => u.id !== id);
  } catch (e) {
    alert("Ошибка при удалении пользователя");
    console.error(e);
  } finally {
    deleting.value = null;
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped lang="scss">
.admin-page {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
  height: calc(100vh - 72px); // Full viewport height minus header
  display: flex;
  flex-direction: column;
}

.users-card {
  // Container logic only, visuals handled by CTable
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; // Crucial for nested flex scrolling

  &__title {
    margin-top: 0;
    margin-bottom: 32px;
    color: var(--color-black);
    font-size: 32px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .table-wrapper {
    flex: 1;
    overflow: hidden; // Delegate scrolling to CTable container
    min-height: 0;
  }
}

.role-badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  backdrop-filter: blur(4px);
  
  &.admin {
    background-color: rgba(255, 176, 0, 0.15); // Orange nice transparent
    color: var(--orange-source);
    border: 1px solid rgba(255, 176, 0, 0.2);
  }
  
  &.user {
     background-color: rgba(255, 255, 255, 0.1); // Gray glass
     color: var(--gray-2);
     border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px;
  color: var(--gray-4);
  background: var(--liquid-glass-bg);
  backdrop-filter: var(--liquid-glass-backdrop);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
