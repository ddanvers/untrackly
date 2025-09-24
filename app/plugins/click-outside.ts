export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("clickOutside", {
    mounted(el, binding) {
      const handleClickOutside = (event: MouseEvent) => {
        if (!el.contains(event.target as Node) && el !== event.target) {
          binding.value?.();
        }
      };
      document.addEventListener("click", handleClickOutside);
    },
    unmounted(el) {
      document.removeEventListener("click", el.clickOutside!);
    },
  });
});
