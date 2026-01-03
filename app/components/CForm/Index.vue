<template>
  <form ref="form" novalidate @keydown.enter.prevent>
    <slot></slot>
  </form>
</template>
<script setup lang="ts">
const form = ref<HTMLFormElement>();
function validate(event: SubmitEvent) {
  let valid = true;
  if (form.value) {
    const listInput = form.value.getElementsByTagName("input");
    const listTextarea = form.value.getElementsByTagName("textarea");
    const combinedArray = [...listInput, ...listTextarea];
    for (let index = 0; index < combinedArray.length; index++) {
      const element = combinedArray[index];
      if (element?.onsubmit) {
        const validateItem = element.onsubmit(event);
        if (!validateItem) {
          valid = validateItem;
        }
      }
    }
  }
  return valid;
}
defineExpose({
  validate,
});
</script>
