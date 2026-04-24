<template>
  <div class="admin-company-pages">
    <h1>Modération des Pages Entreprise</h1>

    <!-- Statistiques -->
    <div v-if="stats" class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.published }}</div>
        <div class="stat-label">Publiées</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.unpublished }}</div>
        <div class="stat-label">Non publiées</div>
      </div>
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">
      Chargement des pages entreprise...
    </div>

    <!-- Affichage des erreurs -->
    <div v-else-if="error" class="error">
      Erreur : {{ error }}
    </div>

    <!-- Liste des pages -->
    <div v-else>
      <div class="table-header">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par nom d'entreprise..."
          class="search-input"
        />
        <select v-model="statusFilter" class="filter-select">
          <option value="">Tous les statuts</option>
          <option value="published">Publiées</option>
          <option value="unpublished">Non publiées</option>
        </select>
      </div>

      <!-- Indication de scroll pour mobile -->
      <div class="scroll-hint">
        ← Faites défiler pour voir toutes les colonnes →
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Entreprise</th>
              <th>Utilisateur</th>
              <th>Personnel</th>
              <th>Statut</th>
              <th>Créée le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
          <tr v-for="page in filteredPages" :key="page.id">
            <td>#{{ page.id }}</td>
            <td>{{ page.company_name }}</td>
            <td>{{ page.user?.name || 'N/A' }}</td>
            <td>{{ page.total_personnel || 0 }}</td>
            <td>
              <span
                class="status-badge"
                :class="page.is_published ? 'status-published' : 'status-unpublished'"
              >
                {{ page.is_published ? 'Publiée' : 'Non publiée' }}
              </span>
            </td>
            <td>{{ formatDate(page.created_at) }}</td>
            <td>
              <div class="action-buttons">
                <button
                  @click="viewPage(page)"
                  class="btn-action btn-view"
                  title="Voir les détails"
                >
                  👁️
                </button>
                <button
                  @click="togglePublish(page)"
                  :class="['btn-action', page.is_published ? 'btn-unpublish' : 'btn-publish']"
                  :title="page.is_published ? 'Dépublier' : 'Publier'"
                  :disabled="actionLoading[page.id]"
                >
                  {{ actionLoading[page.id] ? '⏳' : (page.is_published ? '📴' : '📡') }}
                </button>
                <button
                  @click="deletePage(page)"
                  class="btn-action btn-delete"
                  title="Supprimer"
                  :disabled="actionLoading[page.id]"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
        </table>
      </div>

      <div v-if="filteredPages.length === 0" class="no-results">
        Aucune page ne correspond à vos critères.
      </div>
    </div>

    <!-- Modal de détails -->
    <div v-if="selectedPage" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedPage.company_name }}</h2>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h3>Informations générales</h3>
            <div class="detail-row">
              <span class="detail-label">ID:</span>
              <span class="detail-value">#{{ selectedPage.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Entreprise:</span>
              <span class="detail-value">{{ selectedPage.company_name }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Username:</span>
              <span class="detail-value">{{ selectedPage.username }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Utilisateur:</span>
              <span class="detail-value">
                {{ selectedPage.user?.name }} ({{ selectedPage.user?.email }})
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Statut:</span>
              <span class="detail-value">
                <span
                  class="status-badge"
                  :class="selectedPage.is_published ? 'status-published' : 'status-unpublished'"
                >
                  {{ selectedPage.is_published ? 'Publiée' : 'Non publiée' }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Créée le:</span>
              <span class="detail-value">{{ formatDate(selectedPage.created_at) }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>Contenu</h3>
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span class="detail-value">{{ selectedPage.description || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Slogan:</span>
              <span class="detail-value">{{ selectedPage.slogan || 'N/A' }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>Médias</h3>
            <div v-if="selectedPage.logo_url" class="logo-preview">
              <img :src="selectedPage.logo_url" alt="Logo" />
            </div>
          </div>

          <div class="detail-section">
            <h3>Membres de l'entreprise</h3>
            <div v-if="selectedPage.members && selectedPage.members.length > 0" class="members-list">
              <table class="members-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Rôle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(member, index) in selectedPage.members" :key="index">
                    <td>
                      <strong>{{ member.name }}</strong>
                      <span v-if="member.is_business_admin" class="admin-badge">Admin</span>
                    </td>
                    <td>{{ member.email }}</td>
                    <td>{{ member.phone || 'N/A' }}</td>
                    <td>
                      <span class="role-badge" :class="member.is_business_admin ? 'role-admin' : 'role-employee'">
                        {{ member.is_business_admin ? 'Business Admin' : 'Employé' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="no-members">
              <p>Aucun membre trouvé pour cette entreprise.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAdminAuthStore } from '../../stores/adminAuth';

const authStore = useAdminAuthStore();

// Créer une instance axios pour l'admin avec la gestion CSRF
const backendUrl = import.meta.env.VITE_APP_URL_BACKEND || 'http://127.0.0.1:8000';
const adminAxios = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Fonction pour obtenir et définir le CSRF token
const setCsrfToken = async () => {
  try {
    await adminAxios.get('/sanctum/csrf-cookie');
    const xsrfToken = Cookies.get('XSRF-TOKEN');
    if (xsrfToken) {
      adminAxios.defaults.headers.common['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du CSRF token:', error);
  }
};

// État
const pages = ref([]);
const stats = ref(null);
const loading = ref(true);
const error = ref(null);
const searchQuery = ref('');
const statusFilter = ref('');
const selectedPage = ref(null);
const actionLoading = ref({});

// Computed
const filteredPages = computed(() => {
  let filtered = pages.value;

  // Filtrer par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (page) =>
        page.company_name.toLowerCase().includes(query) ||
        page.username.toLowerCase().includes(query) ||
        page.user?.name.toLowerCase().includes(query)
    );
  }

  // Filtrer par statut
  if (statusFilter.value === 'published') {
    filtered = filtered.filter((page) => page.is_published);
  } else if (statusFilter.value === 'unpublished') {
    filtered = filtered.filter((page) => !page.is_published);
  }

  return filtered;
});

// Fonctions
async function fetchPages() {
  loading.value = true;
  error.value = null;

  try {
    const [pagesRes, statsRes] = await Promise.all([
      adminAxios.get('/api/admin/company-pages', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      adminAxios.get('/api/admin/company-pages/stats', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
    ]);

    console.log('Company Pages Response:', pagesRes.data);
    console.log('Company Pages Stats:', statsRes.data);

    // Le backend retourne { company_pages: {...pagination}, stats: {...} }
    if (pagesRes.data.company_pages) {
      // Si c'est paginé, extraire les données
      if (pagesRes.data.company_pages.data) {
        pages.value = pagesRes.data.company_pages.data;
      } else {
        pages.value = pagesRes.data.company_pages;
      }
    } else if (pagesRes.data.data) {
      pages.value = pagesRes.data.data;
    } else if (Array.isArray(pagesRes.data)) {
      pages.value = pagesRes.data;
    } else {
      pages.value = [];
    }

    // Transformer les stats
    const backendStats = statsRes.data;
    stats.value = {
      total: backendStats.total_pages || 0,
      published: backendStats.published_pages || 0,
      unpublished: backendStats.unpublished_pages || 0
    };

    console.log('Processed pages:', pages.value);
    console.log('Processed stats:', stats.value);
  } catch (err) {
    console.error('Error fetching company pages:', err);
    error.value = err.response?.data?.message || err.message || 'Une erreur est survenue';
  } finally {
    loading.value = false;
  }
}

async function togglePublish(page) {
  if (!confirm(`Voulez-vous vraiment ${page.is_published ? 'dépublier' : 'publier'} cette page ?`)) {
    return;
  }

  actionLoading.value[page.id] = true;

  try {
    await setCsrfToken();
    await adminAxios.patch(
      `/api/admin/company-pages/${page.id}/toggle`,
      {},
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    );

    // Mettre à jour localement
    page.is_published = !page.is_published;

    // Recharger les stats
    const statsRes = await adminAxios.get('/api/admin/company-pages/stats', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    const backendStats = statsRes.data;
    stats.value = {
      total: backendStats.total_pages || 0,
      published: backendStats.published_pages || 0,
      unpublished: backendStats.unpublished_pages || 0
    };
  } catch (err) {
    alert(err.response?.data?.message || 'Erreur lors de la modification');
  } finally {
    actionLoading.value[page.id] = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

async function deletePage(page) {
  if (!confirm(`Voulez-vous vraiment supprimer la page de "${page.company_name}" ? Cette action est irréversible.`)) {
    return;
  }

  actionLoading.value[page.id] = true;

  try {
    await setCsrfToken();
    await adminAxios.delete(
      `/api/admin/company-pages/${page.id}`,
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    );

    // Retirer de la liste
    pages.value = pages.value.filter((p) => p.id !== page.id);

    // Recharger les stats
    const statsRes = await adminAxios.get('/api/admin/company-pages/stats', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    const backendStats = statsRes.data;
    stats.value = {
      total: backendStats.total_pages || 0,
      published: backendStats.published_pages || 0,
      unpublished: backendStats.unpublished_pages || 0
    };
  } catch (err) {
    alert(err.response?.data?.message || 'Erreur lors de la suppression');
  } finally {
    actionLoading.value[page.id] = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

async function viewPage(page) {
  // Charger les détails complets de la page (y compris les membres)
  try {
    const response = await adminAxios.get(`/api/admin/company-pages/${page.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    
    // Utiliser les données complètes du backend
    selectedPage.value = {
      ...page,
      ...response.data.company_page,
      members: response.data.members || [],
    };
  } catch (error) {
    console.error('Erreur lors du chargement des détails de la page:', error);
    // En cas d'erreur, utiliser les données de base
    selectedPage.value = page;
    selectedPage.value.members = [];
  }
}

function closeModal() {
  selectedPage.value = null;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

onMounted(() => {
  fetchPages();
});
</script>

<style scoped>
.admin-company-pages {
  padding: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

h1 {
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: bold;
  padding: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  width: 100%;
}

.stat-card {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.loading,
.error {
  padding: 2rem;
  text-align: center;
}

.error {
  color: #ef4444;
  background-color: #fee2e2;
  border-radius: 0.5rem;
}

.table-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-select {
  padding: 0.75rem 1rem;
  min-width: 180px;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background-color: #fff;
  cursor: pointer;
  box-sizing: border-box;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Indication de scroll */
.scroll-hint {
  display: none;
}

/* Wrapper du tableau */
.table-wrapper {
  position: relative;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}

thead {
  background-color: #f3f4f6;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}

td {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
  white-space: nowrap;
}

th:last-child,
td:last-child {
  min-width: 220px;
  width: 220px;
}

tbody tr:hover {
  background-color: #f9fafb;
}

tbody tr:last-child td {
  border-bottom: none;
}

.link {
  color: #3b82f6;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-published {
  background-color: #d1fae5;
  color: #065f46;
}

.status-unpublished {
  background-color: #fee2e2;
  color: #991b1b;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
  min-width: 200px;
  width: 100%;
}

.btn-action {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  flex: 0 0 auto;
  white-space: nowrap;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-view {
  background-color: #3b82f6;
  color: #fff;
}

.btn-view:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-publish {
  background-color: #10b981;
  color: #fff;
}

.btn-publish:hover:not(:disabled) {
  background-color: #059669;
}

.btn-unpublish {
  background-color: #f59e0b;
  color: #fff;
}

.btn-unpublish:hover:not(:disabled) {
  background-color: #d97706;
}

.btn-delete {
  background-color: #ef4444;
  color: #fff;
}

.btn-delete:hover:not(:disabled) {
  background-color: #dc2626;
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
  background-color: #fff;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  border-radius: 0.5rem;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  width: 150px;
  flex-shrink: 0;
}

.detail-value {
  color: #6b7280;
  flex: 1;
}

.logo-preview {
  text-align: center;
  padding: 1rem;
}

.logo-preview img {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
}

/* Membres de l'entreprise */
.members-list {
  margin-top: 1rem;
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
  background-color: #fff;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.members-table thead {
  background-color: #f3f4f6;
}

.members-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  font-size: 0.875rem;
}

.members-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
  font-size: 0.875rem;
}

.members-table tbody tr:hover {
  background-color: #f9fafb;
}

.members-table tbody tr:last-child td {
  border-bottom: none;
}

.admin-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.role-admin {
  background-color: #dbeafe;
  color: #1e40af;
}

.role-employee {
  background-color: #f3f4f6;
  color: #4b5563;
}

.no-members {
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

/* Écrans moyens (max-width: 1024px) */
@media (max-width: 1024px) {
  .admin-company-pages {
    padding: 0;
  }

  .table-header {
    flex-wrap: wrap;
  }
}

/* Tablettes (max-width: 768px) */
@media (max-width: 768px) {
  .admin-company-pages {
    padding: 0;
  }

  .admin-company-pages h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    padding: 0;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    width: 100%;
  }

  .stat-card {
    padding: 1rem;
  }

  .table-header {
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    margin-bottom: 1rem;
  }

  .search-input {
    width: 100%;
    min-width: 100%;
  }

  .filter-select {
    width: 100%;
    min-width: 100%;
  }

  .table-wrapper {
    width: 100%;
    margin: 0;
  }

  table {
    font-size: 0.875rem;
    min-width: 750px;
  }

  th, td {
    padding: 0.75rem 0.5rem;
  }

  th:last-child,
  td:last-child {
    min-width: 200px !important;
    width: 200px !important;
    position: sticky;
    right: 0;
    background-color: white;
    z-index: 3;
    box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
  }

  thead th:last-child {
    z-index: 4;
    background-color: #f3f4f6;
  }

  tbody td:last-child {
    z-index: 3;
  }

  .action-buttons {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 0.5rem;
    min-width: 180px;
    width: 100%;
    justify-content: flex-start;
  }

  .btn-action {
    flex: 0 0 auto;
    min-width: 44px;
    padding: 0.5rem;
    font-size: 0.875rem;
    width: auto;
  }
}

/* Mobile (max-width: 480px) */
@media (max-width: 480px) {
  .admin-company-pages {
    padding: 0 !important;
    margin: 0;
    width: 100%;
    overflow-x: hidden;
  }

  .admin-company-pages h1 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    margin-top: 0;
    padding: 0 0.75rem;
    word-wrap: break-word;
    line-height: 1.3;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.625rem;
    margin: 0 0 1rem 0;
    width: 100%;
    padding: 0;
  }

  .stat-card {
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    box-sizing: border-box;
    overflow: visible;
  }

  .stat-value {
    font-size: 1.75rem;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
  }

  .table-header {
    gap: 0.625rem;
    margin-bottom: 0.75rem;
    padding: 0;
    width: 100%;
    flex-direction: column;
  }

  .search-input {
    padding: 0.625rem;
    font-size: 0.875rem;
    width: 100%;
    min-width: 100%;
    box-sizing: border-box;
  }

  .filter-select {
    padding: 0.625rem;
    font-size: 0.875rem;
    width: 100%;
    min-width: 100%;
    box-sizing: border-box;
  }

  /* Afficher l'indication de scroll sur mobile */
  .scroll-hint {
    display: block !important;
    text-align: center;
    padding: 0.625rem;
    margin: 0.5rem 0;
    background: linear-gradient(90deg, #dbeafe 0%, #bfdbfe 50%, #dbeafe 100%);
    color: #1e40af;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 0.375rem;
    animation: pulse-hint 2s infinite;
    width: 100%;
    box-sizing: border-box;
  }

  @keyframes pulse-hint {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Wrapper avec gradient */
  .table-wrapper {
    margin: 0;
    width: 100%;
    position: relative;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table-wrapper::after {
    content: '';
    position: absolute;
    top: 0;
    right: 220px;
    bottom: 0;
    width: 30px;
    background: linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);
    pointer-events: none;
    display: block;
    z-index: 0;
  }

  table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    font-size: 0.8125rem;
    margin: 0;
    width: 100%;
    min-width: 650px;
  }

  th, td {
    padding: 0.5rem 0.375rem;
    font-size: 0.8125rem;
    min-width: 70px;
    white-space: nowrap;
  }

  th {
    font-size: 0.75rem;
  }

  td {
    font-size: 0.75rem;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    background-color: inherit;
    z-index: 1;
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
  }

  thead th:first-child {
    z-index: 2;
    background-color: #f9fafb;
  }

  tbody td:first-child {
    background-color: white;
  }

  /* Colonne Actions sticky à droite sur mobile */
  th:last-child,
  td:last-child {
    position: sticky;
    right: 0;
    background-color: white;
    z-index: 3;
    box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
    min-width: 200px !important;
    width: 200px !important;
    padding: 0.5rem 0.375rem;
  }

  thead th:last-child {
    z-index: 4;
    background-color: #f3f4f6;
  }

  tbody td:last-child {
    background-color: white;
    z-index: 3;
  }

  .action-buttons {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 0.375rem;
    min-width: 180px;
    width: 100%;
    align-items: center;
    justify-content: flex-start;
  }

  .btn-action {
    flex: 0 0 auto;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    min-width: 40px;
    width: auto;
    white-space: nowrap;
  }

  .status-badge {
    font-size: 0.6875rem;
    padding: 0.1875rem 0.5rem;
    white-space: nowrap;
  }

  .loading,
  .error,
  .no-results {
    padding: 1rem;
    margin: 0;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
  }

  /* Modal responsive */
  .modal-overlay {
    padding: 0;
    align-items: flex-start;
  }

  .modal-content {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 0 !important;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  .modal-header h2 {
    font-size: 1.125rem;
    word-wrap: break-word;
    padding-right: 2rem;
  }

  .btn-close {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .modal-body {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    -webkit-overflow-scrolling: touch;
  }

  .detail-row {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem 0;
  }

  .detail-label {
    width: 100%;
    font-size: 0.875rem;
  }

  .detail-value {
    width: 100%;
    font-size: 0.875rem;
  }

  .detail-section h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .logo-preview img {
    max-width: 150px;
    max-height: 150px;
  }

  /* Membres de l'entreprise - Responsive */
  .members-table {
    font-size: 0.875rem;
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .members-table thead,
  .members-table tbody,
  .members-table tr {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .members-table th,
  .members-table td {
    padding: 0.5rem;
    font-size: 0.8125rem;
  }

  .admin-badge {
    font-size: 0.6875rem;
    padding: 0.125rem 0.375rem;
  }

  .role-badge {
    font-size: 0.75rem;
    padding: 0.1875rem 0.5rem;
  }
}
</style>

