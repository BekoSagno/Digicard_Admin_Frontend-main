<template>
  <div class="admin-marketplace-permissions">
    <div class="page-header">
      <h1>Permissions — Marketplace</h1>
      <button class="btn-primary" @click="load">Rafraîchir</button>
    </div>

    <div v-if="loading" class="loading">Chargement des permissions...</div>
    <div v-else-if="error" class="error">Erreur : {{ error }}</div>

    <div v-else>
      <div v-if="notice" class="notice">{{ notice }}</div>

      <div class="info">
        <strong>admin</strong> : permissions modifiables (selon super_admin).<br />
        <strong>super_admin</strong> : tous les droits sont <strong>forcés</strong> (lecture seule ici).
      </div>

      <div class="role-tabs">
        <button
          v-for="r in roles"
          :key="r"
          class="role-tab"
          :class="activeRole === r ? 'role-tab-active' : ''"
          @click="activeRole = r"
        >
          {{ r }}
        </button>
      </div>

      <div class="perm-grid">
        <label v-for="p in permissions" :key="p.key" class="perm-item">
          <input
            type="checkbox"
            :checked="isChecked(activeRole, p.key)"
            :disabled="!canEdit || activeRole === 'super_admin'"
            @change="toggle(activeRole, p.key, $event.target.checked)"
          />
          <div class="perm-text">
            <div class="perm-label">{{ p.label || p.key }}</div>
            <div class="perm-key">{{ p.key }}</div>
          </div>
        </label>
      </div>

      <div class="actions">
        <button class="btn-secondary" @click="resetActive" :disabled="saving">Annuler</button>
        <button class="btn-primary" @click="saveActive" :disabled="saving || !canEdit || activeRole === 'super_admin'">
          {{ saving ? "Enregistrement..." : "Enregistrer" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import adminApiClient from "@/apiAdmin";
import { useAdminAuthStore } from "@/stores/adminAuth";

const auth = useAdminAuthStore();
const canEdit = computed(() => auth.adminUser?.role === "super_admin");

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const notice = ref("");

const roles = ref([]);
const permissions = ref([]);
const rolePermissions = ref({});

const activeRole = ref("admin");
const draft = ref({});

const isChecked = (role, key) => {
  const list = draft.value?.[role] || [];
  return list.includes(key);
};

const toggle = (role, key, checked) => {
  const current = new Set(draft.value?.[role] || []);
  if (checked) current.add(key);
  else current.delete(key);
  draft.value = { ...draft.value, [role]: Array.from(current).sort() };
};

const resetActive = () => {
  draft.value = JSON.parse(JSON.stringify(rolePermissions.value || {}));
};

const load = async () => {
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    const res = await adminApiClient.get("/api/admin/permissions/marketplace");
    roles.value = res.data?.roles || [];
    permissions.value = res.data?.permissions || [];
    rolePermissions.value = res.data?.role_permissions || {};
    if (roles.value.includes("admin")) activeRole.value = "admin";
    resetActive();
  } catch (e) {
    error.value = e?.response?.data?.message || "Impossible de charger les permissions.";
  } finally {
    loading.value = false;
  }
};

const saveActive = async () => {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const perms = draft.value?.[activeRole.value] || [];
    const res = await adminApiClient.put(`/api/admin/roles/${activeRole.value}/permissions/marketplace`, { permissions: perms });
    notice.value = `Permissions enregistrées pour ${res.data?.role || activeRole.value}.`;
    await load();
    // rafraîchir le /me pour que l’UI se mette à jour si on a modifié admin
    await auth.fetchAdminUser();
  } catch (e) {
    error.value = e?.response?.data?.message || "Impossible d'enregistrer.";
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.admin-marketplace-permissions { padding: 0; width: 100%; max-width: 100%; box-sizing: border-box; }
.page-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom: 1.25rem; }
h1 { margin-bottom: 0; font-size: 2rem; font-weight: bold; }
.loading, .error { padding: 2rem; text-align: center; }
.error { color: #ef4444; background-color: #fee2e2; border-radius: 0.5rem; }
.notice { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }
.info { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }

.role-tabs { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom: 1rem; }
.role-tab { background:#fff; border:1px solid #d1d5db; color:#374151; padding:0.5rem 0.75rem; border-radius:0.5rem; font-weight:700; cursor:pointer; }
.role-tab-active { border-color:#3b82f6; background:#dbeafe; color:#1e40af; }

.perm-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:0.75rem; }
.perm-item { display:flex; gap:0.75rem; align-items:flex-start; padding:0.75rem; border:1px solid #e5e7eb; border-radius:0.5rem; background:#fff; }
.perm-item input { width: 18px; height: 18px; }
.perm-text { display:flex; flex-direction:column; gap:2px; }
.perm-label { font-weight: 700; color:#111827; }
.perm-key { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color:#6b7280; }

.actions { display:flex; justify-content:flex-end; gap:0.75rem; margin-top: 1.25rem; }
.btn-primary { background:#3b82f6; color:#fff; border:none; border-radius:0.5rem; padding:0.75rem 1rem; font-weight:700; cursor:pointer; }
.btn-primary:hover { background:#2563eb; }
.btn-secondary { background:#fff; color:#111827; border:1px solid #d1d5db; border-radius:0.5rem; padding:0.75rem 1rem; font-weight:700; cursor:pointer; }
.btn-secondary:hover { background:#f3f4f6; }

@media (max-width: 768px){ .perm-grid { grid-template-columns: 1fr; } }
</style>

