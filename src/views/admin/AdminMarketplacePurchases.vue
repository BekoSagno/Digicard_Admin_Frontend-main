<template>
  <div class="admin-marketplace-purchases">
    <div class="page-header">
      <h1>Marketplace — Achats</h1>
      <button class="btn-primary" @click="load">Rafraîchir</button>
    </div>

    <div v-if="loading" class="loading">Chargement des achats...</div>
    <div v-else-if="error" class="error">Erreur : {{ error }}</div>

    <div v-else>
      <div class="table-header">
        <input v-model="filters.buyer_id" type="text" class="search-input" placeholder="buyer_id..." @input="debouncedLoad" />
        <div class="filters">
          <input v-model="filters.offer_id" type="text" class="search-input small" placeholder="offer_id..." @input="debouncedLoad" />
          <select v-model="filters.status" class="filter-select" @change="load">
            <option value="">Statut (tous)</option>
            <option value="pending">pending</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
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
              <th>Offre</th>
              <th>Acheteur</th>
              <th>Vendeur</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in purchases" :key="p.id">
              <td>{{ p.id }}</td>
              <td class="cell-title" :title="`${p.offer?.title || ''}`">#{{ p.offer_id }} — {{ p.offer?.title || '—' }}</td>
              <td class="cell-user">
                {{ p.buyer?.name || '—' }}
                <div class="cell-sub">{{ p.buyer?.email || '' }}</div>
              </td>
              <td class="cell-user">
                {{ p.offer?.seller?.name || '—' }}
                <div class="cell-sub">{{ p.offer?.seller?.email || '' }}</div>
              </td>
              <td>{{ p.price }} {{ p.currency }}</td>
              <td><span class="status-badge badge-info">{{ p.status }}</span></td>
              <td class="cell-sub">{{ formatDate(p.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="purchases.length === 0" class="no-results">
        Aucun achat ne correspond à vos filtres.
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import adminApiClient from "@/apiAdmin";
import { useAdminAuthStore } from "@/stores/adminAuth";

const loading = ref(false);
const error = ref("");
const purchases = ref([]);
const filters = ref({ status: "", currency: "", buyer_id: "", offer_id: "" });
const auth = useAdminAuthStore();
const canRead = auth.hasPermission("marketplace.purchases.read");

let t = null;
const debouncedLoad = () => {
  if (t) clearTimeout(t);
  t = setTimeout(() => load(), 250);
};

const formatDate = (v) => {
  try {
    return new Date(v).toLocaleString("fr-FR");
  } catch (e) {
    return "";
  }
};

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    if (!canRead) {
      purchases.value = [];
      error.value = "Permission insuffisante: marketplace.purchases.read";
      return;
    }
    const res = await adminApiClient.get("/api/admin/marketplace/purchases", { params: { ...filters.value, per_page: 50 } });
    purchases.value = res.data?.data || [];
  } catch (e) {
    error.value = e?.response?.data?.message || "Erreur de chargement des achats.";
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.admin-marketplace-purchases { padding: 0; width: 100%; max-width: 100%; box-sizing: border-box; }
.page-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom: 1.25rem; }
h1 { margin-bottom: 0; font-size: 2rem; font-weight: bold; }
.loading, .error { padding: 2rem; text-align: center; }
.error { color: #ef4444; background-color: #fee2e2; border-radius: 0.5rem; }

.table-header { display:flex; gap:1rem; margin-bottom:1.5rem; align-items:center; width:100%; flex-wrap:wrap; }
.search-input { flex:1; min-width: 220px; padding:0.75rem 1rem; border:1px solid #d1d5db; border-radius:0.5rem; font-size:1rem; box-sizing:border-box; }
.search-input.small { flex: 0 0 220px; }
.search-input:focus { outline:none; border-color:#3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.filters { display:flex; gap:0.5rem; flex-wrap:wrap; }
.filter-select { padding:0.75rem 1rem; min-width:160px; border:1px solid #d1d5db; border-radius:0.5rem; font-size:0.875rem; background:#fff; cursor:pointer; box-sizing:border-box; }

.scroll-hint { display:none; text-align:center; padding:0.625rem; margin:0.5rem 0.75rem; background: linear-gradient(90deg,#dbeafe 0%,#bfdbfe 50%,#dbeafe 100%); color:#1e40af; font-size:0.75rem; font-weight:600; border-radius:0.375rem; }
.table-wrapper { position:relative; overflow-x:auto; -webkit-overflow-scrolling:touch; width:100%; }
table { width:100%; min-width: 1000px; border-collapse:collapse; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1); border-radius:0.5rem; overflow:hidden; }
thead { background:#f3f4f6; }
th { padding:1rem; text-align:left; font-weight:600; color:#374151; font-size:0.875rem; }
td { padding:1rem; border-top:1px solid #e5e7eb; color:#111827; vertical-align:top; }
tr:hover { background:#f9fafb; }

.cell-title, .cell-user { max-width: 320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cell-sub { margin-top:0.25rem; font-size:0.75rem; color:#6b7280; }
.status-badge { display:inline-flex; align-items:center; padding:0.25rem 0.75rem; border-radius:999px; font-size:0.75rem; font-weight:600; }
.badge-info { background:#dbeafe; color:#1e40af; }

.btn-primary { background:#3b82f6; color:#fff; border:none; border-radius:0.5rem; padding:0.75rem 1rem; font-weight:700; cursor:pointer; }
.btn-primary:hover { background:#2563eb; }
.no-results { margin-top: 1rem; text-align: center; color:#6b7280; }

@media (max-width: 1024px) { .scroll-hint { display:block; } }
</style>

