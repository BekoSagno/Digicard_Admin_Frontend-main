<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold">✏️ Éditer offre #{{ id }}</h1>
      <div class="flex items-center gap-2">
        <button class="btn" @click="goBack">← Retour</button>
        <button v-if="canUpdate" class="btn-primary" :disabled="saving" @click="save">{{ saving ? "Enregistrement…" : "Enregistrer" }}</button>
      </div>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="card" v-if="offer">
      <div class="grid">
        <input v-model="form.seller_id" class="input" placeholder="seller_id" />
        <input v-model="form.title" class="input" placeholder="Titre" />
        <select v-model="form.type" class="input">
          <option value="offer">Annonce</option>
          <option value="product">Produit</option>
          <option value="service">Service</option>
        </select>
        <input v-model="form.price" class="input" type="number" step="1" placeholder="Prix" />
        <select v-model="form.currency" class="input">
          <option value="GNF">GNF</option>
          <option value="XOF">XOF</option>
          <option value="EUR">EUR</option>
        </select>
        <select v-model="form.is_active" class="input">
          <option :value="true">Active</option>
          <option :value="false">Inactive</option>
        </select>
        <input v-model="form.image_url" class="input" placeholder="image_url" />
      </div>
      <textarea v-model="form.description" class="input mt" rows="8" placeholder="Description" />
    </div>

    <div v-else class="muted">Chargement…</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import adminApiClient from "@/apiAdmin";
import { useAdminAuthStore } from "@/stores/adminAuth";

const route = useRoute();
const router = useRouter();
const id = computed(() => route.params.id);
const auth = useAdminAuthStore();
const canRead = auth.hasPermission("marketplace.offers.read");
const canUpdate = auth.hasPermission("marketplace.offers.update");

const offer = ref(null);
const form = ref({
  seller_id: "",
  title: "",
  description: "",
  type: "product",
  price: "",
  currency: "GNF",
  image_url: "",
  is_active: true,
});

const saving = ref(false);
const error = ref("");

const goBack = () => router.push({ name: "AdminMarketplaceOffers" });

const load = async () => {
  error.value = "";
  try {
    if (!canRead) {
      error.value = "Permission insuffisante: marketplace.offers.read";
      return;
    }
    const res = await adminApiClient.get(`/api/admin/marketplace/offers/${id.value}`);
    offer.value = res.data?.offer || null;
    const o = offer.value;
    if (o) {
      form.value = {
        seller_id: String(o.user_id ?? ""),
        title: o.title ?? "",
        description: o.description ?? "",
        type: o.type ?? "product",
        price: String(o.price ?? ""),
        currency: o.currency ?? "GNF",
        image_url: o.image_url ?? "",
        is_active: !!o.is_active,
      };
    }
  } catch (e) {
    error.value = e?.response?.data?.message || "Impossible de charger l'offre.";
  }
};

const save = async () => {
  if (!canUpdate) return;
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
      is_active: !!form.value.is_active,
    };
    await adminApiClient.put(`/api/admin/marketplace/offers/${id.value}`, payload);
    await load();
  } catch (e) {
    error.value = e?.response?.data?.message || "Impossible d'enregistrer.";
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.card { background:#111827; border:1px solid #374151; border-radius:12px; padding:16px; }
.grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; }
.input { width:100%; background:#0b1220; border:1px solid #374151; color:#fff; border-radius:10px; padding:10px 12px; }
.btn { background:#243244; border:1px solid #3b4a63; color:#fff; padding:8px 10px; border-radius:10px; }
.btn-primary { background: linear-gradient(90deg,#3b82f6,#6366f1); border:none; color:#fff; padding:10px 12px; border-radius:10px; font-weight:700; }
.muted { color:#9ca3af; }
.alert { background: rgba(220,38,38,.12); border:1px solid rgba(220,38,38,.35); padding:12px; border-radius:12px; margin-bottom:12px; color:#fecaca; }
.mt { margin-top: 10px; }
@media (max-width: 900px){ .grid{ grid-template-columns: 1fr; } }
</style>

