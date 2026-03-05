import type { AuthProvider } from "@refinedev/core";

/**
 * Stub auth provider for MVP (AUTH_ENABLED=false on backend).
 * Role is stored in localStorage and sent as X-User-Role header by data provider.
 * No real authentication — just role switching for development.
 */
export const authProvider: AuthProvider = {
  login: async ({ role }: { role?: string }) => {
    const selectedRole = role || "customer";
    localStorage.setItem("cds-role", selectedRole);

    // Hard reload to re-initialize role-based resources
    window.location.href = "/";
    return { success: true };
  },

  logout: async () => {
    localStorage.removeItem("cds-role");
    window.location.href = "/login";
    return { success: true };
  },

  check: async () => {
    const role = localStorage.getItem("cds-role");
    if (role) {
      return { authenticated: true };
    }
    return {
      authenticated: false,
      redirectTo: "/login",
    };
  },

  getPermissions: async () => {
    const role = localStorage.getItem("cds-role");
    return role ? [role] : [];
  },

  getIdentity: async () => {
    const role = localStorage.getItem("cds-role");
    if (!role) return null;

    if (role === "provider") {
      return {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Provider Demo",
        email: "provider@cds-platform.de",
        role: "provider_owner",
      };
    }

    return {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Kunde Demo",
      email: "customer@cds-platform.de",
      role: "customer",
    };
  },

  onError: async (error) => {
    if (error.status === 401 || error.status === 403) {
      return { logout: true, redirectTo: "/login" };
    }
    return {};
  },
};
