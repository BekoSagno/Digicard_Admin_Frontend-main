<template>
  <div class="admin-settings">
    <h1>Paramètres & Configuration</h1>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">
      Chargement des paramètres...
    </div>

    <!-- Affichage des erreurs -->
    <div v-else-if="error" class="error">
      Erreur : {{ error }}
    </div>

    <!-- Contenu des paramètres -->
    <div v-else>
      <!-- Statut du système -->
      <div class="settings-section">
        <h2>Statut du Système</h2>
        <div v-if="systemStatus" class="status-grid">
          <!-- Informations de base -->
          <div class="status-item">
            <span class="status-label">Laravel:</span>
            <span class="status-value">{{ systemStatus.laravel_version || 'N/A' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">PHP:</span>
            <span class="status-value">{{ systemStatus.php_version || 'N/A' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Environnement:</span>
            <span class="status-value">{{ systemStatus.app_env || 'N/A' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Mode debug:</span>
            <span :class="['status-badge', systemStatus.app_debug ? 'badge-warning' : 'badge-success']">
              {{ systemStatus.app_debug ? 'Activé' : 'Désactivé' }}
            </span>
          </div>

          <!-- Configuration Email -->
          <div class="status-item">
            <span class="status-label">Email configuré:</span>
            <span :class="['status-badge', systemStatus.mail_configured ? 'badge-success' : 'badge-error']">
              {{ systemStatus.mail_configured ? '✓ Oui' : '✗ Non' }}
            </span>
          </div>

          <!-- Configuration Gemini AI -->
          <div class="status-item">
            <span class="status-label">Gemini AI configuré:</span>
            <span :class="['status-badge', systemStatus.gemini_configured ? 'badge-success' : 'badge-error']">
              {{ systemStatus.gemini_configured ? '✓ Oui' : '✗ Non' }}
            </span>
          </div>

          <!-- Base de données -->
          <div class="status-item">
            <span class="status-label">Base de données:</span>
            <span :class="['status-badge', systemStatus.database_configured ? 'badge-success' : 'badge-error']">
              {{ systemStatus.database_configured ? '✓ Configurée' : '✗ Non configurée' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">Taille de la BDD:</span>
            <span class="status-value">{{ systemStatus.database_size || 'N/A' }}</span>
          </div>

          <!-- Statistiques -->
          <div class="status-item">
            <span class="status-label">Total utilisateurs:</span>
            <span class="status-value">{{ systemStatus.total_users || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Total commandes:</span>
            <span class="status-value">{{ systemStatus.total_orders || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Pages entreprise:</span>
            <span class="status-value">{{ systemStatus.total_company_pages || 0 }}</span>
          </div>

          <!-- Stockage -->
          <div class="status-item">
            <span class="status-label">Stockage accessible:</span>
            <span :class="['status-badge', systemStatus.storage_writable ? 'badge-success' : 'badge-error']">
              {{ systemStatus.storage_writable ? '✓ Oui' : '✗ Non' }}
            </span>
          </div>
        </div>
        <div v-else class="no-status">
          <p>Aucune donnée de statut disponible</p>
        </div>
      </div>

      <!-- Actions système -->
      <div class="settings-section">
        <h2>Actions Système</h2>
        <div class="action-cards">
          <div class="action-card">
            <h3>Mode Maintenance</h3>
            <p>Activer/désactiver le mode maintenance du site</p>
            <button
              @click="toggleMaintenance"
              :disabled="actionLoading"
              :class="['btn-action', systemStatus?.maintenance_mode ? 'btn-danger' : 'btn-success']"
            >
              {{ actionLoading ? 'Chargement...' : (systemStatus?.maintenance_mode ? 'Désactiver' : 'Activer') }}
            </button>
          </div>

          <div class="action-card">
            <h3>Vider le Cache</h3>
            <p>Effacer tous les fichiers de cache de l'application</p>
            <button
              @click="clearCache"
              :disabled="actionLoading"
              class="btn-action btn-warning"
            >
              {{ actionLoading ? 'Chargement...' : 'Vider le Cache' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Configuration des Prix -->
      <div class="settings-section pricing-section">
        <h2>💰 Configuration des Prix</h2>
        <p class="section-description">
          Définissez les prix des cartes et des abonnements. Les montants sont en Francs Guinéens (GNF).
        </p>
        <form @submit.prevent="saveSettings">
          <div class="form-grid">
            <div class="form-group">
              <label for="card_price">
                <span class="label-icon">🎴</span>
                Prix d'une carte NFC
              </label>
              <div class="input-with-currency">
                <input
                  id="card_price"
                  v-model.number="settings.card_price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="20000"
                  required
                />
                <span class="currency-label">GNF</span>
              </div>
              <small class="form-help">Prix actuel : {{ formatPrice(settings.card_price) }}</small>
            </div>

            <div class="form-group">
              <label for="additional_card_price">
                <span class="label-icon">➕</span>
                Prix carte additionnelle
              </label>
              <div class="input-with-currency">
                <input
                  id="additional_card_price"
                  v-model.number="settings.additional_card_price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="45000"
                  required
                />
                <span class="currency-label">GNF</span>
              </div>
              <small class="form-help">Prix actuel : {{ formatPrice(settings.additional_card_price) }}</small>
            </div>

            <div class="form-group">
              <label for="subscription_price">
                <span class="label-icon">📱</span>
                Prix de l'abonnement
              </label>
              <div class="input-with-currency">
                <input
                  id="subscription_price"
                  v-model.number="settings.subscription_price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="40000"
                  required
                />
                <span class="currency-label">GNF</span>
              </div>
              <small class="form-help">Prix actuel : {{ formatPrice(settings.subscription_price) }}</small>
            </div>
          </div>

          <div class="pricing-info">
            <div class="info-card">
              <strong>ℹ️ Information</strong>
              <p>Les nouveaux prix s'appliqueront immédiatement à toutes les nouvelles commandes.</p>
            </div>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              :disabled="saveLoading"
              class="btn-save btn-save-primary"
            >
              {{ saveLoading ? '💾 Enregistrement...' : '💾 Enregistrer les nouveaux prix' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Configuration générale -->
      <div class="settings-section">
        <h2>⚙️ Configuration Générale</h2>
        <form @submit.prevent="saveSettings">
          <div class="form-grid">
            <div class="form-group">
              <label for="site_name">Nom du site</label>
              <input
                id="site_name"
                v-model="settings.site_name"
                type="text"
                placeholder="Nom du site"
              />
            </div>

            <div class="form-group">
              <label for="contact_email">Email de contact</label>
              <input
                id="contact_email"
                v-model="settings.contact_email"
                type="email"
                placeholder="contact@example.com"
              />
            </div>

            <div class="form-group">
              <label for="orders_per_page">Commandes par page</label>
              <input
                id="orders_per_page"
                v-model.number="settings.orders_per_page"
                type="number"
                min="5"
                max="100"
              />
            </div>

            <div class="form-group">
              <label for="max_file_size">Taille max fichier (Mo)</label>
              <input
                id="max_file_size"
                v-model.number="settings.max_file_size"
                type="number"
                min="1"
                max="50"
              />
            </div>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              :disabled="saveLoading"
              class="btn-save"
            >
              {{ saveLoading ? 'Enregistrement...' : 'Enregistrer les modifications' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Message de succès -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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
const settings = ref({
  card_price: 20000,
  additional_card_price: 45000,
  subscription_price: 40000,
  site_name: '',
  contact_email: '',
  orders_per_page: 20,
  max_file_size: 10
});
const systemStatus = ref(null);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(false);
const saveLoading = ref(false);
const successMessage = ref('');

// Fonctions
async function fetchSettings() {
  loading.value = true;
  error.value = null;

  try {
    const [settingsRes, statusRes] = await Promise.all([
      adminAxios.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      adminAxios.get('/api/admin/settings/status', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
    ]);

    settings.value = settingsRes.data.settings || settingsRes.data;
    systemStatus.value = statusRes.data.status || statusRes.data;
    console.log('Settings loaded:', settings.value);
    console.log('System status loaded:', systemStatus.value);
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Une erreur est survenue';
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saveLoading.value = true;
  successMessage.value = '';

  try {
    await setCsrfToken();
    
    // Préparer les données à envoyer - s'assurer que les prix sont bien des nombres
    const settingsToSave = {
      ...settings.value,
      // S'assurer que additional_card_price est bien un nombre
      additional_card_price: Number(settings.value.additional_card_price) || 0,
      card_price: Number(settings.value.card_price) || 0,
      subscription_price: Number(settings.value.subscription_price) || 0,
    };
    
    console.log('AdminSettings: Envoi des paramètres au backend', {
      additional_card_price: settingsToSave.additional_card_price,
      card_price: settingsToSave.card_price,
      subscription_price: settingsToSave.subscription_price,
      allSettings: settingsToSave,
    });
    
    const response = await adminAxios.post(
      '/api/admin/settings',
      settingsToSave,
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    );

    console.log('AdminSettings: Réponse du backend', response.data);
    
    successMessage.value = 'Paramètres enregistrés avec succès !';
    
    // Recharger les settings depuis le serveur pour s'assurer qu'ils sont bien sauvegardés
    await fetchSettings();
    
    // Déclencher un événement pour notifier les autres composants que les prix ont été mis à jour
    window.dispatchEvent(new CustomEvent('pricing-updated', {
      detail: {
        card_price: settings.value.card_price,
        additional_card_price: settings.value.additional_card_price,
        subscription_price: settings.value.subscription_price
      }
    }));
    
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (err) {
    console.error('AdminSettings: Erreur lors de la sauvegarde', err);
    alert(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
  } finally {
    saveLoading.value = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

async function toggleMaintenance() {
  if (!confirm(`Voulez-vous vraiment ${systemStatus.value?.maintenance_mode ? 'désactiver' : 'activer'} le mode maintenance ?`)) {
    return;
  }

  actionLoading.value = true;

  try {
    await setCsrfToken();
    const response = await adminAxios.post(
      '/api/admin/settings/maintenance',
      {},
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    );

    // Mettre à jour le statut local avec la réponse du serveur
    if (systemStatus.value) {
      systemStatus.value.maintenance_mode = response.data.maintenance_mode;
    }
    alert(response.data.message || `Mode maintenance ${systemStatus.value.maintenance_mode ? 'activé' : 'désactivé'} !`);
  } catch (err) {
    alert(err.response?.data?.message || 'Erreur lors de la modification');
  } finally {
    actionLoading.value = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

async function clearCache() {
  if (!confirm('Voulez-vous vraiment vider le cache ? Cette action peut temporairement ralentir le site.')) {
    return;
  }

  actionLoading.value = true;

  try {
    await setCsrfToken();
    await adminAxios.post(
      '/api/admin/settings/cache/clear',
      {},
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    );

    alert('Cache vidé avec succès !');
  } catch (err) {
    alert(err.response?.data?.message || 'Erreur lors du vidage du cache');
  } finally {
    actionLoading.value = false;
    delete adminAxios.defaults.headers.common['X-XSRF-TOKEN'];
  }
}

// Formatage des prix
function formatPrice(price) {
  if (!price && price !== 0) return '0 GNF';
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

onMounted(() => {
  fetchSettings();
});
</script>

<style scoped>
.admin-settings {
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: bold;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
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

.settings-section {
  background-color: #fff;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-item {
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
}

.status-value {
  font-size: 1.125rem;
  color: #1f2937;
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge-success {
  background-color: #d1fae5;
  color: #065f46;
}

.badge-error {
  background-color: #fee2e2;
  color: #991b1b;
}

.badge-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.no-status {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  border: 2px dashed #e5e7eb;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.action-card {
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background-color: #f9fafb;
}

.action-card p {
  color: #6b7280;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.btn-action {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success {
  background-color: #10b981;
  color: #fff;
}

.btn-success:hover:not(:disabled) {
  background-color: #059669;
}

.btn-danger {
  background-color: #ef4444;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-warning {
  background-color: #f59e0b;
  color: #fff;
}

.btn-warning:hover:not(:disabled) {
  background-color: #d97706;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-save {
  padding: 0.875rem 2rem;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-message {
  padding: 1rem;
  margin-top: 1rem;
  background-color: #d1fae5;
  color: #065f46;
  border-radius: 0.5rem;
  text-align: center;
  font-weight: 500;
}

/* ============================================
   SECTION PRICING
   ============================================ */

.pricing-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #3b82f6;
}

.section-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.label-icon {
  margin-right: 0.5rem;
  font-size: 1.125rem;
}

.input-with-currency {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-currency input {
  flex: 1;
  padding-right: 4rem;
}

.currency-label {
  position: absolute;
  right: 1rem;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.875rem;
  pointer-events: none;
}

.form-help {
  color: #059669;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-top: 0.25rem;
}

.pricing-info {
  margin: 1.5rem 0;
}

.info-card {
  background-color: #dbeafe;
  border-left: 4px solid #3b82f6;
  padding: 1rem;
  border-radius: 0.375rem;
}

.info-card strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #1e40af;
  font-size: 0.875rem;
}

.info-card p {
  color: #1e3a8a;
  font-size: 0.8125rem;
  line-height: 1.5;
  margin: 0;
}

.btn-save-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  font-size: 1rem;
  padding: 1rem 2rem;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.btn-save-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 6px 8px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

/* Tablettes (max-width: 768px) */
@media (max-width: 768px) {
  .admin-settings {
    padding: 1rem;
  }

  .admin-settings h1 {
    font-size: 1.5rem;
  }

  .admin-settings h2 {
    font-size: 1.25rem;
  }

  .settings-section {
    padding: 1rem;
  }

  .status-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .status-item {
    padding: 0.75rem;
  }

  .action-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .action-card {
    padding: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .btn-save {
    width: 100%;
    padding: 0.75rem;
  }
}

/* Mobile (max-width: 480px) */
@media (max-width: 480px) {
  .admin-settings {
    padding: 0.75rem;
  }

  .admin-settings h1 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .admin-settings h2 {
    font-size: 1.125rem;
  }

  .settings-section {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .status-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .status-item {
    padding: 0.625rem;
    gap: 0.375rem;
  }

  .status-label {
    font-size: 0.75rem;
  }

  .status-value {
    font-size: 1rem;
  }

  .status-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
  }

  .action-cards {
    gap: 0.75rem;
  }

  .action-card {
    padding: 0.875rem;
  }

  .action-card h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .action-card p {
    font-size: 0.8125rem;
    margin-bottom: 0.75rem;
  }

  .btn-action {
    padding: 0.625rem;
    font-size: 0.875rem;
  }

  .form-grid {
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .form-group label {
    font-size: 0.8125rem;
  }

  .form-group input {
    padding: 0.625rem;
    font-size: 0.875rem;
  }

  .btn-save {
    padding: 0.625rem;
    font-size: 0.875rem;
  }

  .btn-save-primary {
    width: 100%;
    padding: 0.875rem 1rem;
    font-size: 0.9375rem;
  }

  .success-message {
    padding: 0.75rem;
    font-size: 0.875rem;
  }

  .loading,
  .error {
    font-size: 0.875rem;
    padding: 1rem;
  }

  /* Pricing section mobile */
  .section-description {
    font-size: 0.8125rem;
    margin-bottom: 1rem;
  }

  .label-icon {
    font-size: 1rem;
  }

  .input-with-currency input {
    padding-right: 3.5rem;
  }

  .currency-label {
    font-size: 0.75rem;
    right: 0.75rem;
  }

  .form-help {
    font-size: 0.75rem;
  }

  .pricing-info {
    margin: 1rem 0;
  }

  .info-card {
    padding: 0.75rem;
  }

  .info-card strong {
    font-size: 0.8125rem;
  }

  .info-card p {
    font-size: 0.75rem;
  }
}
</style>

