<template>
  <div class="c-table-container" :style="tableStyle">
    <!-- Static Header (No Scrollbar) -->
    <div class="c-table-header">
      <div 
        v-for="header in headers" 
        :key="header.key" 
        class="header-cell"
        :style="{ width: header.width || '1fr' }"
      >
        {{ header.label }}
      </div>
    </div>
    
    <!-- Scrollable Body -->
    <div class="c-table-scroll">
      <table class="c-table-grid">
        <tbody class="c-table-tbody">
          <slot />
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface TableHeader {
  key: string;
  label: string;
  width?: string;
}

interface Props {
  headers: TableHeader[];
}

const props = defineProps<Props>();

// Build grid template columns based on headers
// If width is provided, use it, otherwise 1fr
const tableStyle = computed(() => {
  const colTemplate = props.headers
    .map((h) => (h.width ? h.width : "1fr"))
    .join(" ");

  return {
    "--table-cols": colTemplate,
  };
});
</script>

<style scoped lang="scss">
.c-table-container {
  // Define scrollbar width centrally to ensure sync
  --scrollbar-width: 6px;
  
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  border-radius: var(--radius-lg);
  overflow: hidden; 
  transform: translateZ(0);
  
  background: var(--liquid-glass-bg);
  backdrop-filter: var(--liquid-glass-backdrop);
  box-shadow: var(--liquid-glass-shadow);
}

.c-table-header {
  display: grid;
  grid-template-columns: var(--table-cols);
  width: 100%;
  flex: 0 0 auto;
  
  background: var(--color-bg-on-secondary-light);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.02);
  z-index: 20;
  
  // padding-right equals scrollbar width to match body's available content width
  padding-right: var(--scrollbar-width); 
}

.header-cell {
  padding: 16px 12px; // Adjusted padding (vertical/horizontal)
  text-align: left;
  color: var(--gray-4); 
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  
  // Critical for grid alignment: prevent content from pushing width
  min-width: 0; 
  overflow: hidden;
  text-overflow: ellipsis;
  
  display: flex;
  align-items: center;
}

.c-table-scroll {
  flex: 1;
  width: 100%;
  overflow-y: scroll; // Always show vertical scrollbar
  overflow-x: hidden; 
  min-height: 0;

  &::-webkit-scrollbar {
    width: var(--scrollbar-width);
    height: var(--scrollbar-width);
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 99px;
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
  &::-webkit-scrollbar-corner {
    background: transparent;
  }
}

.c-table-grid {
  width: 100%;
  display: block; 
  border-collapse: collapse;
}

.c-table-tbody {
  display: block;
  width: 100%;
}

:slotted(tr) {
  display: grid !important;
  grid-template-columns: var(--table-cols);
  width: 100%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

:slotted(td) {
  padding: 16px 12px; // Matching header padding
  text-align: left;
  color: var(--gray-1); 
  font-size: 15px;
  font-weight: 400;
  display: flex;
  align-items: center;
  
  // Critical for grid alignment
  min-width: 0;
  overflow: hidden; 
  text-overflow: ellipsis;
  white-space: nowrap; 
}

:slotted(tr:last-child) {
  border-bottom: none;
}

:slotted(tr:hover) {
  background-color: rgba(255, 255, 255, 0.03);
}
</style>
