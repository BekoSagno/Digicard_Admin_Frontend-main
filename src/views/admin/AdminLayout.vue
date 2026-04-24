<template>
  <div class="admin-container">
    <!-- Bouton menu mobile -->
    <button 
      class="mobile-menu-btn" 
      @click="toggleSidebar"
      aria-label="Toggle menu"
    >
      <span v-if="!sidebarOpen">☰</span>
      <span v-else>✕</span>
    </button>

    <!-- Overlay pour fermer le menu mobile -->
    <div 
      v-if="sidebarOpen" 
      class="sidebar-overlay" 
      @click="closeSidebar"
    ></div>

    <!-- Menu de navigation latéral -->
    <nav class="admin-sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <h2>Admin Panel</h2>
      
      <div v-if="adminUser" class="admin-info">
        <p class="admin-name">{{ adminUser.name }}</p>
        <p class="admin-role">{{ adminUser.role }}</p>
      </div>

      <ul>
        <li>
          <router-link to="/admin" @click="closeSidebar">📊 Dashboard</router-link>
        </li>
        <li>
          <router-link to="/admin/users" @click="closeSidebar">👥 Utilisateurs</router-link>
        </li>
        <li>
          <router-link to="/admin/orders" @click="closeSidebar">📦 Commandes</router-link>
        </li>
        <li>
          <router-link to="/admin/marketplace/offers" @click="closeSidebar">🛍️ Marketplace</router-link>
        </li>
        <li>
          <router-link to="/admin/company-pages" @click="closeSidebar">🏢 Pages Entreprise</router-link>
        </li>
        <li>
          <router-link to="/admin/homepage" @click="closeSidebar">🖥️ Accueil (CMS)</router-link>
        </li>
        <li>
          <router-link to="/admin/settings" @click="closeSidebar">⚙️ Paramètres</router-link>
        </li>
      </ul>

      <button @click="handleLogout" class="logout-btn">
        Déconnexion
      </button>
    </nav>

    <!-- Zone de contenu principal -->
    <main class="admin-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuthStore } from '../../stores/adminAuth';

const router = useRouter();
const authStore = useAdminAuthStore();

const adminUser = computed(() => authStore.adminUser);
const sidebarOpen = ref(false);

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function closeSidebar() {
  sidebarOpen.value = false;
}

function handleLogout() {
  authStore.logout();
  router.push('/admin/login');
}
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

.admin-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 200px;
  background-color: #1f2937;
  color: #fff;
  padding: 2rem 1rem;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
}

.admin-sidebar h2 {
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
  color: #fff;
}

.admin-info {
  padding: 1rem;
  margin-bottom: 1.5rem;
  background-color: #374151;
  border-radius: 0.5rem;
  text-align: center;
}

.admin-name {
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.admin-role {
  font-size: 0.75rem;
  color: #9ca3af;
  text-transform: uppercase;
}

.admin-sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
  margin-bottom: 2rem;
}

.admin-sidebar li {
  margin-bottom: 0.5rem;
}

.admin-sidebar a {
  display: block;
  padding: 0.75rem 1rem;
  color: #d1d5db;
  text-decoration: none;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.admin-sidebar a:hover {
  background-color: #374151;
  color: #fff;
}

.admin-sidebar a.router-link-active {
  background-color: #3b82f6;
  color: #fff;
  font-weight: 600;
}

.logout-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  margin-top: auto;
  background-color: #dc2626;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background-color: #b91c1c;
}

.admin-content {
  margin-left: 200px;
  padding: 2rem;
  background-color: transparent;
  min-height: 100vh;
  width: calc(100% - 200px);
  max-width: calc(100% - 200px);
  overflow-x: auto;
  box-sizing: border-box;
}

/* Bouton menu mobile */
.mobile-menu-btn {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1001;
  background-color: #1f2937;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: background-color 0.2s;
}

.mobile-menu-btn:hover {
  background-color: #374151;
}

/* Overlay pour mobile */
.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* Media queries pour responsive */
@media (max-width: 1024px) {
  .admin-sidebar {
    width: 250px;
  }

  .admin-content {
    margin-left: 250px;
    width: calc(100% - 250px);
    max-width: calc(100% - 250px);
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: block;
  }

  .sidebar-overlay {
    display: block;
  }

  .admin-sidebar {
    position: fixed;
    left: -280px;
    width: 280px;
    transition: left 0.3s ease;
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .admin-sidebar:not(.sidebar-open) {
    left: -280px;
  }

  .admin-sidebar.sidebar-open {
    left: 0;
  }

  .admin-content {
    margin-left: 0;
    padding: 1rem;
    padding-top: 4rem;
    width: 100%;
    max-width: 100vw;
    overflow-x: auto;
  }

  .admin-info {
    padding: 0.75rem;
  }

  .admin-sidebar h2 {
    font-size: 1.125rem;
  }

  .admin-sidebar a {
    padding: 0.625rem 0.875rem;
    font-size: 0.9375rem;
  }
}

@media (max-width: 480px) {
  .admin-content {
    padding: 0.75rem;
    padding-top: 4rem;
    width: 100%;
    max-width: 100vw;
    overflow-x: auto;
  }

  .admin-sidebar {
    width: 85vw;
    max-width: 300px;
    left: -90vw;
  }

  .admin-sidebar h2 {
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .admin-info {
    padding: 0.625rem;
    margin-bottom: 1rem;
  }

  .admin-name {
    font-size: 0.8125rem;
  }

  .admin-role {
    font-size: 0.6875rem;
  }

  .admin-sidebar ul {
    margin-bottom: 1.5rem;
  }

  .admin-sidebar a {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .logout-btn {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
  }
}
</style>

