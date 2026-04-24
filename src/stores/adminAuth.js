import { defineStore } from "pinia";
import { ref, computed } from "vue";
import Cookies from "js-cookie";
import adminApiClient from "@/apiAdmin";

// Créer une instance axios pour l'admin avec la bonne URL et la gestion CSRF
// IMPORTANT: Configurez VITE_APP_URL_BACKEND dans un fichier .env à la racine du projet
// Exemple pour XAMPP: VITE_APP_URL_BACKEND=http://localhost/site-carte-digitale-XAMPP-02-11-2025-04h03/site-carte-digitale - Backend- production/public
// Exemple pour artisan serve: VITE_APP_URL_BACKEND=http://localhost:8000

// Fonction helper pour ajouter l'en-tête CSRF manuellement
const setAdminCsrfHeader = () => {
  const xsrfToken = Cookies.get("XSRF-TOKEN");
  if (xsrfToken) {
    adminApiClient.defaults.headers.common["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
  } else {
    console.warn("Cookie XSRF-TOKEN non trouvé pour admin.");
    delete adminApiClient.defaults.headers.common["X-XSRF-TOKEN"];
  }
};

export const useAdminAuthStore = defineStore("adminAuth", () => {
  // État
  const token = ref(localStorage.getItem("admin_token") || null);
  const adminUser = ref(null);
  const permissions = ref([]);

  // Getters
  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => adminUser.value?.role === "admin" || adminUser.value?.role === "super_admin");
  const hasPermission = (key) => (permissions.value || []).includes(key);

  // Actions
  async function login(email, password) {
    try {
      // S'assurer d'avoir un CSRF token frais avant la connexion
      await adminApiClient.get("/sanctum/csrf-cookie");

      // Définir le header CSRF
      setAdminCsrfHeader();

      const response = await adminApiClient.post("/api/admin/login", {
        email,
        password,
      });

      token.value = response.data.token;
      adminUser.value = response.data.user;

      // Sauvegarder le token dans localStorage
      localStorage.setItem("admin_token", token.value);

      // Configurer l'instance axios pour inclure le token dans les futures requêtes
      adminApiClient.defaults.headers.common["Authorization"] = `Bearer ${token.value}`;

      return { success: true, user: adminUser.value };
    } catch (error) {
      console.error("Erreur de connexion admin:", error);

      // Gérer les erreurs de connexion réseau spécifiquement
      if (
        error.code === "ERR_NETWORK" ||
        error.message === "Network Error" ||
        error.message?.includes("ERR_CONNECTION_REFUSED")
      ) {
        const errorMessage =
          `Impossible de se connecter au serveur backend.\n\n` +
          `URL configurée: ${import.meta.env.VITE_APP_URL_BACKEND || "http://localhost:8000"}\n\n` +
          `Vérifiez que:\n` +
          `1. Le serveur backend est démarré\n` +
          `2. L'URL est correcte dans votre fichier .env\n` +
          `3. Il n'y a pas de problème de CORS\n\n` +
          `Pour configurer l'URL, créez un fichier .env à la racine avec:\n` +
          `VITE_APP_URL_BACKEND=votre_url_du_backend\n\n` +
          `Exemple pour XAMPP:\n` +
          `VITE_APP_URL_BACKEND=http://localhost/site-carte-digitale-XAMPP-02-11-2025-04h03/site-carte-digitale - Backend- production/public`;

        return {
          success: false,
          message: errorMessage,
        };
      }

      const errorMessage = error.response?.data?.message || error.message || "Erreur de connexion";
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      // Nettoyer le header CSRF après la requête
      delete adminApiClient.defaults.headers.common["X-XSRF-TOKEN"];
    }
  }

  async function fetchAdminUser() {
    if (!token.value) {
      return;
    }

    try {
      const response = await adminApiClient.get("/api/admin/me", {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      adminUser.value = response.data;
      permissions.value = response.data?.permissions || [];
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur admin:", error);
      // Si le token est invalide, déconnecter
      if (error.response?.status === 401) {
        logout();
      }
    }
  }

  function logout() {
    token.value = null;
    adminUser.value = null;
    permissions.value = [];
    localStorage.removeItem("admin_token");
    delete adminApiClient.defaults.headers.common["Authorization"];
  }

  // Initialiser l'instance axios avec le token si disponible
  if (token.value) {
    adminApiClient.defaults.headers.common["Authorization"] = `Bearer ${token.value}`;
    // Optionnellement, récupérer les infos de l'utilisateur admin au chargement
    fetchAdminUser();
  }

  return {
    // State
    token,
    adminUser,
    permissions,

    // Getters
    isAuthenticated,
    isAdmin,
    hasPermission,

    // Actions
    login,
    logout,
    fetchAdminUser,
  };
});
