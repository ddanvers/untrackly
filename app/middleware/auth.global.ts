export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth();

  if (!user.value) {
    await fetchUser();
  }

  if (to.path === "/login") {
    if (user.value) {
      const redirect = to.query.redirect as string;
      return navigateTo(redirect || "/");
    }
    return;
  }

  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
