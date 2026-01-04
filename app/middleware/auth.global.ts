export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth();

  if (!user.value) {
    await fetchUser();
  }

  const publicPages = ["/login", "/terms", "/privacy"];

  if (publicPages.includes(to.path)) {
    if (user.value && to.path === "/login") {
      const redirect = to.query.redirect as string;
      return navigateTo(redirect || "/");
    }
    return;
  }

  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
