import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Route par défaut : rediriger vers /admin/login
    {
      path: "/",
      redirect: "/admin/login",
    },
    // --- Routes Admin ---
    {
      path: "/admin/login",
      name: "AdminLogin",
      component: () => import("../views/admin/AdminLogin.vue"),
    },
    {
      path: "/admin",
      component: () => import("../views/admin/AdminLayout.vue"),
      meta: { requiresAdmin: true },
      children: [
        {
          path: "",
          name: "AdminDashboard",
          component: () => import("../views/admin/AdminDashboard.vue"),
        },
        {
          path: "users",
          name: "AdminUsers",
          component: () => import("../views/admin/AdminUserList.vue"),
        },
        {
          path: "orders",
          name: "AdminOrders",
          component: () => import("../views/admin/AdminOrderList.vue"),
        },
        {
          path: "marketplace/offers",
          name: "AdminMarketplaceOffers",
          component: () => import("../views/admin/AdminMarketplaceOffers.vue"),
        },
        {
          path: "marketplace/offers/:id",
          name: "AdminMarketplaceOfferEdit",
          component: () => import("../views/admin/AdminMarketplaceOfferEdit.vue"),
        },
        {
          path: "marketplace/purchases",
          name: "AdminMarketplacePurchases",
          component: () => import("../views/admin/AdminMarketplacePurchases.vue"),
        },
        {
          path: "marketplace/permissions",
          name: "AdminMarketplacePermissions",
          component: () => import("../views/admin/AdminMarketplacePermissions.vue"),
        },
        {
          path: "company-pages",
          name: "AdminCompanyPages",
          component: () => import("../views/admin/AdminCompanyPages.vue"),
        },
        {
          path: "settings",
          name: "AdminSettings",
          component: () => import("../views/admin/AdminSettings.vue"),
        },
        {
          path: "homepage",
          name: "AdminHomepage",
          component: () => import("../views/admin/AdminHomepage.vue"),
        },
      ],
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    // Si une position sauvegardée existe (bouton retour), l'utiliser
    if (savedPosition) {
      return savedPosition;
    }
    // Si un hash existe dans l'URL (ancre), scroller vers cet élément
    if (to.hash) {
      return {
        el: to.hash,
        behavior: "smooth",
        top: 80,
      };
    }
    // Sinon, scroller en haut de la page
    return { top: 0 };
  },
});

// Garde de navigation pour les routes admin
router.beforeEach(async (to, from, next) => {
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);

  // Vérification spéciale pour les routes admin
  if (requiresAdmin) {
    // Importer dynamiquement le store admin
    const { useAdminAuthStore } = await import("@/stores/adminAuth");
    const adminAuthStore = useAdminAuthStore();

    // Si pas de token admin, rediriger vers login admin
    if (!adminAuthStore.isAuthenticated) {
      console.log("[Guard] Admin route requires authentication. Redirecting to admin login.");
      return next({ name: "AdminLogin" });
    }

    // ✅ S'assurer que l'utilisateur + permissions sont chargés après refresh
    if (!adminAuthStore.adminUser) {
      try {
        await adminAuthStore.fetchAdminUser();
      } catch (e) {
        // si erreur (token invalide), le store gère logout
      }
    }

    // Si authentifié mais pas admin, rediriger vers login admin
    if (!adminAuthStore.isAdmin && adminAuthStore.adminUser) {
      console.log("[Guard] User is not admin. Redirecting to admin login.");
      return next({ name: "AdminLogin" });
    }

    // Si tout est OK, autoriser l'accès
    console.log("[Guard] Admin authenticated. Allowing access.");
    return next();
  }

  // Pour les autres routes (comme /admin/login), autoriser l'accès
  next();
});

export default router;
