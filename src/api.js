import axios from "axios";

// Lire l'URL du backend depuis les variables d'environnement
// En développement local : http://localhost:8000
// Pour tester sur réseau local : http://192.168.1.126:8000
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_APP_URL_BACKEND || "http://localhost:8000",
  withCredentials: true, // Crucial pour les cookies

  // Configuration CSRF explicite pour forcer Axios à fonctionner correctement
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// Intercepteur pour gérer les erreurs 401 (session expirée)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si on reçoit une erreur 401 (non autorisé) ou 419 (session expirée)
    if (error.response && (error.response.status === 401 || error.response.status === 419)) {
      // Vérifier si ce n'est pas une tentative de login/logout ou de vérification initiale
      const isAuthRequest =
        error.config.url.includes("/login") ||
        error.config.url.includes("/logout") ||
        error.config.url.includes("/register") ||
        error.config.url.includes("/verify") ||
        error.config.url.includes("/user") ||
        error.config.url.includes("/sanctum/csrf-cookie");

      if (!isAuthRequest) {
        console.warn("Session expirée. Redirection vers la page d'accueil...");
        // Nettoyer et rediriger (sera géré par useAuth)
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
