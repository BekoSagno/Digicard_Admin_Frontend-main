<template>
  <div class="admin-marketplace-offers">
    <div class="page-header">
      <h1>Marketplace — Offres</h1>
      <div class="header-actions">
        <button v-if="isSuperAdmin" class="btn-secondary" @click="goPermissions">Permissions</button>
        <button v-if="canCreate" class="btn-primary" @click="openCreate">+ Nouvelle offre</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement des offres...</div>
    <div v-else-if="error" class="error">Erreur : {{ error }}</div>

    <div v-else>
      <div class="table-header">
        <input
          v-model="filters.q"
          type="text"
          placeholder="Rechercher titre/description..."
          class="search-input"
          @input="debouncedLoad"
        />
        <div class="filters">
          <select v-model="filters.type" class="filter-select" @change="load">
            <option value="">Type (tous)</option>
            <option value="offer">Annonce</option>
            <option value="product">Produit</option>
            <option value="service">Service</option>
          </select>
          <select v-model="filters.is_active" class="filter-select" @change="load">
            <option value="">Statut (tous)</option>
            <option value="true">Actives</option>
            <option value="false">Inactives</option>
          </select>
          <select v-model="filters.currency" class="filter-select" @change="load">
            <option value="">Devise (toutes)</option>
            <option value="GNF">GNF</option>
            <option value="XOF">XOF</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div class="scroll-hint">← Faites défiler pour voir toutes les colonnes →</div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Titre</th>
              <th>Vendeur</th>
              <th>Prix</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in offers" :key="o.id">
              <td>{{ o.id }}</td>
              <td class="cell-title" :title="o.title">{{ o.title }}</td>
              <td class="cell-seller" :title="`${o.seller?.name || ''} ${o.seller?.email || ''}`">
                {{ o.seller?.name || '—' }}
                <div class="cell-sub">{{ o.seller?.email || '' }}</div>
              </td>
              <td>{{ o.price }} {{ o.currency }}</td>
              <td>
                <span :class="['status-badge', o.is_active ? 'badge-success' : 'badge-warning']">
                  {{ o.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button v-if="canUpdate" @click="goEdit(o.id)" class="btn-action btn-view" title="Éditer">✏️</button>
                  <button v-if="canToggle" @click="toggle(o)" class="btn-action btn-activate" title="Activer/Désactiver">🔁</button>
                  <button v-if="canDelete" @click="remove(o)" class="btn-action btn-suspend" title="Supprimer">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="offers.length === 0" class="no-results">
        Aucune offre ne correspond à vos filtres.
      </div>
    </div>

    <!-- modal création -->
    <div v-if="showCreate && canCreate" class="modal-overlay" @click="closeCreate">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Créer une offre</h2>
          <button class="close-btn" @click="closeCreate">✕</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>seller_id</label>
            <input v-model="form.seller_id" class="form-input" placeholder="ex: 1" />
          </div>
          <div class="form-group">
            <label>Titre</label>
            <input v-model="form.title" class="form-input" placeholder="Titre" />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="form.type" class="form-input">
              <option value="product">Produit</option>
              <option value="service">Service</option>
              <option value="offer">Annonce</option>
            </select>
          </div>
          <div class="form-group">
            <label>Prix</label>
            <input v-model="form.price" class="form-input" type="number" step="1" placeholder="Prix" />
          </div>
          <div class="form-group">
            <label>Devise</label>
            <select v-model="form.currency" class="form-input">
              <option value="GNF">GNF</option>
              <option value="XOF">XOF</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div class="form-group">
            <label>image_url (optionnel)</label>
            <input v-model="form.image_url" class="form-input" placeholder="https://..." />
          </div>
          <div class="form-group form-group-full">
            <label>Description</label>
            <textarea v-model="form.description" class="form-input" rows="4" placeholder="Description" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="closeCreate">Annuler</button>
          <button class="btn-primary" :disabled="saving" @click="create">
            {{ saving ? "Création..." : "Créer" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import adminApiClient from "@/apiAdmin";
import { useAdminAuthStore } from "@/stores/adminAuth";

const router = useRouter();
const auth = useAdminAuthStore();

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const offers = ref([]);

const canRead = computed(() => auth.hasPermission("marketplace.offers.read"));
const canCreate = computed(() => auth.hasPermission("marketplace.offers.create"));
const canUpdate = computed(() => auth.hasPermission("marketplace.offers.update"));
const canDelete = computed(() => auth.hasPermission("marketplace.offers.delete"));
const canToggle = computed(() => auth.hasPermission("marketplace.offers.toggle"));
const isSuperAdmin = computed(() => auth.adminUser?.role === "super_admin");

const goPermissions = () => router.push({ name: "AdminMarketplacePermissions" });

const filters = ref({ q: "", type: "", is_active: "", currency: "" });
let qTimer = null;
const debouncedLoad = () => {
  if (qTimer) clearTimeout(qTimer);
  qTimer = setTimeout(() => load(), 250);
};

const showCreate = ref(false);
const form = ref({
  seller_id: "",
  title: "",
  description: "",
  type: "product",
  price: "",
  currency: "GNF",
  image_url: "",
});

const openCreate = () => {
  showCreate.value = true;
  error.value = "";
};
const closeCreate = () => {
  showCreate.value = false;
};

const goEdit = (id) => router.push({ name: "AdminMarketplaceOfferEdit", params: { id } });

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    if (!canRead.value) {
      offers.value = [];
      error.value = "Permission insuffisante: marketplace.offers.read";
      return;
    }
    const res = await adminApiClient.get("/api/admin/marketplace/offers", { params: { ...filters.value, per_page: 50 } });
    offers.value = res.data?.data || [];
  } catch (e) {
    error.value = e?.response?.data?.message || "Erreur de chargement des offres.";
  } finally {
    loading.value = false;
  }
};

const toggle = async (o) => {
  try {
    if (!canToggle.value) return;
    await adminApiClient.patch(`/api/admin/marketplace/offers/${o.id}/toggle`);
    await load();
  } catch (e) {
    error.value = e?.response?.data?.message || "Impossible de modifier le statut.";
  }
};

const remove = async (o) => {
  if (!canDelete.value) return;
  if (!confirm(`Supprimer l'offre #${o.id} ?`)) return;
  try {
    await adminApiClient.delete(`/api/admin/marketplace/offers/${o.id}`);
    await load();
  } catch (e) {
    error.value = e?.response?.data?.message || "Impossible de supprimer l'offre.";
  }
};

const create = async () => {
  if (!canCreate.value) return;
  saving.value = true;
  error.value = "";
  try {
    const payload = {
      seller_id: Number(form.value.seller_id),
      title: form.value.title,
      description: form.value.description,
      type: form.value.type,
      price: Number(form.value.price),
      currency: form.value.currency,
      image_url: form.value.image_url || null,
      is_active: true,
    };
    await adminApiClient.post("/api/admin/marketplace/offers", payload);
    closeCreate();
    form.value = { seller_id: "", title: "", description: "", type: "product", price: "", currency: "GNF", image_url: "" };
    await load();
  } catch (e) {
    error.value = e?.response?.data?.message || "Impossible de créer l'offre.";
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  // Après refresh, attendre le chargement du /me (permissions)
  await auth.fetchAdminUser();
  await load();
});
</script>

<style scoped>
.admin-marketplace-offers { padding: 0; width: 100%; max-width: 100%; box-sizing: border-box; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

h1 { margin-bottom: 0; font-size: 2rem; font-weight: bold; }

.loading, .error { padding: 2rem; text-align: center; }
.error { color: #ef4444; background-color: #fee2e2; border-radius: 0.5rem; }

.table-header { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; width: 100%; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 240px; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; box-sizing: border-box; }
.search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.filter-select { padding: 0.75rem 1rem; min-width: 160px; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; background-color: #fff; cursor: pointer; box-sizing: border-box; }
.filter-select:focus { outline: none; border-color: #3b82f6; }

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
}

.table-wrapper { position: relative; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
table { width: 100%; min-width: 900px; border-collapse: collapse; background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 0.5rem; overflow: hidden; }
thead { background-color: #f3f4f6; }
th { padding: 1rem; text-align: left; font-weight: 600; color: #374151; font-size: 0.875rem; }
td { padding: 1rem; border-top: 1px solid #e5e7eb; color: #111827; vertical-align: top; }
tr:hover { background-color: #f9fafb; }

.cell-title, .cell-seller { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-sub { margin-top: 0.25rem; font-size: 0.75rem; color: #6b7280; }

.status-badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-success { background-color: #dcfce7; color: #166534; }
.badge-warning { background-color: #fef3c7; color: #92400e; }

.action-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn-action { padding: 0.5rem 0.75rem; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
.btn-view { background-color: #3b82f6; color: #fff; }
.btn-view:hover { background-color: #2563eb; }
.btn-activate { background-color: #10b981; color: #fff; }
.btn-activate:hover { background-color: #059669; }
.btn-suspend { background-color: #ef4444; color: #fff; }
.btn-suspend:hover { background-color: #dc2626; }

.btn-primary {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary:hover { background: #2563eb; }
.btn-secondary {
  background: #fff;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-secondary:hover { background: #f3f4f6; }
.btn-secondary {
  background: #f3f4f6;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary:hover { background: #e5e7eb; }

.no-results { margin-top: 1rem; text-align: center; color: #6b7280; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
.modal-content { background: #fff; border-radius: 0.75rem; width: 100%; max-width: 900px; max-height: 90vh; overflow-y: auto; padding: 1.5rem; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.75rem; margin-bottom: 1rem; }
.close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6b7280; }
.close-btn:hover { color: #111827; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group-full { grid-column: 1 / -1; }
.form-group label { font-weight: 600; color: #374151; font-size: 0.875rem; }
.form-input { padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; }
.form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }

@media (max-width: 1024px) { .scroll-hint { display: block; } }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
</style>

