export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, logout } = useAuth();
  const publicPages = ["/login", "/terms", "/privacy", "/", "/about"];

  if (publicPages.includes(to.path)) {
    if (user.value && to.path === "/login") {
      // Verify validity before bouncing back to prevent infinite loops
      // if fetchUser fails, it clears user.value, keeping us on /login
      const validUser = await fetchUser();

      if (validUser) {
        const redirect = to.query.redirect as string;
        return navigateTo(redirect || "/");
      }
    }
    return;
  }

  // Always re-validate session on every navigation for non-public pages
  const fetchedUser = await fetchUser();

  if (!fetchedUser) {
    await logout(undefined, false);
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  // Admin routing logic
  if (fetchedUser.role === "admin") {
    if (!to.path.startsWith("/admin")) {
      return navigateTo("/admin");
    }
  } else {
    // Normal user logic
    if (to.path.startsWith("/admin")) {
      return navigateTo("/");
    }
  }
});
