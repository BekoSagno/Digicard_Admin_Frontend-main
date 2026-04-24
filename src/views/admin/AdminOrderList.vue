<template>
  <div class="admin-order-list">
    <h1>Gestion des Commandes</h1>
    <!-- Colonne Design ajoutée -->

    <!-- Statistiques -->
    <div v-if="stats" class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-label">En attente</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.validated }}</div>
        <div class="stat-label">Validées</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.cancelled }}</div>
        <div class="stat-label">Annulées</div>
      </div>
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">Chargement des commandes...</div>

    <!-- Affichage des erreurs -->
    <div v-else-if="error" class="error">Erreur : {{ error }}</div>

    <!-- Tableau des commandes -->
    <div v-else>
      <div class="table-header">
        <input v-model="searchQuery" type="text" placeholder="Rechercher par ID, utilisateur..." class="search-input" />
        <select v-model="statusFilter" class="filter-select">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="validated">Validée</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>

      <!-- Indication de scroll pour mobile -->
      <div class="scroll-hint">← Faites défiler pour voir toutes les colonnes →</div>

      <div class="table-scroll-container">
        <!-- Flèche gauche -->
        <button
          @click="scrollTable('left')"
          class="scroll-arrow scroll-arrow-left"
          :class="{ hidden: !canScrollLeft }"
          aria-label="Défiler vers la gauche"
        >
          ←
        </button>

        <!-- Flèche droite -->
        <button
          @click="scrollTable('right')"
          class="scroll-arrow scroll-arrow-right"
          :class="{ hidden: !canScrollRight }"
          aria-label="Défiler vers la droite"
        >
          →
        </button>

        <div ref="tableWrapper" class="table-wrapper" @scroll="updateScrollButtons">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Utilisateur</th>
                <th>Téléphone</th>
                <th>Type</th>
                <th>Quantité</th>
                <th>Design</th>
                <th>Photo</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in filteredOrders" :key="`${order.id}-${pricingVersion}`">
                <td>#{{ order.id }}</td>
                <td>{{ order.user?.name || "N/A" }}</td>
                <td>{{ order.user?.vcard_phone || order.user?.phone_numbers?.[0] || "N/A" }}</td>
                <td>{{ formatOrderType(order.order_type) }}</td>
                <td>{{ order.card_quantity || order.quantity || 0 }}</td>
                <td class="design-cell">
                  {{ formatDesign(order) }}
                </td>
                <td class="photo-cell">
                  <button
                    @click="showOrderPhotos(order)"
                    class="photo-button"
                    :disabled="!hasPhotos(order)"
                    :title="hasPhotos(order) ? 'Voir les photos' : 'Aucune photo disponible'"
                  >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                </td>
                <td>{{ formatPrice(getCorrectTotalPrice(order)) }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClassForOrder(order)">
                    {{ getStatusTextForOrder(order) }}
                  </span>
                </td>
                <td>{{ formatDate(order.created_at) }}</td>
                <td>
                  <div class="action-buttons">
                    <button @click="viewOrder(order)" class="btn-action btn-view" title="Voir les détails">👁️</button>
                    <button
                      v-if="order.status === 'validated'"
                      @click="viewPublicProfiles(order)"
                      class="btn-action btn-profile"
                      title="Voir le(s) profil(s) public(s)"
                    >
                      👤
                    </button>
                    <select
                      v-model="order.status"
                      @change="updateOrderStatus(order)"
                      class="status-select"
                      :disabled="actionLoading[order.id]"
                    >
                      <option value="pending">En attente</option>
                      <option value="validated">Validée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="orders.length === 0 && !loading" class="no-results">
        <p>Aucune commande n'a été créée pour le moment.</p>
        <p class="debug-info">Total des commandes: {{ orders.length }}</p>
      </div>

      <div v-else-if="filteredOrders.length === 0 && orders.length > 0" class="no-results">
        <p>Aucune commande ne correspond à vos critères de recherche.</p>
        <p class="debug-info">{{ orders.length }} commande(s) au total</p>
      </div>
    </div>

    <!-- Modal de détails commande -->
    <div v-if="selectedOrder" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Détails de la commande #{{ selectedOrder.id }}</h2>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h3>Informations générales</h3>
            <div class="detail-row">
              <span class="detail-label">ID:</span>
              <span class="detail-value">#{{ selectedOrder.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Utilisateur:</span>
              <span class="detail-value">{{ selectedOrder.user?.name }} ({{ selectedOrder.user?.email }})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Téléphone:</span>
              <span class="detail-value">{{
                selectedOrder.user?.vcard_phone || selectedOrder.user?.phone_numbers?.[0] || "N/A"
              }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">{{ formatOrderType(selectedOrder.order_type) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Quantité:</span>
              <span class="detail-value">
                {{ getTotalCardQuantity(selectedOrder) }} cartes
                <span
                  v-if="isBusinessOrder(selectedOrder) && hasOrderEmployees(selectedOrder)"
                  style="color: #6b7280; font-size: 0.875rem; margin-left: 0.5rem"
                >
                  (somme: {{ getSumOfEmployeeQuantities(selectedOrder) }})
                </span>
              </span>
            </div>
            <!-- Détails des employés pour les commandes business -->
            <div
              v-if="
                (selectedOrder.order_type === 'business' || selectedOrder.order_type === 'entreprise') &&
                selectedOrder.order_employees &&
                selectedOrder.order_employees.length > 0
              "
              class="detail-section"
              style="margin-top: 1rem"
            >
              <h3 style="font-size: 1rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem">
                Répartition des cartes par utilisateur
              </h3>
              <div
                v-for="emp in selectedOrder.order_employees"
                :key="emp.id || emp.employee_id"
                class="detail-row"
                style="padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6"
              >
                <span class="detail-label" style="font-weight: 500"
                  >{{ emp.employee_name || emp.employee?.name || `Employé #${emp.employee_id}` }}:</span
                >
                <span class="detail-value">{{ emp.card_quantity || 0 }} carte(s)</span>
              </div>
            </div>
            <div class="detail-row">
              <span class="detail-label">Design:</span>
              <span class="detail-value">{{ formatDesign(selectedOrder) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Prix total:</span>
              <span class="detail-value">{{ formatPrice(getCorrectTotalPrice(selectedOrder)) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Statut:</span>
              <span class="detail-value">
                <span class="status-badge" :class="`status-${selectedOrder.status}`">
                  {{ formatStatus(selectedOrder.status) }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Créée le:</span>
              <span class="detail-value">{{ formatDate(selectedOrder.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal pour afficher les profils publics -->
    <div v-if="showProfilesModal" class="modal-overlay" @click="closeProfilesModal">
      <div class="modal-content profiles-modal" @click.stop>
        <div class="modal-header">
          <h2>Profils Publics - Commande #{{ selectedOrderForProfiles?.id }}</h2>
          <button @click="closeProfilesModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedOrderForProfiles">
            <!-- Commande individuelle -->
            <div v-if="isIndividualOrder(selectedOrderForProfiles)" class="profiles-list">
              <div class="profile-item">
                <h3>Profil Individuel</h3>
                <div class="profile-info">
                  <p><strong>Nom:</strong> {{ selectedOrderForProfiles.user?.name }}</p>
                  <p><strong>Email:</strong> {{ selectedOrderForProfiles.user?.email }}</p>
                  <p v-if="getOrderProfileUsername(selectedOrderForProfiles)">
                    <strong>Username:</strong> {{ getOrderProfileUsername(selectedOrderForProfiles) }}
                  </p>
                </div>
                <div v-if="getOrderProfileUsername(selectedOrderForProfiles)" class="url-section">
                  <p><strong>URL publique:</strong></p>
                  <div class="url-display">
                    <input
                      :value="getFullIndividualProfileUrl()"
                      readonly
                      class="url-input"
                      @click="$event.target.select()"
                    />
                    <button @click="copyUrl(getFullIndividualProfileUrl())" class="btn-copy" title="Copier l'URL">
                      {{ copiedUrl === getFullIndividualProfileUrl() ? "✓" : "📋" }}
                    </button>
                  </div>
                </div>
                <a
                  v-if="getOrderProfileUsername(selectedOrderForProfiles)"
                  :href="getFullIndividualProfileUrl()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-profile-link"
                >
                  Voir le profil public →
                </a>
                <p v-else class="no-profile">Profil public non disponible</p>
              </div>
            </div>

            <!-- Commande entreprise -->
            <div v-else class="profiles-list">
              <!-- Profil Public de l'Utilisateur (Business Admin) -->
              <div class="profile-item">
                <h3>Profil Public de l'Utilisateur</h3>
                <div class="profile-info">
                  <p><strong>Nom:</strong> {{ selectedOrderForProfiles.user?.name }}</p>
                  <p><strong>Email:</strong> {{ selectedOrderForProfiles.user?.email }}</p>
                  <p v-if="getUserUsername(selectedOrderForProfiles)">
                    <strong>Username:</strong> {{ getUserUsername(selectedOrderForProfiles) }}
                  </p>
                </div>
                <div v-if="getOrderProfileUsername(selectedOrderForProfiles)" class="url-section">
                  <p><strong>URL publique:</strong></p>
                  <div class="url-display">
                    <input
                      :value="getFullIndividualProfileUrl()"
                      readonly
                      class="url-input"
                      @click="$event.target.select()"
                    />
                    <button @click="copyUrl(getFullIndividualProfileUrl())" class="btn-copy" title="Copier l'URL">
                      {{ copiedUrl === getFullIndividualProfileUrl() ? "✓" : "📋" }}
                    </button>
                  </div>
                </div>
                <a
                  v-if="getOrderProfileUsername(selectedOrderForProfiles)"
                  :href="getFullIndividualProfileUrl()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-profile-link"
                >
                  Voir le profil public →
                </a>
                <p v-else class="no-profile">Profil public non disponible</p>
              </div>

              <!-- Page Entreprise -->
              <div v-if="selectedOrderForProfiles.company_page?.username" class="profile-item">
                <h3>Page Entreprise</h3>
                <div class="profile-info">
                  <p v-if="selectedOrderForProfiles.company_page?.company_name">
                    <strong>Entreprise:</strong> {{ selectedOrderForProfiles.company_page?.company_name }}
                  </p>
                  <p v-if="selectedOrderForProfiles.company_page?.username">
                    <strong>Username:</strong> {{ selectedOrderForProfiles.company_page?.username }}
                  </p>
                </div>
                <div class="url-section">
                  <p><strong>URL publique:</strong></p>
                  <div class="url-display">
                    <input
                      :value="getFullCompanyProfileUrl(selectedOrderForProfiles.company_page.username)"
                      readonly
                      class="url-input"
                      @click="$event.target.select()"
                    />
                    <button
                      @click="copyUrl(getFullCompanyProfileUrl(selectedOrderForProfiles.company_page.username))"
                      class="btn-copy"
                      title="Copier l'URL"
                    >
                      {{
                        copiedUrl === getFullCompanyProfileUrl(selectedOrderForProfiles.company_page.username)
                          ? "✓"
                          : "📋"
                      }}
                    </button>
                  </div>
                </div>
                <a
                  :href="getFullCompanyProfileUrl(selectedOrderForProfiles.company_page.username)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-profile-link"
                >
                  Voir le profil entreprise →
                </a>
              </div>

              <!-- ✅ CORRECTION: Profils des employés depuis order_employees -->
              <div
                v-if="selectedOrderForProfiles.order_employees && selectedOrderForProfiles.order_employees.length > 0"
                class="employees-section"
              >
                <h3>Employés associés ({{ selectedOrderForProfiles.order_employees.length }})</h3>
                <div class="employees-list">
                  <div
                    v-for="orderEmployee in selectedOrderForProfiles.order_employees"
                    :key="orderEmployee.id"
                    class="profile-item employee-item"
                  >
                    <div class="profile-info">
                      <p>
                        <strong>Nom:</strong> {{ orderEmployee.employee_name || orderEmployee.employee?.name || "N/A" }}
                      </p>
                      <p>
                        <strong>Email:</strong>
                        {{ orderEmployee.employee_email || orderEmployee.employee?.email || "N/A" }}
                      </p>
                      <p v-if="getEmployeeUsername(orderEmployee)">
                        <strong>Username:</strong> {{ getEmployeeUsername(orderEmployee) }}
                      </p>
                      <p v-if="orderEmployee.card_quantity">
                        <strong>Nombre de cartes:</strong> {{ orderEmployee.card_quantity }}
                      </p>
                    </div>
                    <div v-if="getEmployeeUsername(orderEmployee)" class="url-section">
                      <p><strong>URL publique:</strong></p>
                      <div class="url-display">
                        <input
                          :value="
                            getFullEmployeeProfileUrl(orderEmployee, selectedOrderForProfiles.company_page?.username)
                          "
                          readonly
                          class="url-input"
                          @click="$event.target.select()"
                        />
                        <button
                          @click="
                            copyUrl(
                              getFullEmployeeProfileUrl(orderEmployee, selectedOrderForProfiles.company_page?.username),
                            )
                          "
                          class="btn-copy"
                          title="Copier l'URL"
                        >
                          {{
                            copiedUrl ===
                            getFullEmployeeProfileUrl(orderEmployee, selectedOrderForProfiles.company_page?.username)
                              ? "✓"
                              : "📋"
                          }}
                        </button>
                      </div>
                    </div>
                    <a
                      v-if="getEmployeeUsername(orderEmployee)"
                      :href="getFullEmployeeProfileUrl(orderEmployee, selectedOrderForProfiles.company_page?.username)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn-profile-link"
                    >
                      Voir le profil employé →
                    </a>
                    <p v-else class="no-profile">Profil non disponible</p>
                  </div>
                </div>
              </div>
              <div v-else class="no-employees">
                <p>Aucun employé associé à cette commande.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ NOUVEAU: Modal pour afficher les photos d'une commande -->
    <div v-if="showPhotosModal" class="modal-overlay" @click.self="closePhotosModal">
      <div class="modal-content-photos">
        <div class="modal-header">
          <h3>Photos de la commande #{{ selectedOrderForPhotos?.order_number }}</h3>
          <button @click="closePhotosModal" class="modal-close">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="orderPhotos.length === 0" class="no-photos">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p>Aucune photo disponible pour cette commande.</p>
            <p class="text-sm mt-2" style="color: #9ca3af">
              Les utilisateurs n'ont pas encore ajouté de photos lors du paramétrage de leurs cartes.
            </p>
          </div>

          <div v-else class="photos-grid">
            <div v-for="(photo, index) in orderPhotos" :key="index" class="photo-card">
              <div class="photo-header">
                <div>
                  <p class="photo-name">{{ photo.name }}</p>
                  <p class="photo-role">{{ photo.role }}</p>
                </div>
                <button @click="downloadPhoto(photo)" class="btn-download-photo" title="Télécharger la photo">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>
              </div>
              <div class="photo-image-container">
                <img
                  :src="getFullAvatarUrl(photo.avatar_url)"
                  :alt="photo.name"
                  class="photo-image"
                  @error="
                    $event.target.src =
                      'https://ui-avatars.com/api/?name=' +
                      encodeURIComponent(photo.name) +
                      '&background=6366f1&color=ffffff&size=256'
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUpdated, onUnmounted, nextTick } from "vue";
  import axios from "axios";
  import Cookies from "js-cookie";
  import { useAdminAuthStore } from "../../stores/adminAuth";

  const authStore = useAdminAuthStore();

  // Créer une instance axios pour l'admin avec la gestion CSRF
  const backendUrl = import.meta.env.VITE_APP_URL_BACKEND || "http://127.0.0.1:8000";
  const adminAxios = axios.create({
    baseURL: backendUrl,
    withCredentials: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
  });

  // Fonction pour obtenir et définir le CSRF token
  const setCsrfToken = async () => {
    try {
      await adminAxios.get("/sanctum/csrf-cookie");
      const xsrfToken = Cookies.get("XSRF-TOKEN");
      if (xsrfToken) {
        adminAxios.defaults.headers.common["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du CSRF token:", error);
    }
  };

  // État
  const orders = ref([]);
  const stats = ref(null);
  const loading = ref(true);
  const error = ref(null);
  const searchQuery = ref("");
  const statusFilter = ref("");
  const selectedOrder = ref(null);
  const selectedOrderForProfiles = ref(null);
  const showProfilesModal = ref(false);
  const actionLoading = ref({});
  const copiedUrl = ref(null);
  const tableWrapper = ref(null);
  const canScrollLeft = ref(false);
  const canScrollRight = ref(true);

  // ✅ NOUVEAU: État pour le modal des photos
  const showPhotosModal = ref(false);
  const selectedOrderForPhotos = ref(null);
  const orderPhotos = ref([]);

  // Prix dynamiques chargés depuis l'API
  const BASE_PRICE = ref(200000); // Prix par défaut (sera remplacé par l'API)
  const EXTRA_PRICE = ref(60000); // Prix par défaut (sera remplacé par l'API)
  const pricingVersion = ref(0); // Clé de version pour forcer le re-render quand les prix changent

  // Computed
  const filteredOrders = computed(() => {
    let filtered = orders.value;

    // Filtrer par recherche
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.id.toString().includes(query) ||
          order.user?.name.toLowerCase().includes(query) ||
          order.user?.email.toLowerCase().includes(query),
      );
    }

    // Filtrer par statut
    if (statusFilter.value) {
      filtered = filtered.filter((order) => order.status === statusFilter.value);
    }

    // Vérifier si la commande spécifique est dans les résultats filtrés
    const targetOrderNumber = "CMD-690CA5910A38F";
    const targetOrderInFiltered = filtered.find(
      (o) => o.order_number === targetOrderNumber || o.id?.toString().includes("690CA5910A38F"),
    );
    if (targetOrderInFiltered) {
      console.log("AdminOrderList: Commande trouvée dans filteredOrders", {
        orderId: targetOrderInFiltered.id,
        orderNumber: targetOrderInFiltered.order_number,
        status: targetOrderInFiltered.status,
        statusFilter: statusFilter.value,
        searchQuery: searchQuery.value,
      });
    } else {
      const targetOrderInAll = orders.value.find(
        (o) => o.order_number === targetOrderNumber || o.id?.toString().includes("690CA5910A38F"),
      );
      if (targetOrderInAll) {
        console.warn("AdminOrderList: Commande trouvée dans orders mais filtrée de filteredOrders", {
          orderId: targetOrderInAll.id,
          orderNumber: targetOrderInAll.order_number,
          status: targetOrderInAll.status,
          statusFilter: statusFilter.value,
          searchQuery: searchQuery.value,
        });
      }
    }

    return filtered;
  });

  // Fonctions
  function normalizeLegacyDesign(order) {
    if (!order || typeof order !== "object") return order;

    // Si déjà normalisé, sortir
    if (
      order.card_design_type ||
      order.card_design_number ||
      order.card_design_custom_url ||
      order.no_design_yet !== undefined
    ) {
      return order;
    }

    // 1) Structures employé
    const ep = order.employee_profile || order.employee || null;
    if (
      ep &&
      (ep.card_design_type || ep.card_design_number || ep.card_design_custom_url || ep.no_design_yet !== undefined)
    ) {
      order.card_design_type = ep.card_design_type;
      order.card_design_number = ep.card_design_number;
      order.card_design_custom_url = ep.card_design_custom_url;
      order.no_design_yet = ep.no_design_yet;
      return order;
    }

    // 1.5) Pour les commandes business, vérifier aussi dans order_employees
    // car le design du business admin peut être stocké dans l'entrée OrderEmployee
    if (
      (order.order_type === "business" || order.order_type === "entreprise") &&
      order.order_employees &&
      Array.isArray(order.order_employees)
    ) {
      // Chercher le business admin dans order_employees (celui avec employee_id = user_id)
      const businessAdminEmployee = order.order_employees.find((emp) => emp.employee_id === order.user_id);
      if (businessAdminEmployee) {
        // IMPORTANT: Copier les données de design même si certaines sont null/undefined
        // car le fait d'avoir un card_design_type est suffisant pour indiquer qu'un design est défini
        if (
          businessAdminEmployee.card_design_type ||
          businessAdminEmployee.card_design_number ||
          businessAdminEmployee.card_design_custom_url ||
          businessAdminEmployee.no_design_yet !== undefined
        ) {
          order.card_design_type = businessAdminEmployee.card_design_type || order.card_design_type;
          order.card_design_number = businessAdminEmployee.card_design_number || order.card_design_number;
          order.card_design_custom_url = businessAdminEmployee.card_design_custom_url || order.card_design_custom_url;
          order.no_design_yet =
            businessAdminEmployee.no_design_yet !== undefined
              ? businessAdminEmployee.no_design_yet
              : order.no_design_yet;

          console.log(
            "AdminOrderList: normalizeLegacyDesign - Design copié depuis order_employees pour business admin",
            {
              orderId: order.id,
              orderNumber: order.order_number,
              businessAdminEmployeeId: businessAdminEmployee.id,
              card_design_type: order.card_design_type,
              card_design_number: order.card_design_number,
              no_design_yet: order.no_design_yet,
            },
          );

          return order;
        }
      }
    }

    // 2) Structure public_profile / order_profile
    const pp = order.public_profile || order.order_profile || order.profile || null;
    if (pp && (pp.card_design_type || pp.card_design_number || pp.card_design_custom_url || pp.no_design_yet)) {
      order.card_design_type = pp.card_design_type;
      order.card_design_number = pp.card_design_number;
      order.card_design_custom_url = pp.card_design_custom_url;
      order.no_design_yet = pp.no_design_yet;
      return order;
    }

    // 3) Héritage via user.profile
    const up = order.user?.profile || null;
    if (up && (up.card_design_type || up.card_design_number || up.card_design_custom_url || up.no_design_yet)) {
      order.card_design_type = up.card_design_type;
      order.card_design_number = up.card_design_number;
      order.card_design_custom_url = up.card_design_custom_url;
      order.no_design_yet = up.no_design_yet;
      return order;
    }

    // 4) Anciennes clés diverses
    if (!order.card_design_type) {
      if (order.card_design_number) order.card_design_type = "template";
      else if (order.card_design_custom_url) order.card_design_type = "custom";
      else if (typeof order.design_name === "string") {
        const m = order.design_name.match(/design\s*(\d+)/i);
        if (m) {
          order.card_design_type = "template";
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

  function getDesignDataFromOrder(order) {
    if (!order) return null;
    return {
      card_design_type: order.card_design_type,
      card_design_number: order.card_design_number,
      card_design_custom_url: order.card_design_custom_url,
      no_design_yet: order.no_design_yet,
    };
  }

  function hasDesignDefinedForAdmin(order) {
    // Normaliser d'abord pour s'assurer que les données sont au bon endroit
    normalizeLegacyDesign(order);

    const d = getDesignDataFromOrder(order);

    // Si on a des données de design au niveau racine, les vérifier d'abord
    if (d) {
      if (d.no_design_yet) return false; // bloque validation
      if (d.card_design_type === "template" && d.card_design_number) return true;
      if (d.card_design_type === "custom" && d.card_design_custom_url) return true;
      // Si on a un card_design_type mais pas de card_design_number ni card_design_custom_url,
      // vérifier si c'est un design custom sans URL (peut être valide)
      if (d.card_design_type === "custom") return true;
    }

    // Pour les commandes business, vérifier aussi dans order_employees
    // car le design du business admin peut être stocké dans l'entrée OrderEmployee
    // IMPORTANT: Ne pas dévalider si order_employees n'est pas chargé (peut être chargé plus tard)
    if (order.order_type === "business" || order.order_type === "entreprise") {
      if (order.order_employees && Array.isArray(order.order_employees) && order.order_employees.length > 0) {
        // Chercher le business admin dans order_employees (celui avec employee_id = user_id)
        const businessAdminEmployee = order.order_employees.find((emp) => emp.employee_id === order.user_id);
        if (businessAdminEmployee) {
          // Vérifier si le business admin a un design défini
          if (businessAdminEmployee.no_design_yet) {
            console.log("AdminOrderList: hasDesignDefinedForAdmin - business admin a no_design_yet", {
              orderId: order.id,
              orderNumber: order.order_number,
              businessAdminEmployeeId: businessAdminEmployee.id,
            });
            return false;
          }
          if (businessAdminEmployee.card_design_type === "template" && businessAdminEmployee.card_design_number) {
            console.log("AdminOrderList: hasDesignDefinedForAdmin - design template trouvé pour business admin", {
              orderId: order.id,
              orderNumber: order.order_number,
              card_design_type: businessAdminEmployee.card_design_type,
              card_design_number: businessAdminEmployee.card_design_number,
            });
            return true;
          }
          if (businessAdminEmployee.card_design_type === "custom") {
            console.log("AdminOrderList: hasDesignDefinedForAdmin - design custom trouvé pour business admin", {
              orderId: order.id,
              orderNumber: order.order_number,
              card_design_type: businessAdminEmployee.card_design_type,
              card_design_custom_url: businessAdminEmployee.card_design_custom_url,
            });
            return true;
          }
          // Si le business admin a un card_design_type mais pas de card_design_number ni card_design_custom_url,
          // vérifier si c'est un design custom sans URL (peut être valide)
          if (businessAdminEmployee.card_design_type) {
            console.log(
              "AdminOrderList: hasDesignDefinedForAdmin - card_design_type trouvé pour business admin (sans détails)",
              {
                orderId: order.id,
                orderNumber: order.order_number,
                card_design_type: businessAdminEmployee.card_design_type,
              },
            );
            return true;
          }
          console.log("AdminOrderList: hasDesignDefinedForAdmin - business admin trouvé mais sans design défini", {
            orderId: order.id,
            orderNumber: order.order_number,
            businessAdminEmployeeId: businessAdminEmployee.id,
            card_design_type: businessAdminEmployee.card_design_type,
            card_design_number: businessAdminEmployee.card_design_number,
            no_design_yet: businessAdminEmployee.no_design_yet,
          });
        } else {
          console.log("AdminOrderList: hasDesignDefinedForAdmin - business admin non trouvé dans order_employees", {
            orderId: order.id,
            orderNumber: order.order_number,
            user_id: order.user_id,
            orderEmployees: order.order_employees.map((emp) => ({
              employee_id: emp.employee_id,
              card_design_type: emp.card_design_type,
              card_design_number: emp.card_design_number,
            })),
          });
        }
      } else {
        // Si order_employees n'est pas chargé, on ne peut pas vérifier le design
        // Ne pas dévalider automatiquement car les données peuvent être chargées plus tard
        // Retourner true pour éviter la dévalidation prématurée
        // (le design sera vérifié lors du chargement complet de la commande)
        console.log("AdminOrderList: hasDesignDefinedForAdmin - order_employees non chargé pour commande business", {
          orderId: order.id,
          orderNumber: order.order_number,
          hasOrderEmployees: !!order.order_employees,
          orderEmployeesCount: order.order_employees?.length || 0,
          status: order.status,
        });
        // Si on a déjà des données de design au niveau racine, on les utilise
        // Sinon, on retourne true pour éviter la dévalidation prématurée
        // (mais seulement si la commande est validée - sinon on retourne false)
        if (order.status === "validated") {
          // Pour les commandes validées, on suppose qu'elles ont un design défini
          // jusqu'à preuve du contraire (lors du chargement complet)
          return true;
        }
        return false;
      }
    }

    // Si pas de données de design et pas de commande business avec order_employees chargé
    return false;
  }

  async function devalidateOrderSilently(order) {
    try {
      await setCsrfToken();
      await adminAxios.patch(
        `/api/admin/orders/${order.id}/status`,
        { status: "pending" },
        { headers: { Authorization: `Bearer ${authStore.token}` } },
      );
      order.status = "pending";
    } catch (err) {
      console.warn("Could not devalidate legacy order", order?.id, err);
    } finally {
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
    }
  }

  async function enforceDesignValidationPolicy() {
    const list = Array.isArray(orders.value) ? orders.value : [];
    for (const o of list) {
      try {
        // Normaliser d'abord
        normalizeLegacyDesign(o);

        // Log détaillé pour les commandes business validées
        if (o?.status === "validated" && (o.order_type === "business" || o.order_type === "entreprise")) {
          console.log("AdminOrderList: Vérification design pour commande business validée", {
            orderId: o.id,
            orderNumber: o.order_number,
            status: o.status,
            user_id: o.user_id,
            order_type: o.order_type,
            hasOrderEmployees: !!o.order_employees,
            orderEmployeesCount: o.order_employees?.length || 0,
            orderEmployees:
              o.order_employees?.map((emp) => ({
                employee_id: emp.employee_id,
                card_design_type: emp.card_design_type,
                card_design_number: emp.card_design_number,
                no_design_yet: emp.no_design_yet,
              })) || [],
            card_design_type: o.card_design_type,
            card_design_number: o.card_design_number,
            no_design_yet: o.no_design_yet,
            hasDesign: hasDesignDefinedForAdmin(o),
            designData: getDesignDataFromOrder(o),
          });
        }

        // Si la commande est marquée validée mais sans design valide => repasser en pending
        if (o?.status === "validated" && !hasDesignDefinedForAdmin(o)) {
          console.warn("AdminOrderList: Dévalidation automatique de la commande (design non défini)", {
            orderId: o.id,
            orderNumber: o.order_number,
            status: o.status,
            order_type: o.order_type,
            user_id: o.user_id,
            hasDesign: hasDesignDefinedForAdmin(o),
            designData: getDesignDataFromOrder(o),
            card_design_type: o.card_design_type,
            card_design_number: o.card_design_number,
            no_design_yet: o.no_design_yet,
            hasOrderEmployees: !!o.order_employees,
            orderEmployees:
              o.order_employees?.map((emp) => ({
                employee_id: emp.employee_id,
                card_design_type: emp.card_design_type,
                card_design_number: emp.card_design_number,
                no_design_yet: emp.no_design_yet,
              })) || [],
          });
          await devalidateOrderSilently(o);
        }
      } catch (e) {
        console.warn("Policy check failed for order", o?.id, e);
      }
    }
  }
  async function fetchOrders() {
    loading.value = true;
    error.value = null;

    try {
      // Charger les prix avant de charger les commandes
      await loadPricing();

      const [ordersRes, statsRes] = await Promise.all([
        adminAxios.get("/api/admin/orders", {
          params: {
            per_page: 1000, // Récupérer toutes les commandes (ou un grand nombre)
          },
          headers: { Authorization: `Bearer ${authStore.token}` },
        }),
        adminAxios.get("/api/admin/orders/stats", {
          headers: { Authorization: `Bearer ${authStore.token}` },
        }),
      ]);

      console.log("Orders Response:", ordersRes.data);
      console.log("Stats Response:", statsRes.data);

      // Le backend retourne { orders: {...pagination}, stats: {...} }
      let rawOrders = [];
      if (ordersRes.data.orders) {
        // Si c'est paginé, extraire les données
        if (ordersRes.data.orders.data) {
          rawOrders = ordersRes.data.orders.data;
          // Si la pagination indique qu'il y a plus de pages, récupérer toutes les pages
          if (ordersRes.data.orders.last_page > 1) {
            console.log(
              `AdminOrderList: Pagination détectée (${ordersRes.data.orders.last_page} pages), récupération de toutes les pages...`,
            );
            const allPages = [rawOrders];
            for (let page = 2; page <= ordersRes.data.orders.last_page; page++) {
              try {
                const pageRes = await adminAxios.get("/api/admin/orders", {
                  params: {
                    per_page: 1000,
                    page: page,
                  },
                  headers: { Authorization: `Bearer ${authStore.token}` },
                });
                if (pageRes.data.orders?.data) {
                  allPages.push(pageRes.data.orders.data);
                } else if (pageRes.data.orders && Array.isArray(pageRes.data.orders)) {
                  allPages.push(pageRes.data.orders);
                } else if (pageRes.data.data && Array.isArray(pageRes.data.data)) {
                  allPages.push(pageRes.data.data);
                } else if (Array.isArray(pageRes.data)) {
                  allPages.push(pageRes.data);
                }
              } catch (pageErr) {
                console.warn(`AdminOrderList: Erreur lors de la récupération de la page ${page}:`, pageErr);
              }
            }
            rawOrders = allPages.flat();
            console.log(`AdminOrderList: ${rawOrders.length} commandes récupérées au total`);
          }
        } else {
          rawOrders = ordersRes.data.orders;
        }
      } else if (ordersRes.data.data) {
        rawOrders = ordersRes.data.data;
      } else if (Array.isArray(ordersRes.data)) {
        rawOrders = ordersRes.data;
      } else {
        rawOrders = [];
      }

      // Vérifier si la commande spécifique est dans la réponse
      const targetOrderNumber = "CMD-690CA5910A38F";
      const targetOrder = rawOrders.find(
        (o) => o.order_number === targetOrderNumber || o.id?.toString().includes("690CA5910A38F"),
      );
      if (targetOrder) {
        console.log("AdminOrderList: Commande trouvée dans la réponse API", {
          orderId: targetOrder.id,
          orderNumber: targetOrder.order_number,
          status: targetOrder.status,
          hasDesign: hasDesignDefinedForAdmin(targetOrder),
          designData: getDesignDataFromOrder(targetOrder),
        });
      } else {
        console.warn("AdminOrderList: Commande CMD-690CA5910A38F non trouvée dans la réponse API", {
          totalOrders: rawOrders.length,
          orderNumbers: rawOrders.map((o) => o.order_number),
          paginationInfo: ordersRes.data.orders
            ? {
                current_page: ordersRes.data.orders.current_page,
                last_page: ordersRes.data.orders.last_page,
                per_page: ordersRes.data.orders.per_page,
                total: ordersRes.data.orders.total,
              }
            : null,
        });

        // Essayer de récupérer directement la commande par son numéro via l'API
        console.log("AdminOrderList: Tentative de récupération directe de la commande...");
        try {
          // Recherche directe par order_number via l'API
          const directSearchRes = await adminAxios.get("/api/admin/orders", {
            params: {
              order_number: "690CA5910A38F", // Recherche par numéro
              per_page: 1000,
            },
            headers: { Authorization: `Bearer ${authStore.token}` },
          });

          if (directSearchRes.data.orders?.data) {
            const found = directSearchRes.data.orders.data.find((o) => o.order_number === targetOrderNumber);
            if (found) {
              console.log("AdminOrderList: Commande trouvée via recherche directe par order_number", {
                orderId: found.id,
                orderNumber: found.order_number,
                status: found.status,
                hasDesign: hasDesignDefinedForAdmin(found),
                designData: getDesignDataFromOrder(found),
              });
              // Vérifier si la commande n'est pas déjà dans rawOrders
              const alreadyExists = rawOrders.find((o) => o.id === found.id || o.order_number === found.order_number);
              if (!alreadyExists) {
                rawOrders.push(found);
                console.log("AdminOrderList: Commande ajoutée à rawOrders");
              } else {
                console.log("AdminOrderList: Commande déjà présente dans rawOrders");
              }
            } else {
              console.warn("AdminOrderList: Commande non trouvée même avec recherche directe par order_number");
            }
          } else if (directSearchRes.data.orders && Array.isArray(directSearchRes.data.orders)) {
            const found = directSearchRes.data.orders.find((o) => o.order_number === targetOrderNumber);
            if (found) {
              console.log("AdminOrderList: Commande trouvée via recherche directe (format non paginé)", {
                orderId: found.id,
                orderNumber: found.order_number,
                status: found.status,
              });
              const alreadyExists = rawOrders.find((o) => o.id === found.id || o.order_number === found.order_number);
              if (!alreadyExists) {
                rawOrders.push(found);
              }
            }
          }
        } catch (directErr) {
          console.warn("AdminOrderList: Erreur lors de la récupération directe:", directErr);
          // Essayer aussi de récupérer directement par ID si on peut l'extraire du numéro
          // Le numéro de commande contient parfois l'ID
          try {
            // Essayer de trouver l'ID dans le numéro de commande
            const orderIdMatch = targetOrderNumber.match(/\d+/);
            if (orderIdMatch) {
              // Essayer de récupérer directement par ID
              const orderByIdRes = await adminAxios.get(`/api/admin/orders/${orderIdMatch[0]}`, {
                headers: { Authorization: `Bearer ${authStore.token}` },
              });
              if (orderByIdRes.data?.order || orderByIdRes.data) {
                const found = orderByIdRes.data.order || orderByIdRes.data;
                if (found.order_number === targetOrderNumber) {
                  console.log("AdminOrderList: Commande trouvée via recherche par ID", {
                    orderId: found.id,
                    orderNumber: found.order_number,
                    status: found.status,
                  });
                  const alreadyExists = rawOrders.find(
                    (o) => o.id === found.id || o.order_number === found.order_number,
                  );
                  if (!alreadyExists) {
                    rawOrders.push(found);
                  }
                }
              }
            }
          } catch (idErr) {
            console.warn("AdminOrderList: Erreur lors de la récupération par ID:", idErr);
          }
        }
      }

      orders.value = rawOrders;

      // Transformer les stats pour le format attendu par le template
      const backendStats = statsRes.data;
      stats.value = {
        total: backendStats.total_orders || 0,
        pending: backendStats.pending_orders || 0,
        validated: backendStats.validated_orders || 0,
        in_production: 0, // Pas dans le backend
        shipped: 0, // Pas dans le backend
        cancelled: backendStats.cancelled_orders || 0,
      };

      // Normaliser les champs legacy (design, etc.)
      // IMPORTANT: S'assurer que order_employees est bien chargé pour les commandes business
      orders.value = (orders.value || []).map((o) => {
        const normalized = normalizeLegacyDesign(o);

        // Log pour vérifier si order_employees est chargé pour les commandes business validées
        if (
          (normalized.order_type === "business" || normalized.order_type === "entreprise") &&
          normalized.status === "validated"
        ) {
          console.log("AdminOrderList: fetchOrders - Commande business validée après normalisation", {
            orderId: normalized.id,
            orderNumber: normalized.order_number,
            status: normalized.status,
            user_id: normalized.user_id,
            hasOrderEmployees: !!normalized.order_employees,
            orderEmployeesCount: normalized.order_employees?.length || 0,
            orderEmployees:
              normalized.order_employees?.map((emp) => ({
                employee_id: emp.employee_id,
                card_design_type: emp.card_design_type,
                card_design_number: emp.card_design_number,
                no_design_yet: emp.no_design_yet,
              })) || [],
            card_design_type: normalized.card_design_type,
            card_design_number: normalized.card_design_number,
            no_design_yet: normalized.no_design_yet,
            hasDesign: hasDesignDefinedForAdmin(normalized),
          });
        }

        // IMPORTANT: Copier aussi le token depuis les structures imbriquées si disponible
        if (normalized.profile) {
          // Copier le token depuis order.profile si disponible
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
          // Copier le token depuis order.order_profile si disponible
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
          // Copier le token depuis order.public_profile si disponible
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
        // Le token peut aussi être directement au niveau racine de l'objet order
        // (déjà copié par Object.assign dans normalizeLegacyDesign, mais on s'assure qu'il est bien présent)

        return normalized;
      });

      // Appliquer la politique: pas de validation si design en attente/non défini
      await enforceDesignValidationPolicy();

      console.log("Processed orders:", orders.value);
      console.log("Processed stats:", stats.value);
    } catch (err) {
      console.error("Error fetching orders:", err);
      error.value = err.response?.data?.message || err.message || "Une erreur est survenue";
    } finally {
      loading.value = false;
      // Mettre à jour les boutons de scroll après le chargement des commandes
      nextTick(() => {
        setTimeout(() => {
          updateScrollButtons();
        }, 100);
      });
    }
  }

  // Fonction pour mettre à jour les statistiques depuis le backend
  async function updateStats() {
    try {
      const statsRes = await adminAxios.get("/api/admin/orders/stats", {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      const backendStats = statsRes.data;
      stats.value = {
        total: backendStats.total_orders || 0,
        pending: backendStats.pending_orders || 0,
        validated: backendStats.validated_orders || 0,
        cancelled: backendStats.cancelled_orders || 0,
      };
    } catch (err) {
      console.error("Erreur lors de la récupération des statistiques:", err);
      // Ne pas bloquer si les stats échouent
    }
  }

  async function updateOrderStatus(order) {
    if (!confirm(`Voulez-vous vraiment changer le statut de cette commande ?`)) {
      await fetchOrders(); // Recharger pour annuler le changement local
      return;
    }

    actionLoading.value[order.id] = true;

    try {
      await setCsrfToken();
      await adminAxios.patch(
        `/api/admin/orders/${order.id}/status`,
        { status: order.status },
        {
          headers: { Authorization: `Bearer ${authStore.token}` },
        },
      );

      // Recharger les stats
      await updateStats();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la modification du statut");
      await fetchOrders(); // Recharger en cas d'erreur
    } finally {
      actionLoading.value[order.id] = false;
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
    }
  }

  async function viewOrder(order) {
    // Créer une copie de la commande pour éviter les modifications directes
    selectedOrder.value = JSON.parse(JSON.stringify(order));

    // Recharger les détails complets depuis l'API pour avoir les données les plus récentes
    try {
      const response = await adminAxios.get(`/api/admin/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      // L'API retourne { order: {...}, stats: {...} }, donc on prend response.data.order
      const orderDetails = response.data.order || response.data;

      console.log("AdminOrderList: Détails de la commande rechargés pour le modal", {
        orderId: order.id,
        card_quantity: orderDetails.card_quantity,
        order_employees: orderDetails.order_employees?.map((emp) => ({
          id: emp.id,
          employee_id: emp.employee_id,
          employee_name: emp.employee_name,
          card_quantity: emp.card_quantity,
        })),
        total_from_employees:
          orderDetails.order_employees?.reduce((sum, emp) => sum + (emp.card_quantity || 0), 0) || 0,
      });

      // Mettre à jour selectedOrder avec les données complètes de l'API
      selectedOrder.value = {
        ...selectedOrder.value,
        ...orderDetails,
        // S'assurer que order_employees est bien mis à jour
        order_employees: orderDetails.order_employees || selectedOrder.value.order_employees,
        // Préserver les autres relations si elles existent
        user: orderDetails.user || selectedOrder.value.user,
      };
    } catch (error) {
      console.error("AdminOrderList: Erreur lors du rechargement des détails de la commande pour le modal", error);
      // En cas d'erreur, utiliser les données de la commande de la liste
      selectedOrder.value = JSON.parse(JSON.stringify(order));
    }
  }

  function closeModal() {
    selectedOrder.value = null;
  }

  async function viewPublicProfiles(order) {
    // Créer une copie profonde de la commande pour éviter les modifications directes
    selectedOrderForProfiles.value = JSON.parse(JSON.stringify(order));
    // ✅ CORRECTION: S'assurer que order_employees est bien présent
    if (!selectedOrderForProfiles.value.order_employees && order.order_employees) {
      selectedOrderForProfiles.value.order_employees = order.order_employees;
    }
    showProfilesModal.value = true;

    // Log pour debug AVANT l'appel API
    console.log("Order data in viewPublicProfiles (BEFORE API):", {
      id: order.id,
      status: order.status,
      order_type: order.order_type,
      user: order.user,
      hasUser: !!order.user,
      userUsername: order.user?.username,
      username: order.username,
      profile_username: order.profile_username,
      employee_username: order.employee_username,
      allKeys: Object.keys(order),
    });

    // Récupérer les informations complètes de la commande (utilisateur, employés, page entreprise)
    await fetchOrderDetails(order.id);

    // Log pour debug APRÈS l'appel API
    console.log("Profile username check (AFTER API):", getOrderProfileUsername(selectedOrderForProfiles.value));
    console.log("Selected order after API:", selectedOrderForProfiles.value);
  }

  async function fetchOrderDetails(orderId) {
    try {
      // Récupérer les informations complètes de la commande depuis l'API admin
      let orderDetailsResponse = null;
      try {
        orderDetailsResponse = await adminAxios.get(`/api/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${authStore.token}` },
        });
        console.log("Order details (admin) response:", orderDetailsResponse.data); // Debug
      } catch (orderDetailsErr) {
        console.warn("Could not fetch order details:", orderDetailsErr);
      }

      // ✅ CORRECTION: Utiliser directement les données de orderDetailsResponse qui contient déjà order_employees
      // L'endpoint /employees n'existe pas, donc on utilise les données de la commande
      let response = { data: {} };

      if (orderDetailsResponse?.data) {
        // Utiliser les données de la commande qui contient déjà order_employees
        // L'API retourne { order: {...}, stats: {...} }, donc on prend response.data.order
        response.data = orderDetailsResponse.data.order || orderDetailsResponse.data;
        console.log("Order details with employees:", {
          orderId: response.data.id,
          order_employees_count: response.data.order_employees?.length || 0,
          order_employees:
            response.data.order_employees?.map((oe) => ({
              id: oe.id,
              employee_id: oe.employee_id,
              employee_name: oe.employee_name,
              employee_username: oe.employee?.username || oe.username,
            })) || [],
        }); // Debug
      } else {
        // Si orderDetailsResponse n'est pas disponible, essayer l'endpoint /employees (peut ne pas exister)
        try {
          const employeesResponse = await adminAxios.get(`/api/admin/orders/${orderId}/employees`, {
            headers: { Authorization: `Bearer ${authStore.token}` },
          });
          response.data = employeesResponse.data;
          console.log("Order employees response:", response.data); // Debug
        } catch (employeesErr) {
          console.warn("Could not fetch employees (endpoint may not exist):", employeesErr);
          // Continuer avec les données de orderDetailsResponse si disponibles
          if (orderDetailsResponse?.data) {
            response.data = orderDetailsResponse.data.order || orderDetailsResponse.data;
          }
        }
      }

      // IMPORTANT: Récupérer le username de l'utilisateur depuis l'API
      // Le username n'est peut-être pas dans les données de la commande
      if (response.data && response.data.user?.id) {
        try {
          // Essayer de récupérer les infos complètes de l'utilisateur
          const userResponse = await adminAxios.get(`/api/admin/users/${response.data.user.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` },
          });
          console.log("User details response:", userResponse.data); // Debug

          if (userResponse.data) {
            if (!response.data.user) response.data.user = {};
            // Mettre à jour toutes les propriétés de l'utilisateur
            Object.assign(response.data.user, userResponse.data);

            // Si le username est disponible, l'utiliser
            if (userResponse.data.username) {
              response.data.user.username = userResponse.data.username;
              // Pour les commandes individuelles validées, utiliser le username de l'utilisateur
              // comme username du profil public
              if (
                (response.data.order_type === "individual" || response.data.order_type === "personal") &&
                response.data.status === "validated"
              ) {
                response.data.profile_username = userResponse.data.username;
                response.data.username = userResponse.data.username;
              }
            }
          }
        } catch (userErr) {
          console.warn("Could not fetch user details:", userErr);
        }
      }

      // Mettre à jour la commande dans la liste
      const order = orders.value.find((o) => o.id === orderId);
      if (order) {
        // ✅ CORRECTION: Utiliser order_employees au lieu de employees
        if (response.data.order_employees) {
          order.order_employees = response.data.order_employees;
        }
        // Garder aussi employees pour compatibilité si l'API le retourne
        order.employees = response.data.employees || [];
        order.company_page = response.data.company_page || null;
        // Mettre à jour aussi les infos de l'utilisateur si disponibles
        if (response.data.user) {
          order.user = { ...order.user, ...response.data.user };
        }
        // Mettre à jour aussi les infos de username si disponibles dans la réponse
        if (response.data.username) {
          if (!order.user) order.user = {};
          order.user.username = response.data.username;
        }
        if (response.data.user_username) {
          if (!order.user) order.user = {};
          order.user.username = response.data.user_username;
        }
        // Vérifier aussi si le username est directement dans la réponse de l'utilisateur
        if (response.data.user?.username) {
          if (!order.user) order.user = {};
          order.user.username = response.data.user.username;
        }

        // IMPORTANT: Copier aussi le token depuis les structures imbriquées si disponible
        if (response.data.profile) {
          // Copier le token depuis order.profile si disponible
          if (response.data.profile.access_token) {
            order.access_token = response.data.profile.access_token;
          }
          if (response.data.profile.profile_token) {
            order.profile_token = response.data.profile.profile_token;
          }
          if (response.data.profile.public_token) {
            order.public_token = response.data.profile.public_token;
          }
          if (response.data.profile.token) {
            order.token = response.data.profile.token;
          }
        }
        if (response.data.order_profile) {
          // Copier le token depuis order.order_profile si disponible
          if (response.data.order_profile.access_token) {
            order.access_token = response.data.order_profile.access_token;
          }
          if (response.data.order_profile.profile_token) {
            order.profile_token = response.data.order_profile.profile_token;
          }
          if (response.data.order_profile.public_token) {
            order.public_token = response.data.order_profile.public_token;
          }
          if (response.data.order_profile.token) {
            order.token = response.data.order_profile.token;
          }
        }
        if (response.data.public_profile) {
          // Copier le token depuis order.public_profile si disponible
          if (response.data.public_profile.access_token) {
            order.access_token = response.data.public_profile.access_token;
          }
          if (response.data.public_profile.profile_token) {
            order.profile_token = response.data.public_profile.profile_token;
          }
          if (response.data.public_profile.public_token) {
            order.public_token = response.data.public_profile.public_token;
          }
          if (response.data.public_profile.token) {
            order.token = response.data.public_profile.token;
          }
        }
        // Copier aussi le token depuis le niveau racine si disponible
        if (response.data.access_token) {
          order.access_token = response.data.access_token;
        }
        if (response.data.profile_token) {
          order.profile_token = response.data.profile_token;
        }
        if (response.data.public_token) {
          order.public_token = response.data.public_token;
        }
        if (response.data.token) {
          order.token = response.data.token;
        }

        // Normaliser legacy design après fusion
        normalizeLegacyDesign(order);
      }

      // Mettre à jour selectedOrderForProfiles
      if (selectedOrderForProfiles.value && selectedOrderForProfiles.value.id === orderId) {
        // ✅ CORRECTION: Utiliser order_employees au lieu de employees
        // Les employés sont dans order_employees, pas dans employees
        if (response.data.order_employees) {
          selectedOrderForProfiles.value.order_employees = response.data.order_employees;
        }
        // Garder aussi employees pour compatibilité si l'API le retourne
        selectedOrderForProfiles.value.employees = response.data.employees || [];
        selectedOrderForProfiles.value.company_page = response.data.company_page || null;
        // Mettre à jour aussi les infos de l'utilisateur si disponibles
        if (response.data.user) {
          selectedOrderForProfiles.value.user = { ...selectedOrderForProfiles.value.user, ...response.data.user };
          // Si le username est maintenant disponible, mettre à jour le profile_username
          if (
            response.data.user.username &&
            (selectedOrderForProfiles.value.order_type === "individual" ||
              selectedOrderForProfiles.value.order_type === "personal") &&
            selectedOrderForProfiles.value.status === "validated"
          ) {
            selectedOrderForProfiles.value.profile_username = response.data.user.username;
            selectedOrderForProfiles.value.username = response.data.user.username;
          }
        }

        // IMPORTANT: Mettre à jour les données du profil public de la commande
        // Les données peuvent être dans différentes structures
        if (response.data.profile) {
          selectedOrderForProfiles.value.profile = response.data.profile;
          if (response.data.profile.username) {
            selectedOrderForProfiles.value.profile_username = response.data.profile.username;
          }
        }
        if (response.data.order_profile) {
          selectedOrderForProfiles.value.order_profile = response.data.order_profile;
          if (response.data.order_profile.username) {
            selectedOrderForProfiles.value.profile_username = response.data.order_profile.username;
          }
        }

        // Copier toutes les propriétés de response.data dans selectedOrderForProfiles
        // pour s'assurer d'avoir toutes les données disponibles (y compris le token)
        Object.keys(response.data).forEach((key) => {
          if (key !== "employees" && key !== "company_page" && key !== "user") {
            selectedOrderForProfiles.value[key] = response.data[key];
          }
        });

        // ✅ CORRECTION: S'assurer que order_employees est bien copié
        if (response.data.order_employees) {
          selectedOrderForProfiles.value.order_employees = response.data.order_employees;
        }

        // IMPORTANT: Copier aussi le token depuis les structures imbriquées si disponible
        if (response.data.profile) {
          // Copier le token depuis order.profile si disponible
          if (response.data.profile.access_token) {
            selectedOrderForProfiles.value.access_token = response.data.profile.access_token;
          }
          if (response.data.profile.profile_token) {
            selectedOrderForProfiles.value.profile_token = response.data.profile.profile_token;
          }
          if (response.data.profile.public_token) {
            selectedOrderForProfiles.value.public_token = response.data.profile.public_token;
          }
          if (response.data.profile.token) {
            selectedOrderForProfiles.value.token = response.data.profile.token;
          }
        }
        if (response.data.order_profile) {
          // Copier le token depuis order.order_profile si disponible
          if (response.data.order_profile.access_token) {
            selectedOrderForProfiles.value.access_token = response.data.order_profile.access_token;
          }
          if (response.data.order_profile.profile_token) {
            selectedOrderForProfiles.value.profile_token = response.data.order_profile.profile_token;
          }
          if (response.data.order_profile.public_token) {
            selectedOrderForProfiles.value.public_token = response.data.order_profile.public_token;
          }
          if (response.data.order_profile.token) {
            selectedOrderForProfiles.value.token = response.data.order_profile.token;
          }
        }
        if (response.data.public_profile) {
          // Copier le token depuis order.public_profile si disponible
          if (response.data.public_profile.access_token) {
            selectedOrderForProfiles.value.access_token = response.data.public_profile.access_token;
          }
          if (response.data.public_profile.profile_token) {
            selectedOrderForProfiles.value.profile_token = response.data.public_profile.profile_token;
          }
          if (response.data.public_profile.public_token) {
            selectedOrderForProfiles.value.public_token = response.data.public_profile.public_token;
          }
          if (response.data.public_profile.token) {
            selectedOrderForProfiles.value.token = response.data.public_profile.token;
          }
        }
        // Copier aussi le token depuis le niveau racine si disponible
        if (response.data.access_token) {
          selectedOrderForProfiles.value.access_token = response.data.access_token;
        }
        if (response.data.profile_token) {
          selectedOrderForProfiles.value.profile_token = response.data.profile_token;
        }
        if (response.data.public_token) {
          selectedOrderForProfiles.value.public_token = response.data.public_token;
        }
        if (response.data.token) {
          selectedOrderForProfiles.value.token = response.data.token;
        }

        // Mettre à jour le username du profil public depuis tous les emplacements possibles
        if (response.data.profile_username) {
          selectedOrderForProfiles.value.profile_username = response.data.profile_username;
        }
        if (response.data.public_username) {
          selectedOrderForProfiles.value.public_username = response.data.public_username;
        }
        if (response.data.username) {
          // Peut être le username du profil public ou de l'utilisateur
          selectedOrderForProfiles.value.username = response.data.username;
          // Si c'est aussi le username du profil public
          if (!selectedOrderForProfiles.value.profile_username) {
            selectedOrderForProfiles.value.profile_username = response.data.username;
          }
        }
        if (response.data.user_username) {
          selectedOrderForProfiles.value.user_username = response.data.user_username;
        }
        // Vérifier aussi si le username est directement dans la réponse de l'utilisateur
        if (response.data.user?.username) {
          if (!selectedOrderForProfiles.value.user) selectedOrderForProfiles.value.user = {};
          selectedOrderForProfiles.value.user.username = response.data.user.username;
        }

        // Vérifier aussi si la commande elle-même a un username de profil public
        if (response.data.order_profile_username) {
          selectedOrderForProfiles.value.profile_username = response.data.order_profile_username;
        }

        // Normaliser legacy design dans la commande sélectionnée
        normalizeLegacyDesign(selectedOrderForProfiles.value);

        console.log("Updated selectedOrderForProfiles:", selectedOrderForProfiles.value); // Debug
        console.log("Profile username found:", getOrderProfileUsername(selectedOrderForProfiles.value)); // Debug
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      // En cas d'erreur, on continue quand même
    }
  }

  function closeProfilesModal() {
    showProfilesModal.value = false;
    selectedOrderForProfiles.value = null;
  }

  function isIndividualOrder(order) {
    return order.order_type === "individual" || order.order_type === "personal";
  }

  function getBackendUrl() {
    return import.meta.env.VITE_APP_URL_BACKEND || "http://localhost:8000";
  }

  function getOrderProfileUsername(order) {
    // Pour les commandes validées et paramétrées, le username du profil public
    // peut être stocké dans différents emplacements
    // Chercher d'abord le username du profil public de la commande

    // 1. Chercher dans les données du profil public de la commande
    if (order?.profile?.username) return order.profile.username;
    if (order?.order_profile?.username) return order.order_profile.username;
    if (order?.public_profile?.username) return order.public_profile.username;

    // 2. Chercher directement dans la commande
    if (order?.profile_username) return order.profile_username;
    if (order?.public_username) return order.public_username;
    if (order?.username) return order.username; // Peut être le username du profil public
    if (order?.employee_username) return order.employee_username; // Pour les commandes d'employés

    // 3. Pour les commandes individuelles validées et paramétrées,
    // le username du profil public peut être généré depuis l'username de l'utilisateur
    // mais seulement si la commande est validée et paramétrée
    if (order?.status === "validated") {
      if (order?.order_type === "individual" || order?.order_type === "personal") {
        // Pour les commandes individuelles validées, utiliser le username de l'utilisateur
        // Vérifier d'abord si profile_username est défini (même s'il est identique au username de l'utilisateur)
        if (order?.profile_username) return order.profile_username;
        if (order?.user?.username) return order.user.username;
        if (order?.user_username) return order.user_username;
      }
    }

    // 4. Fallback final : utiliser le username de l'utilisateur s'il est disponible
    // (pour les commandes individuelles/personnelles)
    if ((order?.order_type === "individual" || order?.order_type === "personal") && order?.user?.username) {
      return order.user.username;
    }

    // Debug: afficher la structure de la commande pour voir où se trouve le username
    console.log("No profile username found in order:", {
      orderId: order?.id,
      orderType: order?.order_type,
      status: order?.status,
      hasUser: !!order?.user,
      userUsername: order?.user?.username,
      userEmail: order?.user?.email,
      userKeys: order?.user ? Object.keys(order.user) : [],
      orderKeys: Object.keys(order || {}),
      profile: order?.profile,
      order_profile: order?.order_profile,
      profile_username: order?.profile_username,
      username: order?.username,
      employee_username: order?.employee_username,
      // Afficher toutes les propriétés qui contiennent 'username' ou 'user'
      allUsernameKeys: Object.keys(order || {}).filter(
        (key) => key.toLowerCase().includes("username") || key.toLowerCase().includes("user"),
      ),
    });

    return null;
  }

  function getUserUsername(order) {
    // Alias pour compatibilité, mais utilise maintenant getOrderProfileUsername
    return getOrderProfileUsername(order);
  }

  // Fonction utilitaire pour obtenir le token d'accès d'une commande
  // Le token est unique pour chaque commande validée et sécurise l'accès au profil
  function getOrderAccessToken(order) {
    if (!order) return null;

    // Chercher le token dans différentes propriétés possibles (niveau racine)
    // Le backend devrait fournir un champ comme access_token, profile_token, ou public_token
    if (order.access_token) {
      console.log(`Token trouvé dans order.access_token pour la commande #${order.id}`);
      return order.access_token;
    }
    if (order.profile_token) {
      console.log(`Token trouvé dans order.profile_token pour la commande #${order.id}`);
      return order.profile_token;
    }
    if (order.public_token) {
      console.log(`Token trouvé dans order.public_token pour la commande #${order.id}`);
      return order.public_token;
    }
    if (order.token) {
      console.log(`Token trouvé dans order.token pour la commande #${order.id}`);
      return order.token;
    }

    // Chercher le token dans les structures imbriquées (profile, order_profile, etc.)
    if (order.profile?.access_token) {
      console.log(`Token trouvé dans order.profile.access_token pour la commande #${order.id}`);
      return order.profile.access_token;
    }
    if (order.profile?.profile_token) {
      console.log(`Token trouvé dans order.profile.profile_token pour la commande #${order.id}`);
      return order.profile.profile_token;
    }
    if (order.profile?.public_token) {
      console.log(`Token trouvé dans order.profile.public_token pour la commande #${order.id}`);
      return order.profile.public_token;
    }
    if (order.profile?.token) {
      console.log(`Token trouvé dans order.profile.token pour la commande #${order.id}`);
      return order.profile.token;
    }

    if (order.order_profile?.access_token) {
      console.log(`Token trouvé dans order.order_profile.access_token pour la commande #${order.id}`);
      return order.order_profile.access_token;
    }
    if (order.order_profile?.profile_token) {
      console.log(`Token trouvé dans order.order_profile.profile_token pour la commande #${order.id}`);
      return order.order_profile.profile_token;
    }
    if (order.order_profile?.public_token) {
      console.log(`Token trouvé dans order.order_profile.public_token pour la commande #${order.id}`);
      return order.order_profile.public_token;
    }
    if (order.order_profile?.token) {
      console.log(`Token trouvé dans order.order_profile.token pour la commande #${order.id}`);
      return order.order_profile.token;
    }

    if (order.public_profile?.access_token) {
      console.log(`Token trouvé dans order.public_profile.access_token pour la commande #${order.id}`);
      return order.public_profile.access_token;
    }
    if (order.public_profile?.profile_token) {
      console.log(`Token trouvé dans order.public_profile.profile_token pour la commande #${order.id}`);
      return order.public_profile.profile_token;
    }
    if (order.public_profile?.public_token) {
      console.log(`Token trouvé dans order.public_profile.public_token pour la commande #${order.id}`);
      return order.public_profile.public_token;
    }
    if (order.public_profile?.token) {
      console.log(`Token trouvé dans order.public_profile.token pour la commande #${order.id}`);
      return order.public_profile.token;
    }

    // Si le token n'existe pas encore (anciennes commandes), retourner null
    // Le backend devra générer le token pour ces commandes
    console.log(`Aucun token trouvé pour la commande #${order.id}. Structure de la commande:`, {
      orderId: order.id,
      orderType: order.order_type,
      status: order.status,
      hasProfile: !!order.profile,
      hasOrderProfile: !!order.order_profile,
      hasPublicProfile: !!order.public_profile,
      orderKeys: Object.keys(order || {}),
      profileKeys: order.profile ? Object.keys(order.profile) : [],
      orderProfileKeys: order.order_profile ? Object.keys(order.order_profile) : [],
      publicProfileKeys: order.public_profile ? Object.keys(order.public_profile) : [],
    });
    return null;
  }

  function getOrderProfileUrl(order, orderId) {
    // Pour les commandes validées et paramétrées, utiliser le username du profil public
    // Format: /profil/{username}?token={accessToken} (sécurisé)
    // Fallback: /profil/{username}?order={orderId} (si token non disponible)
    const username = getOrderProfileUsername(order);
    if (!username) {
      // Si pas de username disponible, retourner une chaîne vide (pas de fallback avec ID)
      return "";
    }

    // Essayer d'obtenir le token d'accès
    const accessToken = getOrderAccessToken(order);

    if (accessToken) {
      // Utiliser le token sécurisé
      return `/profil/${username}?token=${accessToken}`;
    } else if (orderId) {
      // Fallback pour les anciennes commandes sans token (comportement attendu)
      // Les anciennes commandes utilisent ?order= jusqu'à ce que le backend génère un token
      return `/profil/${username}?order=${orderId}`;
    }

    // Si pas de token ni d'orderId, retourner juste le profil sans paramètre
    return `/profil/${username}`;
  }

  function getFullIndividualProfileUrl() {
    if (!selectedOrderForProfiles.value) return "";
    const backendUrl = getBackendUrl();
    const orderId = selectedOrderForProfiles.value.id;

    // Utiliser le username du profil public de la commande
    const path = getOrderProfileUrl(selectedOrderForProfiles.value, orderId);

    if (!path) {
      console.warn("No profile username available for order", selectedOrderForProfiles.value.id);
      return "";
    }

    const fullUrl = `${backendUrl}${path}`;

    const username = getOrderProfileUsername(selectedOrderForProfiles.value);
    console.log("Generated profile URL:", fullUrl, "username:", username, "order:", selectedOrderForProfiles.value); // Debug

    return fullUrl;
  }

  // ✅ NOUVEAU: Fonction pour obtenir le username d'un employé depuis orderEmployee
  function getEmployeeUsername(orderEmployee) {
    if (!orderEmployee) return null;

    // Chercher le username dans différentes structures possibles
    // 1. Depuis la relation employee
    if (orderEmployee.employee?.username) {
      return orderEmployee.employee.username;
    }

    // 2. Depuis orderEmployee directement (si enrichi par le backend)
    if (orderEmployee.username) {
      return orderEmployee.username;
    }

    // 3. Depuis employee_profile si disponible
    if (orderEmployee.employee_profile?.username) {
      return orderEmployee.employee_profile.username;
    }

    // 4. Depuis profile_username si disponible
    if (orderEmployee.profile_username) {
      return orderEmployee.profile_username;
    }

    return null;
  }

  function getEmployeeProfileUrl(employee, companyUsername, order) {
    // ✅ CORRECTION: Accepter aussi orderEmployee (qui peut être un orderEmployee ou un employee)
    // Format: /profil/{username}?token={accessToken} (sécurisé)
    // Fallback: /profil/{username}?order={orderId} (si token non disponible)

    // Si c'est un orderEmployee, extraire le username
    const username = getEmployeeUsername(employee) || employee?.username;

    if (!username) {
      // Fallback
      return `/profil/${employee?.id || employee?.employee_id || ""}`;
    }

    // Essayer d'obtenir le token d'accès depuis la commande
    const accessToken = order ? getOrderAccessToken(order) : null;
    const orderId = order?.id;

    if (accessToken) {
      // Utiliser le token sécurisé
      return `/profil/${username}?token=${accessToken}`;
    } else if (orderId) {
      // Fallback pour les anciennes commandes sans token (comportement attendu)
      // Les anciennes commandes utilisent ?order= jusqu'à ce que le backend génère un token
      return `/profil/${username}?order=${orderId}`;
    }

    // Si pas de token ni d'orderId, retourner juste le profil sans paramètre
    return `/profil/${username}`;
  }

  function getFullEmployeeProfileUrl(employee, companyUsername) {
    if (!selectedOrderForProfiles.value) return "";
    const backendUrl = getBackendUrl();
    const path = getEmployeeProfileUrl(employee, companyUsername, selectedOrderForProfiles.value);
    return `${backendUrl}${path}`;
  }

  function getFullCompanyProfileUrl(companyUsername) {
    const backendUrl = getBackendUrl();
    return `${backendUrl}/entreprise/${companyUsername}`;
  }

  function copyUrl(url) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        copiedUrl.value = url;
        setTimeout(() => {
          copiedUrl.value = null;
        }, 2000);
      })
      .catch((err) => {
        console.error("Erreur lors de la copie:", err);
        // Fallback pour les navigateurs qui ne supportent pas clipboard API
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        copiedUrl.value = url;
        setTimeout(() => {
          copiedUrl.value = null;
        }, 2000);
      });
  }

  function formatOrderType(type) {
    const types = {
      personal: "Individuelle",
      individual: "Individuelle",
      business: "Entreprise",
    };
    return types[type] || type;
  }

  function formatDesign(order) {
    // Aligné avec OrdersView: getDesignData + getDesignLabel
    if (!order) return "N/A";

    // Normaliser d'abord pour s'assurer que les données sont au bon endroit
    normalizeLegacyDesign(order);

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
      // Commande classique (champs à plat)
      // Pour les commandes business, le design peut être dans order_employees
      // mais normalizeLegacyDesign l'a déjà copié au niveau racine
      return {
        card_design_type: order.card_design_type,
        card_design_number: order.card_design_number,
        card_design_custom_url: order.card_design_custom_url,
        no_design_yet: order.no_design_yet,
      };
    })();

    // Aucun design renseigné
    if (!designData) return "N/A";

    // Si l'utilisateur a indiqué ne pas avoir encore de design
    if (designData.no_design_yet) return "Design en attente";

    // Design template (Design1, Design2, ...)
    if (designData.card_design_type === "template" && designData.card_design_number) {
      return `Design${designData.card_design_number}`;
    }

    // Design personnalisé (fichier / URL)
    if (designData.card_design_type === "custom" && (designData.card_design_custom_url || true)) {
      // Même sans URL (selon backend), afficher un libellé
      return "Design Personnel";
    }

    // Fallbacks supplémentaires (anciennes structures éventuelles)
    if (order.design_name) return order.design_name;
    if (order.design_id) return `Design ${order.design_id}`;

    return "N/A";
  }

  // ✅ NOUVEAU: Vérifier si une commande a des photos
  function hasPhotos(order) {
    if (!order) return false;

    // Commande individuelle/particulier : vérifier order_avatar_url
    if (order.order_type === "individual" || order.order_type === "personal") {
      return !!order.order_avatar_url;
    }

    // Commande entreprise : vérifier les photos du business admin et des employés
    if (order.order_type === "business" || order.order_type === "entreprise") {
      // Photo du business admin
      if (order.order_avatar_url) return true;

      // Photos des employés (si chargées)
      if (order.order_employees && order.order_employees.length > 0) {
        if (order.order_employees.some((emp) => emp.employee_avatar_url)) {
          return true;
        }
      }

      // ✅ Pour les commandes entreprise avec des employés configurés,
      // permettre le clic pour vérifier si des photos existent (le modal rechargera les détails)
      // Cela permet de voir les photos même si elles ne sont pas dans la liste initiale
      if (order.order_employees && order.order_employees.length > 0) {
        if (order.order_employees.some((emp) => emp.is_configured)) {
          return true;
        }
      }
    }

    return false;
  }

  // ✅ NOUVEAU: Afficher le modal des photos
  async function showOrderPhotos(order) {
    selectedOrderForPhotos.value = order;
    orderPhotos.value = [];

    try {
      // ✅ NOUVEAU: Toujours recharger les détails complets de la commande pour avoir les photos
      // car la liste des commandes peut ne pas inclure toutes les données
      const response = await adminAxios.get(`/api/admin/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      const orderDetails = response.data.order || response.data;

      // ✅ DEBUG: Logger toutes les clés de l'objet pour trouver le bon nom
      console.log("showOrderPhotos: Clés de orderDetails", Object.keys(orderDetails));
      console.log("showOrderPhotos: Détails complets", orderDetails);

      // ✅ CORRECTION: Laravel peut retourner orderEmployees (camelCase) ou order_employees (snake_case)
      const employees = orderDetails.order_employees || orderDetails.orderEmployees || [];

      console.log("showOrderPhotos: Détails de la commande chargés", {
        orderId: order.id,
        order_type: orderDetails.order_type,
        order_avatar_url: orderDetails.order_avatar_url,
        employees_count: employees.length,
        employees: employees.map((emp) => ({
          employee_name: emp.employee_name,
          employee_avatar_url: emp.employee_avatar_url,
          is_configured: emp.is_configured,
        })),
      });

      // Construire la liste des photos
      if (orderDetails.order_type === "individual" || orderDetails.order_type === "personal") {
        // Photo de l'utilisateur pour commande individuelle
        if (orderDetails.order_avatar_url) {
          orderPhotos.value.push({
            name: orderDetails.user?.name || order.user?.name || "Utilisateur",
            role: "Utilisateur",
            avatar_url: orderDetails.order_avatar_url,
          });
        }
      } else if (orderDetails.order_type === "business" || orderDetails.order_type === "entreprise") {
        // Photo du business admin (s'il s'est inclus)
        if (orderDetails.order_avatar_url) {
          orderPhotos.value.push({
            name: orderDetails.user?.name || order.user?.name || "Business Admin",
            role: "Business Admin",
            avatar_url: orderDetails.order_avatar_url,
          });
        }

        // Photos des employés
        if (employees.length > 0) {
          employees.forEach((emp) => {
            // Accepter les employés avec une photo
            if (emp.employee_avatar_url) {
              orderPhotos.value.push({
                name: emp.employee_name || emp.employee?.name || "Employé",
                role: emp.is_configured ? "Employé (Configuré)" : "Employé",
                avatar_url: emp.employee_avatar_url,
              });
            }
          });
        }
      }

      // Si aucune photo trouvée, afficher un message
      if (orderPhotos.value.length === 0) {
        console.log("showOrderPhotos: Aucune photo trouvée pour cette commande");
      }

      showPhotosModal.value = true;
    } catch (error) {
      console.error("Erreur lors du chargement des photos:", error);
      alert("Erreur lors du chargement des photos de la commande.");
    }
  }

  // ✅ NOUVEAU: Fermer le modal des photos
  function closePhotosModal() {
    showPhotosModal.value = false;
    selectedOrderForPhotos.value = null;
    orderPhotos.value = [];
  }

  // ✅ NOUVEAU: Télécharger une photo
  // ✅ CORRECTION: Télécharger la photo en forçant le téléchargement (pas l'affichage)
  async function downloadPhoto(photo) {
    const avatarUrl = getFullAvatarUrl(photo.avatar_url);
    const fileName = `${photo.name.replace(/\s+/g, "_")}_photo.jpg`;

    try {
      // Récupérer l'image en tant que blob pour forcer le téléchargement
      const response = await fetch(avatarUrl, {
        mode: "cors",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const blob = await response.blob();

      // Créer un URL blob temporaire
      const blobUrl = window.URL.createObjectURL(blob);

      // Créer un lien de téléchargement
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      // Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      console.log("Photo téléchargée avec succès:", fileName);
    } catch (error) {
      console.error("Erreur lors du téléchargement de la photo:", error);

      // Fallback: ouvrir dans un nouvel onglet si le téléchargement échoue
      window.open(avatarUrl, "_blank");
    }
  }

  // ✅ NOUVEAU: Obtenir l'URL complète de l'avatar
  function getFullAvatarUrl(avatarUrl) {
    if (!avatarUrl) return "";
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      return avatarUrl;
    }
    return `${backendUrl}${avatarUrl}`;
  }

  function formatStatus(status) {
    const statuses = {
      pending: "En attente",
      validated: "Validée",
      cancelled: "Annulée",
    };
    return statuses[status] || status;
  }

  function getStatusTextForOrder(order) {
    // Si le design n'est pas défini (ou en attente), forcer l'affichage "En attente design"
    if (!hasDesignDefinedForAdmin(order)) {
      return "En attente design";
    }
    return formatStatus(order?.status || "pending");
  }

  function getStatusClassForOrder(order) {
    if (!hasDesignDefinedForAdmin(order)) {
      return "status-awaiting"; // style spécifique
    }
    return `status-${order?.status || "pending"}`;
  }

  // Charger les prix depuis l'API
  const loadPricing = async () => {
    try {
      // Utiliser l'endpoint public pour les prix (pas besoin d'authentification)
      const timestamp = new Date().getTime();
      const res = await adminAxios.get(`/api/settings/pricing?t=${timestamp}`);
      const pricing = res.data?.pricing || res.data || {};

      if (pricing.card_price !== undefined && pricing.card_price !== null) {
        BASE_PRICE.value = Number(pricing.card_price);
      } else if (pricing.first_card_price !== undefined && pricing.first_card_price !== null) {
        BASE_PRICE.value = Number(pricing.first_card_price);
      } else if (pricing.base_price !== undefined && pricing.base_price !== null) {
        BASE_PRICE.value = Number(pricing.base_price);
      }

      if (pricing.additional_card_price !== undefined && pricing.additional_card_price !== null) {
        EXTRA_PRICE.value = Number(pricing.additional_card_price);
      } else if (pricing.extra_card_price !== undefined && pricing.extra_card_price !== null) {
        EXTRA_PRICE.value = Number(pricing.extra_card_price);
      } else if (pricing.supplementary_card_price !== undefined && pricing.supplementary_card_price !== null) {
        EXTRA_PRICE.value = Number(pricing.supplementary_card_price);
      }

      // Validation : s'assurer que les prix sont valides (supérieurs à 0)
      if (BASE_PRICE.value <= 0) {
        console.warn("Prix de la première carte invalide depuis l'API, utilisation de la valeur par défaut");
        BASE_PRICE.value = 200000;
      }
      if (EXTRA_PRICE.value <= 0) {
        console.warn("Prix de la carte supplémentaire invalide depuis l'API, utilisation de la valeur par défaut");
        EXTRA_PRICE.value = 60000;
      }

      console.log("Prix chargés depuis l'API dans AdminOrderList:", {
        BASE_PRICE: BASE_PRICE.value,
        EXTRA_PRICE: EXTRA_PRICE.value,
      });

      // Incrémenter la version pour forcer le re-render
      pricingVersion.value++;
    } catch (e) {
      console.warn("Impossible de charger la tarification depuis l'API. Utilisation des valeurs par défaut.", e);
    }
  };

  // Fonction utilitaire pour calculer le prix d'une quantité de cartes
  const calculatePriceForQuantity = (quantity) => {
    if (quantity <= 0) return 0;
    return BASE_PRICE.value + (quantity - 1) * EXTRA_PRICE.value;
  };

  // Recalculer le prix total pour les commandes entreprises avec les prix chargés depuis l'API
  // IMPORTANT: Les commandes validées conservent leur prix d'origine (pas de recalcul)
  const getCorrectTotalPrice = (order) => {
    // Si la commande est validée, utiliser le prix enregistré (pas de recalcul)
    const isOrderValidated = order.status === "validated" || order.status === "validé" || order.status === "valide";
    if (isOrderValidated) {
      // Pour les commandes validées, utiliser le prix enregistré dans la commande
      // Cela garantit que le prix ne change pas même si les prix sont modifiés par le super admin
      return order.total_price || 0;
    }

    // Pour les commandes non validées, recalculer avec les prix actuels de l'API
    if (order.order_type === "business" || order.order_type === "entreprise") {
      // Utiliser les prix chargés depuis l'API (dynamiques)
      const basePrice = BASE_PRICE.value;
      const extraPrice = EXTRA_PRICE.value;

      let calculatedPrice = 0;
      let calculationMethod = "";

      // Si on a les employee_slots ou order_employees, utiliser ces données
      if (order.employee_slots && order.employee_slots.length > 0) {
        // Calculer avec les slots d'employés
        calculatedPrice = order.employee_slots.reduce((total, slot) => {
          const quantity = Number(slot.cards_quantity) || 1;
          return total + calculatePriceForQuantity(quantity);
        }, 0);
        calculationMethod = "employee_slots";
      } else if (order.order_employees && order.order_employees.length > 0) {
        // Calculer avec les employés de la commande
        calculatedPrice = order.order_employees.reduce((total, emp) => {
          const quantity = Number(emp.card_quantity) || Number(emp.cards_quantity) || 1;
          return total + calculatePriceForQuantity(quantity);
        }, 0);
        calculationMethod = "order_employees";
      } else if (order.total_employees && order.cards_per_employee) {
        // Mode uniforme : même nombre de cartes pour tous
        const quantity = Number(order.cards_per_employee) || 1;
        const pricePerPerson = calculatePriceForQuantity(quantity);
        calculatedPrice = order.total_employees * pricePerPerson;
        calculationMethod = "uniform_mode";
      } else if (order.card_quantity && order.total_employees) {
        // Fallback : calculer avec le nombre total de cartes et le nombre de personnes
        const cardsPerPerson = Math.floor(order.card_quantity / order.total_employees);
        const pricePerPerson = calculatePriceForQuantity(cardsPerPerson);
        calculatedPrice = order.total_employees * pricePerPerson;
        calculationMethod = "fallback_calculation";
      }

      // Log pour debug
      if (calculatedPrice > 0) {
        console.log(`Prix recalculé pour commande #${order.id} (${calculationMethod}):`, {
          orderId: order.id,
          orderType: order.order_type,
          status: order.status,
          total_employees: order.total_employees,
          cards_per_employee: order.cards_per_employee,
          card_quantity: order.card_quantity,
          prixBackend: order.total_price,
          prixRecalculé: calculatedPrice,
          BASE_PRICE_utilisé: basePrice,
          EXTRA_PRICE_utilisé: extraPrice,
          méthode: calculationMethod,
        });
        return calculatedPrice;
      }
    }

    // Pour les autres types de commandes non validées, recalculer avec les prix actuels
    if (
      !isOrderValidated &&
      (order.order_type === "personal" || order.order_type === "individual" || order.order_type === "particulier")
    ) {
      const quantity = order.card_quantity || order.quantity || 0;
      if (quantity > 0) {
        return calculatePriceForQuantity(quantity);
      }
    }

    // Pour les autres cas, utiliser le prix du backend
    return order.total_price || 0;
  };

  function formatPrice(price) {
    return new Intl.NumberFormat("fr-GN", {
      style: "currency",
      currency: "GNF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  // Fonction pour vérifier si une commande est de type business
  function isBusinessOrder(order) {
    return order?.order_type === "business" || order?.order_type === "entreprise";
  }

  // Fonction pour vérifier si une commande a des employés
  function hasOrderEmployees(order) {
    return order?.order_employees && Array.isArray(order.order_employees) && order.order_employees.length > 0;
  }

  // Fonction pour calculer la somme des quantités des employés
  function getSumOfEmployeeQuantities(order) {
    if (!hasOrderEmployees(order)) {
      return 0;
    }
    return order.order_employees.reduce((sum, emp) => {
      return sum + (Number(emp.card_quantity) || 0);
    }, 0);
  }

  // Fonction pour obtenir la quantité totale de cartes
  // Pour les commandes business, utilise la somme des quantités individuelles si disponible
  // Sinon, utilise card_quantity de la commande
  function getTotalCardQuantity(order) {
    if (isBusinessOrder(order) && hasOrderEmployees(order)) {
      const sumFromEmployees = getSumOfEmployeeQuantities(order);
      // Si la somme des employés est disponible et > 0, l'utiliser
      // Sinon, utiliser card_quantity de la commande
      return sumFromEmployees > 0 ? sumFromEmployees : order.card_quantity || order.quantity || 0;
    }
    // Pour les commandes individuelles, utiliser card_quantity
    return order.card_quantity || order.quantity || 0;
  }

  // Fonctions pour le scroll horizontal
  function scrollTable(direction) {
    if (!tableWrapper.value) return;

    const scrollAmount = 300; // pixels à scroller
    const currentScroll = tableWrapper.value.scrollLeft;

    if (direction === "left") {
      tableWrapper.value.scrollTo({
        left: currentScroll - scrollAmount,
        behavior: "smooth",
      });
    } else if (direction === "right") {
      tableWrapper.value.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: "smooth",
      });
    }
  }

  function updateScrollButtons() {
    if (!tableWrapper.value) return;

    const { scrollLeft, scrollWidth, clientWidth } = tableWrapper.value;

    // Vérifier si le scroll horizontal est nécessaire
    const needsScroll = scrollWidth > clientWidth;

    canScrollLeft.value = needsScroll && scrollLeft > 5; // 5px de tolérance
    canScrollRight.value = needsScroll && scrollLeft < scrollWidth - clientWidth - 5; // 5px de tolérance
  }

  // Gestionnaire d'événement pour la mise à jour des prix
  const handlePricingUpdate = async (event) => {
    console.log("Événement pricing-updated reçu, rechargement des prix...", event.detail);
    // Recharger les prix depuis l'API
    await loadPricing();
    // Utiliser nextTick pour s'assurer que le re-render se fait après la mise à jour des prix
    await nextTick();
    // Les prix seront automatiquement utilisés lors du prochain rendu grâce à getCorrectTotalPrice
    // et la clé de version forcera le re-render des lignes du tableau
  };

  // Gestionnaire d'événement pour les nouvelles commandes
  const handleOrderCreated = async () => {
    console.log("Événement order-created reçu dans AdminOrderList, rechargement des commandes...");
    // Recharger les commandes pour afficher la nouvelle commande
    await fetchOrders();
  };

  // Gestionnaire d'événement pour les mises à jour de commande (ajout de cartes, etc.)
  const handleOrderUpdated = async (event) => {
    console.log("Événement order-updated reçu dans AdminOrderList", event.detail);
    const { orderId, order } = event.detail || {};

    // Mettre à jour la commande dans la liste si elle existe
    const index = orders.value.findIndex((o) => o.id === orderId);
    if (index !== -1 && order) {
      console.log("AdminOrderList: Mise à jour de la commande dans la liste", {
        orderId,
        oldCardQuantity: orders.value[index].card_quantity,
        newCardQuantity: order.card_quantity,
        oldOrderEmployees: orders.value[index].order_employees?.length || 0,
        newOrderEmployees: order.order_employees?.length || 0,
        orderEmployeesDetails: order.order_employees?.map((emp) => ({
          id: emp.id,
          employee_id: emp.employee_id,
          employee_name: emp.employee_name,
          card_quantity: emp.card_quantity,
        })),
      });

      // Recharger les détails complets de la commande depuis l'API pour avoir les données à jour
      try {
        const response = await adminAxios.get(`/api/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${authStore.token}` },
        });
        // L'API retourne { order: {...}, stats: {...} }, donc on prend response.data.order
        const updatedOrderData = response.data.order || response.data;

        console.log("AdminOrderList: Données complètes rechargées depuis l'API", {
          orderId,
          card_quantity: updatedOrderData.card_quantity,
          order_employees: updatedOrderData.order_employees?.map((emp) => ({
            id: emp.id,
            employee_id: emp.employee_id,
            employee_name: emp.employee_name,
            card_quantity: emp.card_quantity,
          })),
          total_from_employees:
            updatedOrderData.order_employees?.reduce((sum, emp) => sum + (emp.card_quantity || 0), 0) || 0,
        });

        // Fusionner les données existantes avec les nouvelles données de l'API
        orders.value[index] = {
          ...orders.value[index],
          ...updatedOrderData,
          // S'assurer que order_employees est bien mis à jour avec toutes les données
          order_employees: updatedOrderData.order_employees || orders.value[index].order_employees,
          // Préserver les autres relations si elles existent
          user: updatedOrderData.user || orders.value[index].user,
        };

        // Si le modal de détails est ouvert pour cette commande, mettre à jour également selectedOrder
        if (selectedOrder.value && selectedOrder.value.id === orderId) {
          console.log("AdminOrderList: Mise à jour du modal de détails avec les nouvelles données", {
            oldCardQuantity: selectedOrder.value.card_quantity,
            newCardQuantity: updatedOrderData.card_quantity,
            oldOrderEmployees: selectedOrder.value.order_employees?.map((emp) => ({
              id: emp.id,
              employee_name: emp.employee_name,
              card_quantity: emp.card_quantity,
            })),
            newOrderEmployees: updatedOrderData.order_employees?.map((emp) => ({
              id: emp.id,
              employee_name: emp.employee_name,
              card_quantity: emp.card_quantity,
            })),
          });

          selectedOrder.value = {
            ...selectedOrder.value,
            ...updatedOrderData,
            order_employees: updatedOrderData.order_employees || selectedOrder.value.order_employees,
            user: updatedOrderData.user || selectedOrder.value.user,
          };
        }
      } catch (error) {
        console.error("AdminOrderList: Erreur lors du rechargement des détails de la commande", error);
        // En cas d'erreur, utiliser les données de l'événement comme fallback
        orders.value[index] = {
          ...orders.value[index],
          ...order,
          order_employees: order.order_employees || orders.value[index].order_employees,
          user: order.user || orders.value[index].user,
        };

        if (selectedOrder.value && selectedOrder.value.id === orderId) {
          selectedOrder.value = {
            ...selectedOrder.value,
            ...order,
            order_employees: order.order_employees || selectedOrder.value.order_employees,
            user: order.user || selectedOrder.value.user,
          };
        }
      }

      // Recharger les statistiques depuis le backend
      await updateStats();
    } else {
      // Si la commande n'est pas trouvée, recharger toutes les commandes
      console.log("AdminOrderList: Commande non trouvée dans la liste, rechargement complet...");
      await fetchOrders();
    }
  };

  onMounted(() => {
    fetchOrders();
    // Initialiser les boutons de scroll après le chargement
    setTimeout(() => {
      updateScrollButtons();
    }, 100);

    // Mettre à jour les boutons lors du redimensionnement de la fenêtre
    window.addEventListener("resize", updateScrollButtons);

    // Écouter l'événement de mise à jour des prix
    window.addEventListener("pricing-updated", handlePricingUpdate);

    // Écouter l'événement de création de commande
    window.addEventListener("order-created", handleOrderCreated);

    // Écouter l'événement de mise à jour de commande (ajout de cartes, etc.)
    window.addEventListener("order-updated", handleOrderUpdated);
  });

  // Nettoyer le listener lors du démontage
  onUnmounted(() => {
    window.removeEventListener("resize", updateScrollButtons);
    window.removeEventListener("pricing-updated", handlePricingUpdate);
    window.removeEventListener("order-created", handleOrderCreated);
    window.removeEventListener("order-updated", handleOrderUpdated);
  });

  // Mettre à jour les boutons après chaque mise à jour du DOM
  onUpdated(() => {
    nextTick(() => {
      updateScrollButtons();
    });
  });
</script>

<style scoped>
  .admin-order-list {
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
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
    overflow: visible;
    min-width: 0;
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
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
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

  /* Conteneur pour le tableau et les flèches */
  .table-scroll-container {
    position: relative;
    width: 100%;
  }

  /* Flèches de scroll fixes */
  .scroll-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 100;
    background-color: rgba(59, 130, 246, 0.9);
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    opacity: 1;
  }

  .scroll-arrow:hover {
    background-color: rgba(37, 99, 235, 1);
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .scroll-arrow:active {
    transform: translateY(-50%) scale(0.95);
  }

  .scroll-arrow-left {
    left: 20px;
  }

  .scroll-arrow-right {
    right: 20px;
  }

  .scroll-arrow.hidden {
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
  }

  /* Masquer les flèches sur mobile et tablettes */
  @media (max-width: 768px) {
    .scroll-arrow {
      display: none !important;
    }
  }

  /* Wrapper du tableau */
  .table-wrapper {
    position: relative;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    max-height: 50vh; /* Limite la hauteur à 65% de l'écran */
    overflow-y: auto; /* Ajoute le défilement vertical pour le tableau */
  }

  table {
    width: 100%;
    min-width: 950px;
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
    position: sticky; /* Rend l'en-tête collant */
    top: 0; /* Le colle en haut de son conteneur (.table-wrapper) */
    z-index: 5; /* S'assure qu'il passe au-dessus du contenu */
    background-color: #f3f4f6; /* Le fond opaque (celui de <thead>) */
  }

  td {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    color: #6b7280;
    white-space: nowrap;
  }

  /* Colonne Design */
  th:nth-child(6),
  td.design-cell {
    min-width: 120px;
    width: 120px;
  }

  th:last-child,
  td:last-child {
    min-width: 260px;
    width: 260px;
  }

  tbody tr:hover {
    background-color: #f9fafb;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .status-validated {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .status-cancelled {
    background-color: #fed7d7;
    color: #c53030;
  }

  /* Statut en attente de design (hérite du style pending mais spécifique) */
  .status-awaiting {
    background-color: #fef3c7;
    color: #92400e;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: nowrap;
    min-width: 240px;
    width: 100%;
  }

  .btn-action {
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
    background-color: #3b82f6;
    color: #fff;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .btn-action:hover {
    background-color: #2563eb;
  }

  .btn-profile {
    background-color: #10b981;
    color: #fff;
  }

  .btn-profile:hover {
    background-color: #059669;
  }

  .status-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    cursor: pointer;
    flex: 1 1 auto;
    min-width: 120px;
    max-width: 130px;
    white-space: nowrap;
    background-color: #fff;
    appearance: auto;
    -webkit-appearance: menulist;
    -moz-appearance: menulist;
  }

  .status-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .no-results {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    background-color: #fff;
    border-radius: 0.5rem;
    margin-top: 1rem;
  }

  .debug-info {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #9ca3af;
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

  /* Modal des profils publics */
  .profiles-modal {
    max-width: 800px;
  }

  .profiles-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .profile-item {
    background-color: #f9fafb;
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .profile-item h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .profile-info {
    margin-bottom: 1rem;
  }

  .profile-info p {
    margin-bottom: 0.5rem;
    color: #374151;
  }

  .profile-info strong {
    color: #1f2937;
    font-weight: 600;
  }

  .btn-profile-link {
    display: inline-block;
    padding: 0.625rem 1.25rem;
    background-color: #3b82f6;
    color: #fff;
    text-decoration: none;
    border-radius: 0.375rem;
    font-weight: 500;
    transition: background-color 0.2s;
    margin-top: 0.5rem;
  }

  .btn-profile-link:hover {
    background-color: #2563eb;
    text-decoration: none;
  }

  .no-profile {
    color: #6b7280;
    font-style: italic;
    margin-top: 0.5rem;
  }

  .employees-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #e5e7eb;
  }

  .employees-section h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .employees-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .employee-item {
    background-color: #fff;
    border: 1px solid #d1d5db;
  }

  .no-employees {
    text-align: center;
    padding: 1rem;
    color: #6b7280;
    background-color: #f3f4f6;
    border-radius: 0.5rem;
    margin-top: 1rem;
  }

  .url-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .url-section p {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
  }

  .url-display {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .url-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: monospace;
    background-color: #f9fafb;
    color: #1f2937;
    cursor: text;
  }

  .url-input:focus {
    outline: none;
    border-color: #3b82f6;
    background-color: #fff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .btn-copy {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: #fff;
    color: #374151;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
    flex-shrink: 0;
    min-width: 40px;
  }

  .btn-copy:hover {
    background-color: #f3f4f6;
    border-color: #3b82f6;
    color: #3b82f6;
  }

  /* ============================================
   RESPONSIVE DESIGN
   ============================================ */

  /* Écrans moyens (max-width: 1024px) */
  @media (max-width: 1024px) {
    .admin-order-list {
      padding: 0;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .table-header {
      flex-wrap: wrap;
    }
  }

  /* Tablettes (max-width: 768px) */
  @media (max-width: 768px) {
    .admin-order-list {
      padding: 0;
    }

    .admin-order-list h1 {
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

    .stat-value {
      font-size: 1.5rem;
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
      min-width: 850px;
    }

    th,
    td {
      padding: 0.75rem 0.5rem;
    }

    th:last-child,
    td:last-child {
      min-width: 240px !important;
      width: 240px !important;
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
      min-width: 220px;
      width: 100%;
      justify-content: flex-start;
      align-items: center;
    }

    .btn-action {
      flex: 0 0 auto;
      min-width: 44px;
      padding: 0.5rem;
      font-size: 1rem;
    }

    .status-select {
      flex: 1 1 auto;
      min-width: 120px;
      max-width: 130px;
      font-size: 0.75rem;
      padding: 0.5rem;
      display: block;
      visibility: visible;
      opacity: 1;
    }
  }

  /* Mobile (max-width: 480px) */
  @media (max-width: 480px) {
    .admin-order-list {
      padding: 0 !important;
      margin: 0;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .admin-order-list h1 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      margin-top: 0;
      padding: 0;
      word-wrap: break-word;
      line-height: 1.3;
      width: 100%;
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
    }

    .stat-value {
      font-size: 1.75rem;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.875rem;
      white-space: nowrap;
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
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
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
      content: "";
      position: absolute;
      top: 0;
      right: 200px;
      bottom: 0;
      width: 30px;
      background: linear-gradient(to left, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
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
      min-width: 750px;
    }

    th,
    td {
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
      font-size: 0.875rem;
      min-width: 40px;
      width: auto;
      white-space: nowrap;
    }

    .status-badge {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      white-space: nowrap;
    }

    .status-select {
      font-size: 0.75rem;
      padding: 0.375rem;
      flex: 1 1 auto;
      min-width: 115px;
      max-width: 130px;
      white-space: nowrap;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
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

    .detail-section {
      margin-bottom: 1.25rem;
    }

    .detail-section h3 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
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

    /* Modal profils publics responsive */
    .profiles-modal {
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
      border-radius: 0 !important;
      margin: 0;
      display: flex;
      flex-direction: column;
    }

    .profiles-list {
      gap: 1rem;
    }

    .profile-item {
      padding: 1rem;
    }

    .profile-item h3 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }

    .profile-info p {
      font-size: 0.875rem;
      margin-bottom: 0.375rem;
    }

    .btn-profile-link {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      width: 100%;
      text-align: center;
      display: block;
    }

    .employees-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
    }

    .employees-section h3 {
      font-size: 1.125rem;
      margin-bottom: 0.75rem;
    }

    .employees-list {
      gap: 0.75rem;
    }

    .employee-item {
      padding: 1rem;
    }

    .url-section {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
    }

    .url-display {
      flex-direction: column;
      gap: 0.5rem;
      align-items: stretch;
    }

    .url-input {
      font-size: 0.75rem;
      padding: 0.5rem;
      width: 100%;
      box-sizing: border-box;
    }

    .btn-copy {
      width: 100%;
      padding: 0.5rem;
      font-size: 0.875rem;
    }
  }

  /* Petits écrans (max-width: 360px) */
  @media (max-width: 360px) {
    .admin-order-list h1 {
      font-size: 1.125rem;
    }

    .stat-value {
      font-size: 1.5rem;
    }

    table {
      min-width: 700px;
      font-size: 0.75rem;
    }

    th,
    td {
      padding: 0.375rem 0.25rem;
      font-size: 0.6875rem;
      min-width: 60px;
    }

    th:last-child,
    td:last-child {
      min-width: 150px;
      padding: 0.375rem 0.25rem;
    }

    .status-badge {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
    }

    .action-buttons {
      min-width: 140px;
      gap: 0.25rem;
    }

    .btn-action {
      padding: 0.25rem 0.375rem;
      font-size: 0.75rem;
      min-width: 36px;
    }

    .status-select {
      font-size: 0.6875rem;
      padding: 0.25rem;
      min-width: 100px;
    }
  }

  /* ✅ NOUVEAU: Styles pour la colonne Photo et le modal */
  .photo-cell {
    text-align: center;
    padding: 0.5rem;
  }

  .photo-button {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .photo-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
  }

  .photo-button:disabled {
    background: #4b5563;
    cursor: not-allowed;
    opacity: 0.5;
  }

  .modal-content-photos {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 900px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .modal-header h3 {
    margin: 0;
    color: #1f2937;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .no-photos {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  .photos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .photo-card {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1rem;
    transition: all 0.3s ease;
  }

  .photo-card:hover {
    border-color: #0ea5e9;
    box-shadow: 0 8px 24px rgba(14, 165, 233, 0.2);
    transform: translateY(-4px);
  }

  .photo-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .photo-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 1rem;
    margin: 0;
  }

  .photo-role {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0.25rem 0 0 0;
  }

  .btn-download-photo {
    background: #0ea5e9;
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-download-photo:hover {
    background: #0284c7;
    transform: scale(1.1);
  }

  .photo-image-container {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.5rem;
    overflow: hidden;
    background: #e5e7eb;
  }

  .photo-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* ✅ NOUVEAU: Styles responsive pour la colonne Photo et le modal */
  @media (max-width: 768px) {
    .photo-cell {
      padding: 0.25rem;
    }

    .photo-button {
      padding: 0.375rem;
      border-radius: 0.375rem;
    }

    .photo-button svg {
      width: 1rem;
      height: 1rem;
    }

    .modal-content-photos {
      padding: 1rem;
      width: 95%;
      max-height: 90vh;
    }

    .modal-header h3 {
      font-size: 1.125rem;
    }

    .photos-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .photo-card {
      padding: 0.75rem;
    }

    .photo-name {
      font-size: 0.875rem;
    }

    .photo-role {
      font-size: 0.75rem;
    }

    .btn-download-photo {
      padding: 0.375rem;
    }

    .btn-download-photo svg {
      width: 1rem;
      height: 1rem;
    }
  }

  @media (max-width: 480px) {
    .photo-cell {
      padding: 0.125rem;
    }

    .photo-button {
      padding: 0.25rem;
      border-radius: 0.25rem;
    }

    .photo-button svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    .modal-content-photos {
      padding: 0.75rem;
      width: 98%;
      border-radius: 0.5rem;
    }

    .modal-header {
      flex-direction: column;
      gap: 0.5rem;
    }

    .modal-header h3 {
      font-size: 1rem;
    }

    .photos-grid {
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .photo-card {
      padding: 0.5rem;
    }

    .photo-header {
      flex-direction: column;
      gap: 0.5rem;
    }

    .photo-name {
      font-size: 0.75rem;
    }

    .photo-role {
      font-size: 0.625rem;
    }

    .no-photos {
      padding: 2rem 0.5rem;
    }

    .no-photos svg {
      width: 3rem;
      height: 3rem;
    }
  }

  @media (max-width: 360px) {
    .photos-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
