<template>
  <div class="admin-user-list">
    <h1>Liste des Utilisateurs</h1>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">
      Chargement des utilisateurs...
    </div>

    <!-- Affichage des erreurs -->
    <div v-else-if="error" class="error">
      Erreur : {{ error }}
    </div>

    <!-- Tableau des utilisateurs -->
    <div v-else>
      <div class="table-header">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par nom ou email..."
          class="search-input"
        />
        <div class="filters">
          <select v-model="roleFilter" class="filter-select">
            <option value="">Tous les rôles</option>
            <option value="individual">Individual</option>
            <option value="business_admin">Business Admin</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <select v-model="statusFilter" class="filter-select">
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
          </select>
        </div>
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
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="role-badge" :class="`role-${user.role}`">
                  {{ formatRole(user.role) }}
                </span>
              </td>
              <td>
                <span v-if="user.is_suspended" class="status-suspended">Suspendu</span>
                <span v-else class="status-active">Actif</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    @click="viewUser(user)"
                    class="btn-action btn-view"
                    title="Voir les détails"
                  >
                    👁️
                  </button>
                  <button
                    @click="toggleSuspend(user)"
                    :class="['btn-action', user.is_suspended ? 'btn-activate' : 'btn-suspend']"
                    :title="user.is_suspended ? 'Activer' : 'Suspendre'"
                    :disabled="actionLoading[user.id]"
                  >
                    {{ actionLoading[user.id] ? '⏳' : (user.is_suspended ? '✓' : '⊗') }}
                  </button>
                  <button
                    @click="toggleTwoFactor(user)"
                    :class="['btn-action', (user.two_factor_enabled === true || user.two_factor_enabled === 1) ? 'btn-2fa-active' : 'btn-2fa-inactive']"
                    :title="(user.two_factor_enabled === true || user.two_factor_enabled === 1) ? 'Désactiver 2FA' : 'Activer 2FA'"
                    :disabled="actionLoading[user.id]"
                  >
                    {{ actionLoading[user.id] ? '⏳' : ((user.two_factor_enabled === true || user.two_factor_enabled === 1) ? '🔒' : '🔓') }}
                  </button>
                  <button
                    @click="confirmDelete(user)"
                    class="btn-action btn-suspend"
                    title="Supprimer définitivement"
                    :disabled="actionLoading[user.id]"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredUsers.length === 0" class="no-results">
        Aucun utilisateur ne correspond à vos critères de recherche.
      </div>
    </div>

    <!-- Modal de détails utilisateur -->
    <div v-if="selectedUser" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Détails de l'utilisateur</h2>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="detail-label">ID:</span>
            <span class="detail-value">{{ selectedUser.id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Nom:</span>
            <span class="detail-value">{{ selectedUser.name }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">{{ selectedUser.email }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Rôle:</span>
            <span class="detail-value">{{ formatRole(selectedUser.role) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Statut:</span>
            <span class="detail-value">
              <span v-if="selectedUser.is_suspended" class="status-suspended">Suspendu</span>
              <span v-else class="status-active">Actif</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">2FA:</span>
            <span class="detail-value">
              <span v-if="selectedUser.two_factor_enabled === true || selectedUser.two_factor_enabled === 1" class="status-active">Activée</span>
              <span v-else class="status-suspended">Désactivée</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Entreprise:</span>
            <span class="detail-value">{{ selectedUser.company_name || 'N/A' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Créé le:</span>
            <span class="detail-value">{{ formatDate(selectedUser.created_at) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Mis à jour le:</span>
            <span class="detail-value">{{ formatDate(selectedUser.updated_at) }}</span>
          </div>

          <!-- Commandes validées -->
          <!-- Pour les employés, affiche le nombre de commandes validées par le business admin dans lesquelles l'employé est inclus -->
          <div class="detail-row">
            <span class="detail-label">Commandes validées:</span>
            <span class="detail-value">
              <template v-if="userOrdersLoading">Chargement…</template>
              <template v-else>{{ validatedOrders.length }}</template>
            </span>
          </div>

          <div class="orders-section">
            <h3 class="orders-title">Détails des commandes validées</h3>
            <div v-if="userOrdersLoading" class="detail-value">Chargement…</div>
            <template v-else>
              <table v-if="validatedOrders.length > 0" class="orders-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Design</th>
                    <th>Quantité</th>
                    <th>URL du Profil</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(order, idx) in validatedOrders" :key="`${order.id}-${idx}`">
                    <td>#{{ order.id }}</td>
                    <td>{{ formatShortDate(order.created_at) }}</td>
                    <td>{{ getDesignLabelForOrder(order, selectedUser) }}</td>
                    <td>{{ getCardQuantityForUserInOrder(order, selectedUser) }}</td>
                    <td>
                      <div v-if="getOrderProfileUrl(order, selectedUser)" class="profile-url-cell">
                        <a :href="getFullOrderProfileUrl(order, selectedUser)" target="_blank" rel="noopener noreferrer" class="btn-view-profile">
                          Voir le profil
                        </a>
                        <button @click="copyProfileUrl(getFullOrderProfileUrl(order, selectedUser))" class="btn-copy-url" title="Copier l'URL">
                          {{ copiedProfileUrl === getFullOrderProfileUrl(order, selectedUser) ? '✓' : '📋' }}
                        </button>
                      </div>
                      <span v-else class="no-profile-url">N/A</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="detail-value">Aucune commande validée</div>
            </template>
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

// Initialise le store
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
const users = ref([]);
const loading = ref(true);
const error = ref(null);
const searchQuery = ref('');
const roleFilter = ref('');
const statusFilter = ref('');
const selectedUser = ref(null);
const userOrdersLoading = ref(false);
const userOrders = ref([]);
const actionLoading = ref({});
const copiedProfileUrl = ref(null);

// Computed
const filteredUsers = computed(() => {
  let filtered = users.value;

  // Filtrer par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }

  // Filtrer par rôle
  if (roleFilter.value) {
    filtered = filtered.filter((user) => user.role === roleFilter.value);
  }

  // Filtrer par statut
  if (statusFilter.value === 'active') {
    filtered = filtered.filter((user) => !user.is_suspended);
  } else if (statusFilter.value === 'suspended') {
    filtered = filtered.filter((user) => user.is_suspended);
  }

  return filtered;
});

// Fonctions
async function fetchUsers() {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await adminAxios.get('/api/admin/users', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    });
    // S'assurer que two_factor_enabled est correctement initialisé pour chaque utilisateur
    users.value = response.data.data.map(user => ({
      ...user,
      two_factor_enabled: user.two_factor_enabled ?? true // Par défaut true si null/undefined
    }));
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Une erreur est survenue';
  } finally {
    loading.value = false;
  }
}

async function toggleSuspend(user) {
  if (!confirm(`Voulez-vous vraiment ${user.is_suspended ? 'activer' : 'suspendre'} cet utilisateur ?`)) {
    return;
  }

  actionLoading.value[user.id] = true;

  try {
    await setCsrfToken();
    await adminAxios.post(
      `/api/admin/users/${user.id}/suspend`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      }
    );

    // Mettre à jour localement
    user.is_suspended = !user.is_suspended;
  } catch (err) {
    alert(err.response?.data?.message || 'Erreur lors de la modification du statut');
  } finally {
    actionLoading.value[user.id] = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

async function toggleTwoFactor(user) {
  const isEnabled = user.two_factor_enabled === true || user.two_factor_enabled === 1;
  if (!confirm(`Voulez-vous vraiment ${isEnabled ? 'désactiver' : 'activer'} la vérification 2FA pour ${user.name} ?`)) {
    return;
  }

  actionLoading.value[user.id] = true;

  try {
    await setCsrfToken();
    const response = await adminAxios.post(
      `/api/admin/users/${user.id}/toggle-two-factor`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      }
    );

    // Mettre à jour localement avec la valeur retournée par le serveur
    if (response.data.user && response.data.user.two_factor_enabled !== undefined) {
      user.two_factor_enabled = response.data.user.two_factor_enabled;
    } else {
      // Fallback: inverser la valeur actuelle
      user.two_factor_enabled = !(user.two_factor_enabled === true || user.two_factor_enabled === 1);
    }
  } catch (err) {
    alert(err.response?.data?.message || 'Erreur lors de la modification de la 2FA');
  } finally {
    actionLoading.value[user.id] = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

async function confirmDelete(user) {
  if (!confirm(`Supprimer définitivement l'utilisateur ${user.name} (${user.email}) ? Cette action est irréversible.`)) {
    return;
  }
  actionLoading.value[user.id] = true;
  try {
    await setCsrfToken();
    await adminAxios.delete(`/api/admin/users/${user.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    // Retirer l'utilisateur de la liste
    users.value = users.value.filter((u) => u.id !== user.id);
  } catch (err) {
    alert(err.response?.data?.message || "Erreur lors de la suppression de l'utilisateur");
  } finally {
    actionLoading.value[user.id] = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

function viewUser(user) {
  selectedUser.value = user;
  // Charger ses commandes
  fetchUserOrders(user.id);
}

function closeModal() {
  selectedUser.value = null;
}

function formatRole(role) {
  const roles = {
    individual: 'Individuel',
    business_admin: 'Admin Entreprise',
    employee: 'Employé',
    admin: 'Admin',
    super_admin: 'Super Admin'
  };
  return roles[role] || role;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Appeler fetchUsers au montage du composant
onMounted(() => {
  fetchUsers();
});

// ---- Commandes par utilisateur ----
function isOrderValidated(order) {
  const s = (order?.status || '').toString().toLowerCase();
  // Tolérant à différentes formes côté backend
  return (
    s === 'validated' ||
    s === 'validé' ||
    s === 'valide'
  );
}

// Fonction pour vérifier si une commande a un design défini
function hasDesignDefined(order) {
  if (!order) return false;
  
  // Normaliser d'abord
  const normalized = normalizeLegacyDesign(order);
  
  // Vérifier dans les champs normalisés
  if (normalized.no_design_yet) return false; // bloque validation
  if (normalized.card_design_type === 'template' && normalized.card_design_number) return true;
  if (normalized.card_design_type === 'custom' && normalized.card_design_custom_url) return true;
  
  // Pour les commandes business, vérifier aussi dans order_employees
  // car le design du business admin peut être stocké dans l'entrée OrderEmployee
  if (normalized.order_type === 'business' || normalized.order_type === 'entreprise') {
    if (normalized.order_employees && Array.isArray(normalized.order_employees)) {
      // Chercher le business admin dans order_employees (celui avec employee_id = user_id)
      const businessAdminEmployee = normalized.order_employees.find(
        (emp) => emp.employee_id === normalized.user_id
      );
      if (businessAdminEmployee) {
        // Vérifier si le business admin a un design défini
        if (businessAdminEmployee.no_design_yet) return false;
        if (businessAdminEmployee.card_design_type === 'template' && businessAdminEmployee.card_design_number) {
          return true;
        }
        if (businessAdminEmployee.card_design_type === 'custom' && businessAdminEmployee.card_design_custom_url) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Filtrer les commandes validées avec déduplication et vérification du design
const validatedOrders = computed(() => {
  const allOrders = userOrders.value || [];
  
  console.log('AdminUserList: validatedOrders - Toutes les commandes', {
    totalOrders: allOrders.length,
    orders: allOrders.map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      order_type: o.order_type,
      card_design_type: o.card_design_type,
      card_design_number: o.card_design_number,
      no_design_yet: o.no_design_yet,
      isOrderValidated: isOrderValidated(o),
      hasDesignDefined: hasDesignDefined(o),
    })),
  });
  
  const orders = allOrders.filter((o) => {
    // Vérifier que la commande est validée
    const isValidated = isOrderValidated(o);
    if (!isValidated) {
      console.log('AdminUserList: validatedOrders - Commande non validée', {
        orderId: o.id,
        orderNumber: o.order_number,
        status: o.status,
      });
      return false;
    }
    
    // Vérifier que la commande a un design défini
    const hasDesign = hasDesignDefined(o);
    if (!hasDesign) {
      console.log('AdminUserList: validatedOrders - Commande validée mais sans design', {
        orderId: o.id,
        orderNumber: o.order_number,
        status: o.status,
        card_design_type: o.card_design_type,
        card_design_number: o.card_design_number,
        no_design_yet: o.no_design_yet,
        order_employees: o.order_employees,
      });
      return false;
    }
    
    console.log('AdminUserList: validatedOrders - Commande validée avec design', {
      orderId: o.id,
      orderNumber: o.order_number,
      status: o.status,
      card_design_type: o.card_design_type,
      card_design_number: o.card_design_number,
    });
    
    return true;
  });
  
  console.log('AdminUserList: validatedOrders - Commandes validées avec design', {
    validatedOrdersCount: orders.length,
    validatedOrders: orders.map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
    })),
  });
  
  // Dédupliquer par order_id : garder uniquement la commande la plus récente pour chaque order_id
  const seenOrderIds = new Map();
  const deduplicated = [];
  
  for (const order of orders) {
    const orderId = order.id || order.order_id || null;
    
    if (orderId) {
      // Si on a déjà vu cette commande, comparer les dates
      if (seenOrderIds.has(orderId)) {
        const existingOrder = seenOrderIds.get(orderId);
        const existingDate = new Date(existingOrder.created_at || existingOrder.createdAt || 0);
        const currentDate = new Date(order.created_at || order.createdAt || 0);
        
        // Garder la commande la plus récente
        if (currentDate > existingDate) {
          // Remplacer l'ancienne commande par la plus récente
          const index = deduplicated.findIndex(o => {
            const oId = o.id || o.order_id;
            return oId === orderId;
          });
          if (index !== -1) {
            deduplicated[index] = order;
          }
          seenOrderIds.set(orderId, order);
        }
        // Sinon, ignorer cette commande (on garde l'existante)
      } else {
        // Première fois qu'on voit cette commande, l'ajouter
        deduplicated.push(order);
        seenOrderIds.set(orderId, order);
      }
    } else {
      // Si pas d'order_id, ajouter quand même (ne devrait pas arriver)
      deduplicated.push(order);
    }
  }
  
  console.log('AdminUserList: validatedOrders - Commandes dédupliquées', {
    deduplicatedCount: deduplicated.length,
    deduplicatedOrders: deduplicated.map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
    })),
  });
  
  return deduplicated;
});

async function fetchUserOrders(userId) {
  userOrdersLoading.value = true;
  userOrders.value = [];
  try {
    // Récupérer l'utilisateur pour déterminer son rôle
    const user = users.value.find(u => u.id === userId);
    const isEmployee = user?.role === 'employee';
    
    // Déclarer uidNum et uidStr avant leur utilisation
    const uidNum = Number(userId);
    const uidStr = String(userId);

    // Essai 1: endpoint générique avec filtre user_id (moins sensible aux CORS/OPTIONS)
    // IMPORTANT: Ne pas filtrer par statut pour récupérer toutes les commandes (pending, validated, cancelled)
    let res = await adminAxios.get(`/api/admin/orders`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
      params: { 
        user_id: userId,
        per_page: 1000, // Récupérer toutes les commandes
        // Ne pas filtrer par status pour récupérer toutes les commandes
      },
    });
    let raw = res?.data?.orders?.data || res?.data?.orders || res?.data?.data || res?.data || [];
    let arr = Array.isArray(raw) ? raw : [];
    
    console.log('AdminUserList: fetchUserOrders - Essai 1 (user_id filter)', {
      userId,
      responseData: res?.data,
      ordersCount: arr.length,
      orders: arr.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        user_id: o.user_id,
      })),
    });

    // Si paginé, récupérer toutes les pages
    if (res?.data?.orders?.last_page > 1) {
      const allPages = [arr];
      for (let page = 2; page <= res.data.orders.last_page; page++) {
        try {
          const pageRes = await adminAxios.get(`/api/admin/orders`, {
            headers: { Authorization: `Bearer ${authStore.token}` },
            params: { 
              user_id: userId,
              per_page: 1000, 
              page: page 
            },
          });
          const pageData = pageRes?.data?.orders?.data || pageRes?.data?.orders || pageRes?.data?.data || pageRes?.data || [];
          if (Array.isArray(pageData)) {
            allPages.push(pageData);
          }
        } catch (_) {
          // Ignorer les erreurs de pagination
        }
      }
      arr = allPages.flat();
    }

    // Si vide, Essai 2: endpoint dédié /users/:id/orders (si disponible)
    if (arr.length === 0) {
      try {
        res = await adminAxios.get(`/api/admin/users/${userId}/orders`, {
          headers: { Authorization: `Bearer ${authStore.token}` },
        });
        raw = res?.data?.orders?.data || res?.data?.orders || res?.data?.data || res?.data || [];
        arr = Array.isArray(raw) ? raw : [];
      } catch (_) {
        // Ignorer
      }
    }

    // Si encore vide ou si le backend ignore le paramètre user_id, Essai 3: récupérer toutes les commandes puis filtrer côté client
    // (Important pour les business admins dont les commandes peuvent être dans order_employees)
    // TOUJOURS récupérer toutes les commandes pour s'assurer de récupérer les commandes validées
    // car le backend peut ne pas retourner toutes les commandes avec le filtre user_id
    const hasValidatedOrders = arr.some(o => {
      const s = (o?.status || '').toString().toLowerCase();
      return s === 'validated' || s === 'validé' || s === 'valide';
    });
    
    if (arr.length === 0 || !hasValidatedOrders || (arr.length > 0 && !arr.some(o => {
      const ids = [o?.user_id, o?.owner_id, o?.customer_id, o?.buyer_id, o?.employee_user_id, o?.user?.id];
      return ids.some((id) => id === uidNum || String(id) === uidStr);
    }))) {
      try {
        res = await adminAxios.get(`/api/admin/orders`, {
          headers: { Authorization: `Bearer ${authStore.token}` },
          params: { per_page: 1000 },
        });
        raw = res?.data?.orders?.data || res?.data?.orders || res?.data?.data || res?.data || [];
        const newArr = Array.isArray(raw) ? raw : [];
        
        // Si paginé, récupérer toutes les pages
        if (res?.data?.orders?.last_page > 1) {
          const allPages = [newArr];
          for (let page = 2; page <= res.data.orders.last_page; page++) {
            try {
              const pageRes = await adminAxios.get(`/api/admin/orders`, {
                headers: { Authorization: `Bearer ${authStore.token}` },
                params: { per_page: 1000, page: page },
              });
              const pageData = pageRes?.data?.orders?.data || pageRes?.data?.orders || pageRes?.data?.data || pageRes?.data || [];
              if (Array.isArray(pageData)) {
                allPages.push(pageData);
              }
            } catch (_) {
              // Ignorer les erreurs de pagination
            }
          }
          // Fusionner avec arr existant (éviter les doublons)
          const merged = [...arr, ...allPages.flat()];
          // Dédupliquer par id
          const unique = merged.filter((o, index, self) => 
            index === self.findIndex((t) => (t.id || t.order_id) === (o.id || o.order_id))
          );
          arr = unique;
        } else {
          // Fusionner avec arr existant (éviter les doublons)
          const merged = [...arr, ...newArr];
          // Dédupliquer par id
          const unique = merged.filter((o, index, self) => 
            index === self.findIndex((t) => (t.id || t.order_id) === (o.id || o.order_id))
          );
          arr = unique;
        }
        
        console.log('AdminUserList: fetchUserOrders - Essai 3 (toutes les commandes)', {
          userId,
          totalOrdersRetrieved: arr.length,
          ordersByStatus: arr.reduce((acc, o) => {
            const status = o.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}),
          orders: arr.map(o => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            user_id: o.user_id,
            order_type: o.order_type,
            hasOrderEmployees: !!o.order_employees,
            orderEmployeesCount: o.order_employees?.length || 0,
            orderEmployees: o.order_employees?.map(emp => ({
              employee_id: emp.employee_id,
            })) || [],
          })),
        });
      } catch (_) {
        // Ignorer
      }
    }

    // Filtrer les commandes selon le rôle de l'utilisateur
    // (uidNum et uidStr sont déjà déclarés plus haut)
    let filtered = [];

    if (isEmployee) {
      // Pour les employés, récupérer les commandes du business admin où l'employé est inclus
      // (via order_employees avec employee_id === userId)
      filtered = arr.filter((o) => {
        // Vérifier si c'est une commande business
        if (o.order_type !== 'business' && o.order_type !== 'entreprise') {
          return false;
        }
        
        // Vérifier si l'employé est dans order_employees
        if (o.order_employees && Array.isArray(o.order_employees)) {
          const employeeInOrder = o.order_employees.find(
            (emp) => emp.employee_id === uidNum || String(emp.employee_id) === uidStr
          );
          return !!employeeInOrder;
        }
        
        return false;
      });
    } else {
      // Pour les autres utilisateurs (business admin, individual, etc.), filtrer par user_id
      // MAIS aussi vérifier si le business admin est inclus dans order_employees
      // (car pour les commandes business, le business admin peut être dans order_employees)
      filtered = arr.filter((o) => {
        // Vérifier d'abord par user_id classique
        const ids = [o?.user_id, o?.owner_id, o?.customer_id, o?.buyer_id, o?.employee_user_id, o?.user?.id];
        if (ids.some((id) => id === uidNum || String(id) === uidStr)) {
          return true;
        }
        
        // Pour les commandes business, vérifier aussi si le business admin est dans order_employees
        // (car le business admin peut être inclus dans sa propre commande)
        // IMPORTANT: Vérifier même si user_id ne correspond pas, car les commandes validées
        // peuvent avoir un user_id différent mais le business admin peut être dans order_employees
        if (o.order_employees && Array.isArray(o.order_employees)) {
          const businessAdminInOrder = o.order_employees.find(
            (emp) => emp.employee_id === uidNum || String(emp.employee_id) === uidStr
          );
          if (businessAdminInOrder) {
            console.log('AdminUserList: fetchUserOrders - Commande trouvée via order_employees', {
              orderId: o.id,
              orderNumber: o.order_number,
              status: o.status,
              user_id: o.user_id,
              order_type: o.order_type,
              businessAdminEmployeeId: businessAdminInOrder.employee_id,
              userId: userId,
              orderEmployees: o.order_employees.map(emp => ({
                employee_id: emp.employee_id,
              })),
            });
            return true;
          }
        }
        
        return false;
      });
    }

    console.log('AdminUserList: fetchUserOrders - Commandes filtrées', {
      userId,
      userRole: user?.role,
      isEmployee,
      totalOrdersBeforeFilter: arr.length,
      filteredOrdersCount: filtered.length,
      filteredOrders: filtered.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        order_type: o.order_type,
        user_id: o.user_id,
        hasOrderEmployees: !!o.order_employees,
        orderEmployeesCount: o.order_employees?.length || 0,
      })),
    });

    // Normaliser les commandes (anciens champs de design / structures)
    // IMPORTANT: S'assurer que les données nécessaires pour l'URL du profil sont bien présentes
    userOrders.value = filtered.map((o) => {
      const normalized = normalizeLegacyDesign(o);
      
      // IMPORTANT: Copier aussi le token depuis les structures imbriquées si disponible
      if (normalized.profile) {
        if (normalized.profile.access_token) {
          normalized.access_token = normalized.profile.access_token;
        }
        if (normalized.profile.profile_token) {
          normalized.profile_token = normalized.profile.profile_token;
        }
        if (normalized.profile.public_token) {
          normalized.public_token = normalized.profile.public_token;
        }
        if (normalized.profile.token) {
          normalized.token = normalized.profile.token;
        }
      }
      if (normalized.order_profile) {
        if (normalized.order_profile.access_token) {
          normalized.access_token = normalized.order_profile.access_token;
        }
        if (normalized.order_profile.profile_token) {
          normalized.profile_token = normalized.order_profile.profile_token;
        }
        if (normalized.order_profile.public_token) {
          normalized.public_token = normalized.order_profile.public_token;
        }
        if (normalized.order_profile.token) {
          normalized.token = normalized.order_profile.token;
        }
      }
      if (normalized.public_profile) {
        if (normalized.public_profile.access_token) {
          normalized.access_token = normalized.public_profile.access_token;
        }
        if (normalized.public_profile.profile_token) {
          normalized.profile_token = normalized.public_profile.profile_token;
        }
        if (normalized.public_profile.public_token) {
          normalized.public_token = normalized.public_profile.public_token;
        }
        if (normalized.public_profile.token) {
          normalized.token = normalized.public_profile.token;
        }
      }
      
      return normalized;
    });
    
    console.log('AdminUserList: fetchUserOrders - Commandes normalisées', {
      userId,
      normalizedOrdersCount: userOrders.value.length,
      normalizedOrders: userOrders.value.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        order_type: o.order_type,
        user_id: o.user_id,
        card_design_type: o.card_design_type,
        card_design_number: o.card_design_number,
        no_design_yet: o.no_design_yet,
        hasOrderEmployees: !!o.order_employees,
        orderEmployeesCount: o.order_employees?.length || 0,
        orderEmployees: o.order_employees?.map(emp => ({
          employee_id: emp.employee_id,
          card_design_type: emp.card_design_type,
          card_design_number: emp.card_design_number,
          no_design_yet: emp.no_design_yet,
        })) || [],
        isOrderValidated: isOrderValidated(o),
        hasDesignDefined: hasDesignDefined(o),
        // Données pour l'URL du profil
        username: o.user?.username || o.username || o.profile_username,
        access_token: o.access_token || o.profile_token || o.public_token || o.token,
        profileUrl: getOrderProfileUrl(o),
        fullProfileUrl: getFullOrderProfileUrl(o),
      })),
    });
  } catch (err) {
    console.warn('Impossible de charger les commandes utilisateur:', err);
    userOrders.value = [];
  } finally {
    userOrdersLoading.value = false;
  }
}

// ---- Récupération label design (même logique que AdminOrderList/OrdersView) ----
function getDesignLabelForOrder(order, user) {
  if (!order) return 'N/A';

  // Normaliser d'abord pour s'assurer que les données sont au bon endroit
  normalizeLegacyDesign(order);

  // Obtenir les données de design depuis l'ordre normalisé
  const designData = (() => {
    // Commande employé (structure imbriquée)
    if (order.employee_profile) {
      return {
        card_design_type: order.employee_profile.card_design_type,
        card_design_number: order.employee_profile.card_design_number,
        card_design_custom_url: order.employee_profile.card_design_custom_url,
        no_design_yet: order.employee_profile.no_design_yet,
      };
    }
    
    // Pour les commandes business, vérifier aussi dans order_employees
    // car le design du business admin peut être stocké dans l'entrée OrderEmployee
    // IMPORTANT: Vérifier si l'utilisateur sélectionné est le business admin dans order_employees
    if ((order.order_type === 'business' || order.order_type === 'entreprise') && order.order_employees && Array.isArray(order.order_employees)) {
      // Chercher l'utilisateur sélectionné dans order_employees
      const userId = user?.id ? Number(user.id) : null;
      if (userId) {
        const userEmployee = order.order_employees.find(
          (emp) => emp.employee_id === userId
        );
        if (userEmployee && (userEmployee.card_design_type || userEmployee.card_design_number || userEmployee.card_design_custom_url || userEmployee.no_design_yet !== undefined)) {
          return {
            card_design_type: userEmployee.card_design_type,
            card_design_number: userEmployee.card_design_number,
            card_design_custom_url: userEmployee.card_design_custom_url,
            no_design_yet: userEmployee.no_design_yet,
          };
        }
      }
      
      // Fallback: Chercher le business admin dans order_employees (celui avec employee_id = user_id)
      const businessAdminEmployee = order.order_employees.find(
        (emp) => emp.employee_id === order.user_id
      );
      if (businessAdminEmployee && (businessAdminEmployee.card_design_type || businessAdminEmployee.card_design_number || businessAdminEmployee.card_design_custom_url || businessAdminEmployee.no_design_yet !== undefined)) {
        return {
          card_design_type: businessAdminEmployee.card_design_type,
          card_design_number: businessAdminEmployee.card_design_number,
          card_design_custom_url: businessAdminEmployee.card_design_custom_url,
          no_design_yet: businessAdminEmployee.no_design_yet,
        };
      }
    }
    
    // Commande classique (champs à plat)
    // normalizeLegacyDesign a déjà copié le design au niveau racine si disponible
    return {
      card_design_type: order.card_design_type,
      card_design_number: order.card_design_number,
      card_design_custom_url: order.card_design_custom_url,
      no_design_yet: order.no_design_yet,
    };
  })();

  if (!designData) return 'N/A';
  if (designData.no_design_yet) return 'Design en attente';
  if (designData.card_design_type === 'template' && designData.card_design_number) {
    return `Design${designData.card_design_number}`;
  }
  if (designData.card_design_type === 'custom' && (designData.card_design_custom_url || true)) {
    return 'Design Personnel';
  }
  // Anciennes structures simples
  if (order.design_name) return order.design_name;
  if (order.design_id) return `Design ${order.design_id}`;
  return 'N/A';
}

// ---- Normalisation legacy (anciens champs/structures) ----
function normalizeLegacyDesign(order) {
  if (!order || typeof order !== 'object') return order;

  // Si déjà normalisé, sortir
  if (order.card_design_type || order.card_design_number || order.card_design_custom_url || order.no_design_yet !== undefined) {
    return order;
  }

  // 1) Structures employé
  const ep = order.employee_profile || order.employee || null;
  if (ep && (ep.card_design_type || ep.card_design_number || ep.card_design_custom_url || ep.no_design_yet !== undefined)) {
    order.card_design_type = ep.card_design_type;
    order.card_design_number = ep.card_design_number;
    order.card_design_custom_url = ep.card_design_custom_url;
    order.no_design_yet = ep.no_design_yet;
    return order;
  }

  // 1.5) Pour les commandes business, vérifier aussi dans order_employees
  // car le design du business admin peut être stocké dans l'entrée OrderEmployee
  if ((order.order_type === 'business' || order.order_type === 'entreprise') && order.order_employees && Array.isArray(order.order_employees)) {
    // Chercher le business admin dans order_employees (celui avec employee_id = user_id)
    const businessAdminEmployee = order.order_employees.find(
      (emp) => emp.employee_id === order.user_id
    );
    if (businessAdminEmployee && (businessAdminEmployee.card_design_type || businessAdminEmployee.card_design_number || businessAdminEmployee.card_design_custom_url || businessAdminEmployee.no_design_yet !== undefined)) {
      order.card_design_type = businessAdminEmployee.card_design_type;
      order.card_design_number = businessAdminEmployee.card_design_number;
      order.card_design_custom_url = businessAdminEmployee.card_design_custom_url;
      order.no_design_yet = businessAdminEmployee.no_design_yet;
      return order;
    }
  }

  // 2) Structure public_profile / order_profile
  const pp = order.public_profile || order.order_profile || order.profile || null;
  if (pp && (pp.card_design_type || pp.card_design_number || pp.card_design_custom_url || pp.no_design_yet !== undefined)) {
    order.card_design_type = pp.card_design_type;
    order.card_design_number = pp.card_design_number;
    order.card_design_custom_url = pp.card_design_custom_url;
    order.no_design_yet = pp.no_design_yet;
    return order;
  }

  // 3) Héritage via user.profile
  const up = order.user?.profile || null;
  if (up && (up.card_design_type || up.card_design_number || up.card_design_custom_url || up.no_design_yet !== undefined)) {
    order.card_design_type = up.card_design_type;
    order.card_design_number = up.card_design_number;
    order.card_design_custom_url = up.card_design_custom_url;
    order.no_design_yet = up.no_design_yet;
    return order;
  }

  // 4) Anciennes clés diverses
  if (!order.card_design_type) {
    if (order.card_design_number) order.card_design_type = 'template';
    else if (order.card_design_custom_url) order.card_design_type = 'custom';
    else if (typeof order.design_name === 'string') {
      const m = order.design_name.match(/design\s*(\d+)/i);
      if (m) {
        order.card_design_type = 'template';
        order.card_design_number = Number(m[1]);
      }
    }
  }

  // no_design_yet hérité
  if (order.no_design_yet === undefined && (pp?.no_design_yet || up?.no_design_yet)) {
    order.no_design_yet = pp?.no_design_yet || up?.no_design_yet || false;
  }

  return order;
}

// ---- Date courte ----
function formatShortDate(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ---- Quantité de cartes assignée à l'utilisateur pour cette commande ----
function getCardQuantityForUserInOrder(order, user) {
  if (!order || !user) return 0;
  
  // Pour les employés, retourner la quantité assignée depuis order_employees
  if (user.role === 'employee') {
    if (order.order_employees && Array.isArray(order.order_employees)) {
      const employeeEntry = order.order_employees.find(
        (emp) => emp.employee_id === user.id || emp.employee_email === user.email
      );
      if (employeeEntry) {
        // Retourner la quantité de cartes assignée à cet employé
        return employeeEntry.card_quantity || 0;
      }
    }
    // Si l'employé n'est pas trouvé dans order_employees, retourner 0
    return 0;
  }
  
  // Pour les commandes business, vérifier si le business admin est dans order_employees
  if ((order.order_type === 'business' || order.order_type === 'entreprise') && order.order_employees && Array.isArray(order.order_employees)) {
    // Chercher l'utilisateur dans order_employees (peut être le business admin ou un employé)
    const userEntry = order.order_employees.find(
      (emp) => emp.employee_id === user.id
    );
    if (userEntry) {
      // Retourner la quantité de cartes assignée à cet utilisateur dans order_employees
      return userEntry.card_quantity || 0;
    }
    // Si l'utilisateur n'est pas dans order_employees, utiliser le total de la commande
    // (cas où le business admin n'est pas inclus dans la commande)
    return order.card_quantity || order.quantity || 0;
  }
  
  // Pour les commandes individuelles ou si l'utilisateur n'est pas dans order_employees,
  // retourner le total de la commande
  return order.card_quantity || order.quantity || 0;
}

// ---- URL du profil public ----
function getBackendUrl() {
  return import.meta.env.VITE_APP_URL_BACKEND || 'http://localhost:8000';
}

function getOrderProfileUsername(order, user) {
  if (!order) return null;
  
  // Pour les employés, chercher le username dans order_employees ou employee_profile
  if (user?.role === 'employee') {
    // Chercher l'employé dans order_employees
    if (order.order_employees && Array.isArray(order.order_employees)) {
      const employeeEntry = order.order_employees.find(
        (emp) => emp.employee_id === user.id || emp.employee_email === user.email
      );
      if (employeeEntry) {
        // Chercher le username dans employee_profile ou directement dans l'entrée
        if (employeeEntry.employee_profile?.username) {
          return employeeEntry.employee_profile.username;
        }
        if (employeeEntry.employee?.username) {
          return employeeEntry.employee.username;
        }
        if (employeeEntry.username) {
          return employeeEntry.username;
        }
        if (employeeEntry.profile_username) {
          return employeeEntry.profile_username;
        }
      }
    }
    
    // Chercher dans employee_profile au niveau racine
    if (order.employee_profile?.username) {
      return order.employee_profile.username;
    }
    if (order.employee?.username) {
      return order.employee.username;
    }
  }
  
  // Pour les business_admin et particuliers, utiliser la même logique que AdminDashboard
  // 1. Chercher dans les données du profil public de la commande
  if (order?.profile?.username) return order.profile.username;
  if (order?.order_profile?.username) return order.order_profile.username;
  if (order?.public_profile?.username) return order.public_profile.username;
  
  // 2. Chercher directement dans la commande
  if (order?.profile_username) return order.profile_username;
  if (order?.public_username) return order.public_username;
  if (order?.username) return order.username;
  if (order?.employee_username) return order.employee_username;
  
  // 3. Pour les commandes individuelles validées, utiliser le username de l'utilisateur
  if (order?.status === 'validated') {
    if (order?.order_type === 'individual' || order?.order_type === 'personal') {
      if (order?.profile_username) return order.profile_username;
      if (order?.user?.username) return order.user.username;
      if (order?.user_username) return order.user_username;
    }
  }
  
  // 4. Fallback : utiliser le username de l'utilisateur
  if ((order?.order_type === 'individual' || order?.order_type === 'personal') && order?.user?.username) {
    return order.user.username;
  }
  
  return null;
}

function getOrderAccessToken(order, user) {
  if (!order) return null;
  
  // Pour les employés, chercher le token dans order_employees ou employee_profile
  if (user?.role === 'employee') {
    // Chercher l'employé dans order_employees
    if (order.order_employees && Array.isArray(order.order_employees)) {
      const employeeEntry = order.order_employees.find(
        (emp) => emp.employee_id === user.id || emp.employee_email === user.email
      );
      if (employeeEntry) {
        // Chercher le token dans employee_profile ou directement dans l'entrée
        if (employeeEntry.employee_profile?.access_token) {
          return employeeEntry.employee_profile.access_token;
        }
        if (employeeEntry.employee_profile?.profile_token) {
          return employeeEntry.employee_profile.profile_token;
        }
        if (employeeEntry.employee_profile?.public_token) {
          return employeeEntry.employee_profile.public_token;
        }
        if (employeeEntry.employee_profile?.token) {
          return employeeEntry.employee_profile.token;
        }
        if (employeeEntry.access_token) {
          return employeeEntry.access_token;
        }
        if (employeeEntry.profile_token) {
          return employeeEntry.profile_token;
        }
        if (employeeEntry.public_token) {
          return employeeEntry.public_token;
        }
        if (employeeEntry.token) {
          return employeeEntry.token;
        }
      }
    }
    
    // Chercher dans employee_profile au niveau racine
    if (order.employee_profile?.access_token) {
      return order.employee_profile.access_token;
    }
    if (order.employee_profile?.profile_token) {
      return order.employee_profile.profile_token;
    }
    if (order.employee_profile?.public_token) {
      return order.employee_profile.public_token;
    }
    if (order.employee_profile?.token) {
      return order.employee_profile.token;
    }
    if (order.employee?.access_token) {
      return order.employee.access_token;
    }
    if (order.employee?.profile_token) {
      return order.employee.profile_token;
    }
    if (order.employee?.public_token) {
      return order.employee.public_token;
    }
    if (order.employee?.token) {
      return order.employee.token;
    }
  }
  
  // Pour les business_admin et particuliers, utiliser la même logique que AdminDashboard
  // Chercher le token dans différentes propriétés possibles (niveau racine)
  if (order.access_token) return order.access_token;
  if (order.profile_token) return order.profile_token;
  if (order.public_token) return order.public_token;
  if (order.token) return order.token;
  
  // Chercher le token dans les structures imbriquées
  if (order.profile?.access_token) return order.profile.access_token;
  if (order.profile?.profile_token) return order.profile.profile_token;
  if (order.profile?.public_token) return order.profile.public_token;
  if (order.profile?.token) return order.profile.token;
  
  if (order.order_profile?.access_token) return order.order_profile.access_token;
  if (order.order_profile?.profile_token) return order.order_profile.profile_token;
  if (order.order_profile?.public_token) return order.order_profile.public_token;
  if (order.order_profile?.token) return order.order_profile.token;
  
  if (order.public_profile?.access_token) return order.public_profile.access_token;
  if (order.public_profile?.profile_token) return order.public_profile.profile_token;
  if (order.public_profile?.public_token) return order.public_profile.public_token;
  if (order.public_profile?.token) return order.public_profile.token;
  
  return null;
}

function getOrderProfileUrl(order, user) {
  if (!order) return '';
  
  const username = getOrderProfileUsername(order, user);
  if (!username) return '';
  
  const accessToken = getOrderAccessToken(order, user);
  const orderId = order.id;
  
  if (accessToken) {
    // Utiliser le token sécurisé
    return `/profil/${username}?token=${accessToken}`;
  } else if (orderId) {
    // Fallback pour les anciennes commandes sans token
    return `/profil/${username}?order=${orderId}`;
  }
  
  // Si pas de token ni d'orderId, retourner juste le profil sans paramètre
  return `/profil/${username}`;
}

function getFullOrderProfileUrl(order, user) {
  if (!order) return '';
  const backendUrl = getBackendUrl();
  const path = getOrderProfileUrl(order, user);
  if (!path) return '';
  return `${backendUrl}${path}`;
}

function copyProfileUrl(url) {
  if (!url) return;
  
  navigator.clipboard
    .writeText(url)
    .then(() => {
      copiedProfileUrl.value = url;
      setTimeout(() => {
        copiedProfileUrl.value = null;
      }, 2000);
    })
    .catch((err) => {
      console.error('Erreur lors de la copie:', err);
      // Fallback pour les navigateurs qui ne supportent pas clipboard API
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      copiedProfileUrl.value = url;
      setTimeout(() => {
        copiedProfileUrl.value = null;
      }, 2000);
    });
}
</script>

<style scoped>
.admin-user-list {
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
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
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

.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.75rem 1rem;
  min-width: 150px;
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
  text-align: center;
  padding: 0.625rem;
  margin: 0.5rem 0.75rem;
  background: linear-gradient(90deg, #dbeafe 0%, #bfdbfe 50%, #dbeafe 100%);
  color: #1e40af;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.375rem;
  animation: pulse-hint 2s infinite;
}

@keyframes pulse-hint {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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
  min-width: 800px;
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

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.role-individual {
  background-color: #e0e7ff;
  color: #4338ca;
}

.role-business_admin {
  background-color: #fef3c7;
  color: #92400e;
}

.role-employee {
  background-color: #dbeafe;
  color: #1e40af;
}

.role-admin,
.role-super_admin {
  background-color: #fce7f3;
  color: #9f1239;
}

.status-active,
.status-suspended {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-active {
  background-color: #d1fae5;
  color: #065f46;
}

.status-suspended {
  background-color: #fed7d7;
  color: #c53030;
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

.btn-suspend {
  background-color: #ef4444;
  color: #fff;
}

.btn-suspend:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-activate {
  background-color: #10b981;
  color: #fff;
}

.btn-activate:hover:not(:disabled) {
  background-color: #059669;
}

.btn-2fa-active {
  background-color: #3b82f6;
  color: #fff;
}

.btn-2fa-active:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-2fa-inactive {
  background-color: #6b7280;
  color: #fff;
}

.btn-2fa-inactive:hover:not(:disabled) {
  background-color: #4b5563;
}

.btn-2fa-active {
  background-color: #3b82f6;
  color: #fff;
}

.btn-2fa-active:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-2fa-inactive {
  background-color: #6b7280;
  color: #fff;
}

.btn-2fa-inactive:hover:not(:disabled) {
  background-color: #4b5563;
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
  max-width: 600px;
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

.orders-section {
  margin-top: 1rem;
}

.orders-title {
  margin: 0.5rem 0 0.75rem 0;
  font-weight: 600;
  color: #1f2937;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.orders-table th,
.orders-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  text-align: left;
}

.orders-table thead th {
  background: #f3f4f6;
  font-weight: 600;
}

.profile-url-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-view-profile {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  background-color: #3b82f6;
  color: #fff;
  text-decoration: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-view-profile:hover {
  background-color: #2563eb;
  text-decoration: none;
  color: #fff;
}

.btn-copy-url {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-copy-url:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.no-profile-url {
  color: #9ca3af;
  font-style: italic;
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

/* Écrans moyens (max-width: 1024px) */
@media (max-width: 1024px) {
  .admin-user-list {
    padding: 0;
  }

  .table-header {
    flex-wrap: wrap;
  }
}

/* Tablettes (max-width: 768px) */
@media (max-width: 768px) {
  .admin-user-list {
    padding: 0;
  }

  .admin-user-list h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    padding: 0;
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

  .filters {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .filter-select {
    width: 100%;
    min-width: 100%;
    flex: 1 1 auto;
  }

  .table-wrapper {
    width: 100%;
    margin: 0;
  }

  table {
    font-size: 0.875rem;
    min-width: 700px;
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
  .admin-user-list {
    padding: 0 !important;
    margin: 0;
    width: 100%;
    overflow-x: hidden;
  }

  .admin-user-list h1 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    margin-top: 0;
    padding: 0 0.75rem;
    word-wrap: break-word;
    line-height: 1.3;
  }

  .table-header {
    gap: 0.625rem;
    margin-bottom: 0.75rem;
    padding: 0 0.75rem;
  }

  .search-input {
    padding: 0.625rem;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
  }

  .filters {
    gap: 0.625rem;
    width: 100%;
  }

  .filter-select {
    padding: 0.625rem;
    font-size: 0.875rem;
    width: 100%;
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
    min-width: 600px;
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

  .status-badge,
  .status-active,
  .status-suspended,
  .role-badge {
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
    font-size: 1.25rem;
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
    width: 100%;
  }

  .detail-label {
    width: 100%;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .detail-value {
    width: 100%;
    font-size: 0.875rem;
    word-wrap: break-word;
  }
}

/* Petits écrans (max-width: 360px) */
@media (max-width: 360px) {
  .admin-user-list h1 {
    font-size: 1.125rem;
  }

  table {
    min-width: 550px;
    font-size: 0.75rem;
  }

  th, td {
    padding: 0.375rem 0.25rem;
    font-size: 0.6875rem;
    min-width: 60px;
  }

  th:last-child,
  td:last-child {
    min-width: 180px !important;
    width: 180px !important;
    padding: 0.375rem 0.25rem;
  }

  .status-badge,
  .role-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }

  .action-buttons {
    min-width: 160px;
    gap: 0.25rem;
  }

  .btn-action {
    padding: 0.25rem 0.375rem;
    font-size: 0.6875rem;
    min-width: 36px;
  }
}
</style>

