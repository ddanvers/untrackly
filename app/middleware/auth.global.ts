export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, logout } = useAuth();
  const publicPages = ["/login", "/terms", "/privacy"];

  if (publicPages.includes(to.path)) {
    if (user.value && to.path === "/login") {
      const redirect = to.query.redirect as string;
      return navigateTo(redirect || "/");
    }
    return;
  }

  // Always re-validate session on every navigation for non-public pages
  const fetchedUser = await fetchUser();

  if (!fetchedUser) {
    await logout();
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
