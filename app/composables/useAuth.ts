export const useAuth = () => {
  const user = useCookie<User | null>("auth-user");

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

  const logout = async () => {
    try {
      await $fetch("/api/auth/logout", { method: "POST" });
      user.value = null;
      navigateTo("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const fetchUser = async () => {
    try {
      const { user: fetchedUser } = await $fetch("/api/auth/me");
      user.value = fetchedUser;
    } catch (error) {
      user.value = null;
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
  id: number;
  username: string;
  displayName: string;
  publicKey?: string;
}
