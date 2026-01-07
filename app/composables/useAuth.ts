export const useAuth = () => {
  const user = useCookie<User | null>("auth-user");
  const headers = useRequestHeaders(["cookie"]);

  const login = async (username: string, password: string) => {
    try {
      const { user: loggedInUser } = await $fetch("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
      user.value = loggedInUser;
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const register = async (body: {
    username: string;
    password: string;
    displayName: string;
    secretKey: string;
  }) => {
    try {
      const { user: loggedInUser } = await $fetch("/api/auth/register", {
        method: "POST",
        body,
      });
      user.value = loggedInUser;
      return true;
    } catch (error) {
      console.error("Register failed", error);
      return false;
    }
  };

  const logout = async (redirectPath?: string, navigate = true) => {
    try {
      await $fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      user.value = null;
      if (navigate) {
        const path = typeof redirectPath === "string" ? redirectPath : "/login";
        navigateTo(path);
      }
    }
  };

  const fetchUser = async () => {
    try {
      const { user: fetchedUser } = await $fetch("/api/auth/me", {
        headers,
      });
      user.value = fetchedUser;
      return fetchedUser;
    } catch (error) {
      user.value = null;
      return null;
    }
  };

  return {
    user,
    login,
    register,
    logout,
    fetchUser,
  };
};

interface User {
  id: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  publicKey?: string;
}
