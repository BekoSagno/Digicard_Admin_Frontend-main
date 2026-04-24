<template>
  <div class="admin-dashboard">
    <h1>Tableau de Bord Admin</h1>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">
      Chargement des statistiques...
    </div>

    <!-- Affichage des erreurs -->
    <div v-else-if="error" class="error">
      Erreur : {{ error }}
    </div>

    <!-- Contenu du dashboard -->
    <div v-else>
      <p class="welcome-message">
        Bienvenue dans l'interface d'administration. Voici un aperçu de l'activité du système.
      </p>

      <!-- Statistiques principales -->
      <div class="stats-grid">
        <div class="stat-card stat-users">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.users?.total || 0 }}</div>
            <div class="stat-label">Utilisateurs</div>
            <div class="stat-detail">
              {{ stats.users?.active || 0 }} actifs / {{ stats.users?.suspended || 0 }} suspendus
            </div>
          </div>
        </div>

        <div class="stat-card stat-orders">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.orders?.total || 0 }}</div>
            <div class="stat-label">Commandes</div>
            <div class="stat-detail">
              {{ stats.orders?.pending || 0 }} en attente
            </div>
          </div>
        </div>

        <div class="stat-card stat-pages">
          <div class="stat-icon">🏢</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.company_pages?.total || 0 }}</div>
            <div class="stat-label">Pages Entreprise</div>
            <div class="stat-detail">
              {{ stats.company_pages?.published || 0 }} publiées
            </div>
          </div>
        </div>

        <div class="stat-card stat-revenue">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatPrice(stats.revenue?.total || 0) }}</div>
            <div class="stat-label">Revenu Total</div>
            <div class="stat-detail">
              {{ formatPrice(stats.revenue?.this_month || 0) }} ce mois
            </div>
          </div>
        </div>
      </div>

      <!-- Cartes de navigation -->
      <h2>Actions Rapides</h2>
      <div class="dashboard-cards">
        <div class="card">
          <h3>👥 Utilisateurs</h3>
          <p>Gérer les utilisateurs du système</p>
          <div class="card-stats">
            <span>{{ stats.users?.total || 0 }} total</span>
          </div>
          <router-link to="/admin/users" class="card-link">Voir la liste →</router-link>
        </div>

        <div class="card">
          <h3>📦 Commandes</h3>
          <p>Modérer et gérer les commandes</p>
          <div class="card-stats">
            <span>{{ stats.orders?.total || 0 }} total</span>
          </div>
          <router-link to="/admin/orders" class="card-link">Voir la liste →</router-link>
        </div>

        <div class="card">
          <h3>🏢 Pages Entreprise</h3>
          <p>Modérer les pages entreprise</p>
          <div class="card-stats">
            <span>{{ stats.company_pages?.total || 0 }} total</span>
          </div>
          <router-link to="/admin/company-pages" class="card-link">Voir la liste →</router-link>
        </div>

        <div class="card">
          <h3>⚙️ Paramètres</h3>
          <p>Configuration globale du système</p>
          <router-link to="/admin/settings" class="card-link">Configurer →</router-link>
        </div>
      </div>

      <!-- Activité récente -->
      <div v-if="stats.recent_activity" class="recent-activity">
        <h2>Activité Récente</h2>
        <div class="activity-list">
          <div v-for="activity in stats.recent_activity" :key="activity.id" class="activity-item">
            <div class="activity-icon">{{ getActivityIcon(activity.type) }}</div>
            <div class="activity-content">
              <div class="activity-text">{{ activity.description }}</div>
              <div class="activity-time">{{ formatRelativeTime(activity.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="recent-activity">
        <h2>Notifications</h2>
        
        <!-- Tabs de navigation -->
        <div class="notification-tabs">
          <button 
            v-for="tab in notificationTabs" 
            :key="tab.key"
            @click="activeNotificationTab = tab.key"
            :class="['tab-button', { 'active': activeNotificationTab === tab.key }]"
          >
            {{ tab.label }}
            <span class="tab-badge" v-if="getTabCount(tab.key) > 0">
              {{ getTabCount(tab.key) }}
            </span>
          </button>
        </div>

        <!-- Liste des notifications filtrées -->
        <div v-if="filteredNotifications.length === 0" class="activity-list">
          <div class="activity-item">
            <div class="activity-content">
              <div class="activity-text">Aucune notification pour le moment.</div>
            </div>
          </div>
        </div>
        <div v-else class="activity-list">
          <div v-for="n in filteredNotifications" :key="n.id" class="activity-item">
            <div class="activity-icon">{{ getNotifIcon(n.type) }}</div>
            <div class="activity-content">
              <div class="activity-text">
                {{ n.message }}
                <a v-if="getNotificationProfileUrl(n)" :href="getNotificationProfileUrl(n)" target="_blank" rel="noopener noreferrer">→ Voir le profil</a>
              </div>
              <div class="activity-time">{{ formatRelativeTime(n.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
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

// État
const stats = ref({});
const loading = ref(true);
const error = ref(null);
const notifications = ref([]);
const activeNotificationTab = ref('new_registrations');

// Configuration des onglets
const notificationTabs = [
  { key: 'new_registrations', label: 'Nouvelle Inscriptions' },
  { key: 'order_configured', label: 'Commande Parametrée' },
  { key: 'order_validated', label: 'Commande validée' },
  { key: 'others', label: 'Autres' }
];

// Fonctions
async function fetchStats() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminAxios.get('/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    });
    const notifRes = await adminAxios.get('/api/admin/notifications', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });

    console.log('Dashboard stats response:', response.data);

    const data = response.data;

    // Transformer les données du backend vers le format attendu par le template
    stats.value = {
      users: {
        total: data.total_users || 0,
        active: data.active_users || 0,
        suspended: data.suspended_users || 0
      },
      orders: {
        total: data.total_orders || 0,
        pending: data.pending_orders || 0,
        validated: data.validated_orders || 0,
        cancelled: data.cancelled_orders || 0
      },
      company_pages: {
        total: data.total_company_pages || 0,
        published: data.published_pages || 0,
        unpublished: data.unpublished_pages || 0
      },
      revenue: {
        total: data.total_revenue || 0,
        this_month: 0 // À calculer si nécessaire
      },
      recent_activity: data.recent_orders?.map(order => ({
        id: order.id,
        type: 'order',
        description: `Nouvelle commande de ${order.user?.name || 'Utilisateur'}`,
        created_at: order.created_at
      })) || []
    };

    console.log('Processed stats:', stats.value);
    const fetchedNotifications = notifRes.data || [];
    
    // Enrichir les notifications avec les URLs manquantes
    notifications.value = await Promise.all(
      fetchedNotifications.map(async (notification) => {
        // Si la notification est de type "order_validated", enrichir avec les données de la commande pour le filtrage
        if (notification.type === 'order_validated') {
          // Vérifier si l'URL existe et si elle est correcte (contient /profil/)
          const hasValidUrl = notification.url && notification.url.includes('/profil/');
          
          // Récupérer l'order_id pour enrichir la notification avec les données de la commande
          let orderId = notification.order_id || notification.order?.id || notification.data?.order_id || notification.data?.id;
          
          // Si l'order_id n'est pas trouvé, essayer de l'extraire du message
          if (!orderId && notification.message) {
            const orderIdMatch = notification.message.match(/(?:commande|order|#)\s*(\d+)/i);
            if (orderIdMatch && orderIdMatch[1]) {
              orderId = parseInt(orderIdMatch[1], 10);
            }
          }
          
          if (orderId) {
            // Récupérer les détails de la commande pour enrichir la notification
            // Cela permet le filtrage même si l'URL existe déjà
            try {
              const orderRes = await adminAxios.get(`/api/admin/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${authStore.token}` }
              }).catch((err) => {
                // Si l'erreur est 500, 404, etc., logger l'erreur mais continuer
                if (err.response?.status === 500) {
                  console.error(`Erreur 500 lors de la récupération de la commande ${orderId}:`, err.response?.data || err.message);
                } else if (err.response?.status === 404) {
                  console.warn(`Commande ${orderId} non trouvée (404)`);
                } else {
                  console.warn(`Erreur lors de la récupération de la commande ${orderId}:`, err.response?.status, err.response?.data || err.message);
                }
                // Re-lancer l'erreur pour qu'elle soit capturée par le catch externe
                throw err;
              });
              
              const order = orderRes.data?.order || orderRes.data;
              
              // Normaliser les données de design de la commande
              normalizeLegacyDesignForNotification(order);
              
              // IMPORTANT: Copier la commande dans notification.order pour le filtrage
              // Cela doit être fait même si l'URL existe déjà
              if (!notification.order) {
                notification.order = {};
              }
              Object.assign(notification.order, order);
              
              // Si l'URL n'existe pas ou est incorrecte, la construire
              // Utiliser la commande déjà récupérée (order)
              if (!hasValidUrl) {
                // Chercher le username dans différentes structures (même logique que AdminOrderList.vue)
                let username = null;
                  
                  // 1. Chercher dans les données du profil public de la commande
                  if (order?.profile?.username) {
                    username = order.profile.username;
                  } else if (order?.order_profile?.username) {
                    username = order.order_profile.username;
                  } else if (order?.public_profile?.username) {
                    username = order.public_profile.username;
                  }
                  // 2. Chercher directement dans la commande
                  else if (order?.profile_username) {
                    username = order.profile_username;
                  } else if (order?.public_username) {
                    username = order.public_username;
                  } else if (order?.username) {
                    username = order.username; // Peut être le username du profil public
                  } else if (order?.employee_username) {
                    username = order.employee_username; // Pour les commandes d'employés
                  }
                  // 3. Pour les commandes individuelles validées, utiliser le username de l'utilisateur
                  else if (order?.status === "validated") {
                    if (order?.order_type === "individual" || order?.order_type === "personal") {
                      if (order?.profile_username) {
                        username = order.profile_username;
                      } else if (order?.user?.username) {
                        username = order.user.username;
                      } else if (order?.user_username) {
                        username = order.user_username;
                      }
                    }
                  }
                  // 4. Fallback : utiliser le username de l'utilisateur
                  else if ((order?.order_type === "individual" || order?.order_type === "personal") && order?.user?.username) {
                    username = order.user.username;
                  }
                  
                // Si on a trouvé un username, construire l'URL
                if (username) {
                  // Obtenir le token d'accès de la commande (sécurisé)
                  // Chercher dans toutes les structures possibles (niveau racine et structures imbriquées)
                  let accessToken = null;
                  
                  // Chercher dans le niveau racine de order
                  if (order?.access_token) {
                    accessToken = order.access_token;
                    console.log(`Token trouvé dans order.access_token pour la commande #${orderId}`);
                  } else if (order?.profile_token) {
                    accessToken = order.profile_token;
                    console.log(`Token trouvé dans order.profile_token pour la commande #${orderId}`);
                  } else if (order?.public_token) {
                    accessToken = order.public_token;
                    console.log(`Token trouvé dans order.public_token pour la commande #${orderId}`);
                  } else if (order?.token) {
                    accessToken = order.token;
                    console.log(`Token trouvé dans order.token pour la commande #${orderId}`);
                  }
                  // Chercher dans les structures imbriquées
                  else if (order?.profile?.access_token) {
                    accessToken = order.profile.access_token;
                    console.log(`Token trouvé dans order.profile.access_token pour la commande #${orderId}`);
                  } else if (order?.profile?.profile_token) {
                    accessToken = order.profile.profile_token;
                    console.log(`Token trouvé dans order.profile.profile_token pour la commande #${orderId}`);
                  } else if (order?.profile?.public_token) {
                    accessToken = order.profile.public_token;
                    console.log(`Token trouvé dans order.profile.public_token pour la commande #${orderId}`);
                  } else if (order?.profile?.token) {
                    accessToken = order.profile.token;
                    console.log(`Token trouvé dans order.profile.token pour la commande #${orderId}`);
                  } else if (order?.order_profile?.access_token) {
                    accessToken = order.order_profile.access_token;
                    console.log(`Token trouvé dans order.order_profile.access_token pour la commande #${orderId}`);
                  } else if (order?.order_profile?.profile_token) {
                    accessToken = order.order_profile.profile_token;
                    console.log(`Token trouvé dans order.order_profile.profile_token pour la commande #${orderId}`);
                  } else if (order?.order_profile?.public_token) {
                    accessToken = order.order_profile.public_token;
                    console.log(`Token trouvé dans order.order_profile.public_token pour la commande #${orderId}`);
                  } else if (order?.order_profile?.token) {
                    accessToken = order.order_profile.token;
                    console.log(`Token trouvé dans order.order_profile.token pour la commande #${orderId}`);
                  } else if (order?.public_profile?.access_token) {
                    accessToken = order.public_profile.access_token;
                    console.log(`Token trouvé dans order.public_profile.access_token pour la commande #${orderId}`);
                  } else if (order?.public_profile?.profile_token) {
                    accessToken = order.public_profile.profile_token;
                    console.log(`Token trouvé dans order.public_profile.profile_token pour la commande #${orderId}`);
                  } else if (order?.public_profile?.public_token) {
                    accessToken = order.public_profile.public_token;
                    console.log(`Token trouvé dans order.public_profile.public_token pour la commande #${orderId}`);
                  } else if (order?.public_profile?.token) {
                    accessToken = order.public_profile.token;
                    console.log(`Token trouvé dans order.public_profile.token pour la commande #${orderId}`);
                  }
                  
                  // Log si aucun token n'est trouvé
                  if (!accessToken) {
                    console.log(`Aucun token trouvé pour la commande #${orderId}. Structure de la commande:`, {
                      orderId: orderId,
                      orderType: order?.order_type,
                      status: order?.status,
                      hasProfile: !!order?.profile,
                      profileKeys: order?.profile ? Object.keys(order.profile) : [],
                      hasOrderProfile: !!order?.order_profile,
                      orderProfileKeys: order?.order_profile ? Object.keys(order.order_profile) : [],
                      hasPublicProfile: !!order?.public_profile,
                      publicProfileKeys: order?.public_profile ? Object.keys(order.public_profile) : [],
                      orderKeys: Object.keys(order || {}),
                    });
                  }
                  
                  // IMPORTANT: Copier la commande complète dans notification.order pour que getNotificationProfileUrl puisse trouver le token
                  if (!notification.order) {
                    notification.order = {};
                  }
                  // Copier toutes les propriétés de la commande dans notification.order
                  Object.assign(notification.order, order);
                  
                  // S'assurer que le token est bien copié au niveau racine de notification.order
                  if (accessToken) {
                    notification.order.access_token = accessToken;
                    notification.order.profile_token = accessToken;
                    notification.order.public_token = accessToken;
                    notification.order.token = accessToken;
                  }
                  
                  if (accessToken) {
                    // Utiliser le token sécurisé
                    notification.url = `${username}?token=${accessToken}`;
                    console.log(`URL générée pour notification order_validated #${notification.id}:`, notification.url, 'username:', username, 'token:', accessToken);
                  } else {
                    // Fallback pour les anciennes commandes sans token (comportement attendu)
                    // Les anciennes commandes utilisent ?order= jusqu'à ce que le backend génère un token
                    notification.url = `${username}?order=${orderId}`;
                    console.log(`URL générée pour notification order_validated #${notification.id} (fallback orderId):`, notification.url, 'username:', username, 'orderId:', orderId);
                  }
                  
                  // Vérifier que l'URL sera correctement transformée
                  const testUrl = getCorrectProfileUrl(notification.url);
                  console.log(`URL test après getCorrectProfileUrl:`, testUrl);
                } else {
                  console.warn(`Impossible de trouver le username pour la commande ${orderId} dans la notification`, order);
                }
              }
            } catch (orderErr) {
              console.warn(`Impossible de récupérer les détails de la commande ${orderId}:`, orderErr);
              // En cas d'erreur (500, 404, etc.), continuer sans bloquer les autres notifications
              // La notification sera affichée sans les détails enrichis, mais l'URL existante sera préservée
              if (notification.url && !notification.url.includes('/profil/')) {
                const correctedUrl = getCorrectProfileUrl(notification.url);
                if (correctedUrl && correctedUrl.includes('/profil/')) {
                  notification.url = correctedUrl;
                  console.log(`URL corrigée pour notification order_validated #${notification.id} (après erreur):`, notification.url);
                }
              }
            }
          } else {
            // Si l'order_id n'est pas trouvé, essayer de corriger l'URL existante si elle est incorrecte
            if (notification.url && !notification.url.includes('/profil/')) {
              const correctedUrl = getCorrectProfileUrl(notification.url);
              if (correctedUrl && correctedUrl.includes('/profil/')) {
                notification.url = correctedUrl;
                console.log(`URL corrigée pour notification order_validated #${notification.id}:`, notification.url);
              }
            }
          }
          
          // Si l'URL existe mais est incorrecte (sans /profil/), la corriger
          if (notification.url && !notification.url.includes('/profil/')) {
            const correctedUrl = getCorrectProfileUrl(notification.url);
            if (correctedUrl && correctedUrl.includes('/profil/')) {
              notification.url = correctedUrl;
              console.log(`URL corrigée pour notification order_validated #${notification.id}:`, notification.url);
            }
          }
        }
        
        // Pour toutes les notifications, s'assurer que l'URL est correcte
        if (notification.url) {
          // Si l'URL contient déjà /profil/, la préserver telle quelle (peut contenir ?order= ou ?token=)
          if (notification.url.includes('/profil/')) {
            // L'URL est déjà correcte, ne rien faire
            return notification;
          }
          
          // Si l'URL ne contient pas /profil/, la corriger
          const correctedUrl = getCorrectProfileUrl(notification.url);
          if (correctedUrl && correctedUrl.includes('/profil/')) {
            notification.url = correctedUrl;
          }
        }
        
        return notification;
      })
    );
  } catch (err) {
    console.error('Error fetching stats:', err);
    error.value = err.response?.data?.message || err.message || 'Une erreur est survenue';
  } finally {
    loading.value = false;
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

function getActivityIcon(type) {
  const icons = {
    user: '👤',
    order: '📦',
    page: '🏢',
    settings: '⚙️'
  };
  return icons[type] || '📌';
}

function getNotifIcon(type) {
  const icons = {
    user_registered: '🆕',
    order_validated: '✅',
    card_added: '➕',
    order_configured: '⚙️',
  };
  return icons[type] || '🔔';
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // en secondes

  if (diff < 60) return 'Il y a quelques secondes';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} minutes`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} heures`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} jours`;
  return date.toLocaleDateString('fr-FR');
}

// Corriger l'URL du profil si elle est incorrecte
function getCorrectProfileUrl(url) {
  if (!url) {
    console.warn('getCorrectProfileUrl: URL vide ou null');
    return '';
  }
  
  console.log('getCorrectProfileUrl: URL reçue:', url);
  
  // Si l'URL est déjà complète (commence par http:// ou https://)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Vérifier si l'URL contient déjà /profil/
    if (url.includes('/profil/')) {
      // L'URL est déjà correcte, peut contenir ?order= ou ?token=
      // Préserver l'URL telle quelle (même si elle contient ?order= pour les anciennes commandes)
      console.log('getCorrectProfileUrl: URL déjà complète avec /profil/, retour:', url);
      return url;
    }
    
    // Si l'URL est complète mais ne contient pas /profil/, l'ajouter
    // Format attendu: http://backendUrl/username?token=... ou http://backendUrl/username?order=...
    // Format souhaité: http://backendUrl/profil/username?token=... ou http://backendUrl/profil/username?order=...
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const search = urlObj.search;
      
      // Si le pathname ne commence pas par /profil/, l'ajouter
      if (!pathname.startsWith('/profil/')) {
        // Extraire le username du pathname (enlever le / au début)
        const username = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        // Construire la nouvelle URL avec /profil/
        const correctedUrl = `${urlObj.protocol}//${urlObj.host}/profil/${username}${search}`;
        console.log('getCorrectProfileUrl: URL complète sans /profil/, correction:', correctedUrl);
        return correctedUrl;
      }
      
      console.log('getCorrectProfileUrl: URL déjà complète avec /profil/, retour:', url);
      return url;
    } catch (e) {
      console.warn('getCorrectProfileUrl: Erreur lors du parsing de l\'URL:', e);
      // Si le parsing échoue, essayer de corriger manuellement
      // Chercher le pattern backendUrl/username?token=... ou backendUrl/username?order=...
      const backendUrlPattern = new RegExp(`^(${backendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})/([^/?]+)(\\?.*)?$`);
      const match = url.match(backendUrlPattern);
      if (match) {
        const username = match[2];
        const query = match[3] || '';
        const correctedUrl = `${match[1]}/profil/${username}${query}`;
        console.log('getCorrectProfileUrl: Correction manuelle:', correctedUrl);
        return correctedUrl;
      }
      return url;
    }
  }
  
  // Si l'URL commence par /profil/, ajouter le backendUrl
  if (url.startsWith('/profil/')) {
    const fullUrl = `${backendUrl}${url}`;
    console.log('getCorrectProfileUrl: URL avec /profil/, retour:', fullUrl);
    return fullUrl;
  }
  
  // Si l'URL est de la forme "username?token=..." ou "username?order=..." ou "username", la transformer en "/profil/username?token=..." ou "/profil/username?order=..."
  // Extraire le username et les paramètres de requête
  const urlParts = url.split('?');
  const username = urlParts[0].trim();
  const queryParams = urlParts[1] ? `?${urlParts[1]}` : '';
  
  // Si le username ne contient pas de slash et n'est pas vide, c'est probablement un username
  if (username && !username.includes('/') && !username.startsWith('http')) {
    const fullUrl = `${backendUrl}/profil/${username}${queryParams}`;
    console.log('getCorrectProfileUrl: Username détecté, retour:', fullUrl);
    return fullUrl;
  }
  
  // Si l'URL commence par /, ajouter juste le backendUrl
  if (url.startsWith('/')) {
    const fullUrl = `${backendUrl}${url}`;
    console.log('getCorrectProfileUrl: URL commence par /, retour:', fullUrl);
    return fullUrl;
  }
  
  // Sinon, essayer de construire l'URL avec /profil/
  const fullUrl = `${backendUrl}/profil/${url}`;
  console.log('getCorrectProfileUrl: Fallback, retour:', fullUrl);
  return fullUrl;
}

// Générer l'URL du profil à partir des données de la notification
function getNotificationProfileUrl(notification) {
  if (!notification) {
    console.warn('getNotificationProfileUrl: notification est null ou undefined');
    return null;
  }
  
  console.log('getNotificationProfileUrl: notification:', notification);
  
  // Si l'URL est déjà fournie, vérifier si elle contient ?order= et essayer de la remplacer par ?token=
  if (notification.url) {
    console.log('getNotificationProfileUrl: URL trouvée dans notification.url:', notification.url);
    
    // Si l'URL contient ?order=, essayer de trouver le token pour le remplacer
    if (notification.url.includes('?order=') && notification.type === 'order_validated') {
      console.log('getNotificationProfileUrl: URL contient ?order=, recherche du token pour le remplacer...');
      
      // Essayer d'obtenir le token d'accès depuis la notification
      // Chercher dans toutes les structures possibles (niveau racine et structures imbriquées)
      let accessToken = null;
      
      // Chercher dans le niveau racine de notification.order
      if (notification.order?.access_token) {
        accessToken = notification.order.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.access_token');
      } else if (notification.order?.profile_token) {
        accessToken = notification.order.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile_token');
      } else if (notification.order?.public_token) {
        accessToken = notification.order.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_token');
      } else if (notification.order?.token) {
        accessToken = notification.order.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.token');
      }
      // Chercher dans les structures imbriquées
      else if (notification.order?.profile?.access_token) {
        accessToken = notification.order.profile.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.access_token');
      } else if (notification.order?.profile?.profile_token) {
        accessToken = notification.order.profile.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.profile_token');
      } else if (notification.order?.profile?.public_token) {
        accessToken = notification.order.profile.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.public_token');
      } else if (notification.order?.profile?.token) {
        accessToken = notification.order.profile.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.token');
      } else if (notification.order?.order_profile?.access_token) {
        accessToken = notification.order.order_profile.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.access_token');
      } else if (notification.order?.order_profile?.profile_token) {
        accessToken = notification.order.order_profile.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.profile_token');
      } else if (notification.order?.order_profile?.public_token) {
        accessToken = notification.order.order_profile.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.public_token');
      } else if (notification.order?.order_profile?.token) {
        accessToken = notification.order.order_profile.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.token');
      } else if (notification.order?.public_profile?.access_token) {
        accessToken = notification.order.public_profile.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.access_token');
      } else if (notification.order?.public_profile?.profile_token) {
        accessToken = notification.order.public_profile.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.profile_token');
      } else if (notification.order?.public_profile?.public_token) {
        accessToken = notification.order.public_profile.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.public_token');
      } else if (notification.order?.public_profile?.token) {
        accessToken = notification.order.public_profile.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.token');
      }
      
      // Si un token est trouvé, remplacer ?order= par ?token=
      if (accessToken) {
        const urlWithToken = notification.url.replace(/\?order=\d+/, `?token=${accessToken}`);
        console.log('getNotificationProfileUrl: URL mise à jour avec token:', urlWithToken);
        const correctedUrl = getCorrectProfileUrl(urlWithToken);
        console.log('getNotificationProfileUrl: URL corrigée:', correctedUrl);
        return correctedUrl;
      } else {
        console.log('getNotificationProfileUrl: Aucun token trouvé dans notification.order, conservation de ?order=');
        // Log si aucun token n'est trouvé
        console.log('getNotificationProfileUrl: Structure de notification.order:', {
          hasOrder: !!notification.order,
          orderKeys: notification.order ? Object.keys(notification.order) : [],
          hasProfile: !!notification.order?.profile,
          profileKeys: notification.order?.profile ? Object.keys(notification.order.profile) : [],
          hasOrderProfile: !!notification.order?.order_profile,
          orderProfileKeys: notification.order?.order_profile ? Object.keys(notification.order.order_profile) : [],
          hasPublicProfile: !!notification.order?.public_profile,
          publicProfileKeys: notification.order?.public_profile ? Object.keys(notification.order.public_profile) : [],
        });
        
        // Si notification.order n'existe pas ou est vide, essayer de récupérer la commande depuis l'API
        if (!notification.order || Object.keys(notification.order).length === 0) {
          const orderId = notification.order_id || notification.order?.id || notification.data?.order_id;
          if (orderId) {
            console.log(`getNotificationProfileUrl: Tentative de récupération de la commande #${orderId} depuis l'API...`);
            // Note: Cette récupération devrait être asynchrone, mais pour l'instant on garde ?order=
            // Le token sera récupéré lors du prochain rechargement de la page
          }
        }
      }
    }
    
    // Sinon, corriger l'URL normalement
    const correctedUrl = getCorrectProfileUrl(notification.url);
    console.log('getNotificationProfileUrl: URL corrigée:', correctedUrl);
    if (correctedUrl) return correctedUrl;
  }
  
  // Pour les notifications de type "order_validated", construire l'URL à partir des données
  if (notification.type === 'order_validated') {
    // Essayer de récupérer le username depuis les données de la notification
    let username = null;
    let orderId = null;
    
    // Chercher le username dans différentes propriétés possibles (même logique que l'enrichissement)
    // 1. Chercher dans les données du profil public de la commande
    if (notification.order?.profile?.username) {
      username = notification.order.profile.username;
    } else if (notification.order?.order_profile?.username) {
      username = notification.order.order_profile.username;
    } else if (notification.order?.public_profile?.username) {
      username = notification.order.public_profile.username;
    }
    // 2. Chercher directement dans la commande
    else if (notification.order?.profile_username) {
      username = notification.order.profile_username;
    } else if (notification.order?.public_username) {
      username = notification.order.public_username;
    } else if (notification.order?.username) {
      username = notification.order.username;
    } else if (notification.order?.employee_username) {
      username = notification.order.employee_username;
    }
    // 3. Chercher dans les données de l'utilisateur
    else if (notification.user?.username) {
      username = notification.user.username;
    } else if (notification.username) {
      username = notification.username;
    } else if (notification.user_username) {
      username = notification.user_username;
    } else if (notification.profile_username) {
      username = notification.profile_username;
    } else if (notification.order?.user?.username) {
      username = notification.order.user.username;
    }
    
    // Chercher l'order_id dans différentes propriétés possibles
    if (notification.order_id) {
      orderId = notification.order_id;
    } else if (notification.order?.id) {
      orderId = notification.order.id;
    } else if (notification.data?.order_id) {
      orderId = notification.data.order_id;
    } else if (notification.data?.id) {
      orderId = notification.data.id;
    }
    
    // Si l'order_id n'est pas trouvé, essayer de l'extraire du message
    if (!orderId && notification.message) {
      // Chercher des patterns comme "Commande #81", "order 81", "commande 81", etc.
      const orderIdMatch = notification.message.match(/(?:commande|order|#)\s*(\d+)/i);
      if (orderIdMatch && orderIdMatch[1]) {
        orderId = parseInt(orderIdMatch[1], 10);
      }
    }
    
    // Si on a un username, construire l'URL
    if (username) {
      // Essayer d'obtenir le token d'accès depuis la notification
      // Chercher dans toutes les structures possibles (niveau racine et structures imbriquées)
      let accessToken = null;
      
      // Chercher dans le niveau racine de notification.order
      if (notification.order?.access_token) {
        accessToken = notification.order.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.access_token');
      } else if (notification.order?.profile_token) {
        accessToken = notification.order.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile_token');
      } else if (notification.order?.public_token) {
        accessToken = notification.order.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_token');
      } else if (notification.order?.token) {
        accessToken = notification.order.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.token');
      }
      // Chercher dans les structures imbriquées
      else if (notification.order?.profile?.access_token) {
        accessToken = notification.order.profile.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.access_token');
      } else if (notification.order?.profile?.profile_token) {
        accessToken = notification.order.profile.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.profile_token');
      } else if (notification.order?.profile?.public_token) {
        accessToken = notification.order.profile.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.public_token');
      } else if (notification.order?.profile?.token) {
        accessToken = notification.order.profile.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.profile.token');
      } else if (notification.order?.order_profile?.access_token) {
        accessToken = notification.order.order_profile.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.access_token');
      } else if (notification.order?.order_profile?.profile_token) {
        accessToken = notification.order.order_profile.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.profile_token');
      } else if (notification.order?.order_profile?.public_token) {
        accessToken = notification.order.order_profile.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.public_token');
      } else if (notification.order?.order_profile?.token) {
        accessToken = notification.order.order_profile.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.order_profile.token');
      } else if (notification.order?.public_profile?.access_token) {
        accessToken = notification.order.public_profile.access_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.access_token');
      } else if (notification.order?.public_profile?.profile_token) {
        accessToken = notification.order.public_profile.profile_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.profile_token');
      } else if (notification.order?.public_profile?.public_token) {
        accessToken = notification.order.public_profile.public_token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.public_token');
      } else if (notification.order?.public_profile?.token) {
        accessToken = notification.order.public_profile.token;
        console.log('getNotificationProfileUrl: Token trouvé dans notification.order.public_profile.token');
      }
      
      // Log si aucun token n'est trouvé
      if (!accessToken) {
        console.log('getNotificationProfileUrl: Aucun token trouvé pour notification order_validated. Structure:', {
          notificationId: notification.id,
          orderId: orderId,
          username: username,
          hasOrder: !!notification.order,
          orderKeys: notification.order ? Object.keys(notification.order) : [],
          hasProfile: !!notification.order?.profile,
          profileKeys: notification.order?.profile ? Object.keys(notification.order.profile) : [],
          hasOrderProfile: !!notification.order?.order_profile,
          orderProfileKeys: notification.order?.order_profile ? Object.keys(notification.order.order_profile) : [],
          hasPublicProfile: !!notification.order?.public_profile,
          publicProfileKeys: notification.order?.public_profile ? Object.keys(notification.order.public_profile) : [],
        });
      }
      
      let queryParams = '';
      if (accessToken) {
        // Utiliser le token sécurisé
        queryParams = `?token=${accessToken}`;
        console.log('getNotificationProfileUrl: URL construite avec token:', `${backendUrl}/profil/${username}${queryParams}`, 'username:', username, 'token:', accessToken);
      } else if (orderId) {
        // Fallback pour les anciennes commandes sans token (comportement attendu)
        // Les anciennes commandes utilisent ?order= jusqu'à ce que le backend génère un token
        queryParams = `?order=${orderId}`;
        console.log('getNotificationProfileUrl: URL construite avec orderId (fallback):', `${backendUrl}/profil/${username}${queryParams}`, 'username:', username, 'orderId:', orderId);
      }
      
      const fullUrl = `${backendUrl}/profil/${username}${queryParams}`;
      return fullUrl;
    }
    
    // Si on a un order_id mais pas de username, l'URL devrait avoir été enrichie dans fetchStats
    // Si ce n'est pas le cas, on retourne null (le lien ne sera pas affiché)
    if (orderId && !username) {
      console.warn('Notification order_validated sans username, order_id:', orderId, 'notification:', notification);
      return null;
    }
  }
  
  // Pour les autres types de notifications, utiliser l'URL fournie si elle existe
  if (notification.url) {
    return getCorrectProfileUrl(notification.url);
  }
  
  return null;
}

// Fonction pour normaliser les données de design d'une commande (similaire à AdminOrderList.vue)
function normalizeLegacyDesignForNotification(order) {
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
  if (order.no_design_yet === undefined && (pp?.no_design_yet !== undefined || up?.no_design_yet !== undefined)) {
    order.no_design_yet = pp?.no_design_yet || up?.no_design_yet || false;
  }

  return order;
}

// Fonction pour obtenir les données de design d'une commande
function getDesignDataFromOrder(order) {
  if (!order) return null;
  return {
    card_design_type: order.card_design_type,
    card_design_number: order.card_design_number,
    card_design_custom_url: order.card_design_custom_url,
    no_design_yet: order.no_design_yet,
  };
}

// Fonction pour vérifier si une commande a un design défini (similaire à AdminOrderList.vue)
function hasDesignDefined(order) {
  if (!order) return false;
  
  // Normaliser d'abord
  const normalized = normalizeLegacyDesignForNotification(order);
  const d = getDesignDataFromOrder(normalized);
  
  if (!d || !d.card_design_type) {
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
  if (d.no_design_yet) return false; // bloque validation
  if (d.card_design_type === 'template' && d.card_design_number) return true;
  if (d.card_design_type === 'custom' && d.card_design_custom_url) return true;
  return false;
}

// Fonction pour vérifier si une notification order_validated doit être affichée
// Une commande validée doit être :
// 1. Paramétrée (is_configured = true) OU être une commande business avec un design défini
// 2. Avoir un design défini (pas "Design en attente")
// 3. Être validée (status = 'validated')
function isValidOrderValidatedNotification(notification) {
  if (notification.type !== 'order_validated') return false;
  
  // Récupérer la commande depuis notification.order ou notification.data
  const order = notification.order || notification.data || null;
  if (!order) return false;
  
  // Vérifier que la commande est validée
  const status = order.status || notification.status || null;
  if (status !== 'validated' && status !== 'validé' && status !== 'valide') {
    return false;
  }
  
  // Vérifier que la commande a un design défini (c'est la condition la plus importante)
  if (!hasDesignDefined(order)) {
    return false;
  }
  
  // Pour les commandes business, si elles ont un design défini et sont validées, elles sont considérées comme paramétrées
  // Pour les commandes particulières, vérifier is_configured
  const orderType = order.order_type || order.orderType || null;
  const isBusinessOrder = orderType === 'business' || orderType === 'entreprise';
  
  if (isBusinessOrder) {
    // Pour les commandes business, si elles sont validées et ont un design défini, elles sont OK
    // (le design du business admin est appliqué aux employés)
    return true;
  } else {
    // Pour les commandes particulières, vérifier is_configured
    const isConfigured = order.is_configured !== undefined ? order.is_configured : (order.isConfigured !== undefined ? order.isConfigured : false);
    if (!isConfigured) {
      return false;
    }
  }
  
  return true;
}

// Filtrer les notifications selon l'onglet actif
const filteredNotifications = computed(() => {
  if (activeNotificationTab.value === 'new_registrations') {
    return notifications.value.filter(n => n.type === 'user_registered');
  } else if (activeNotificationTab.value === 'order_configured') {
    return notifications.value.filter(n => n.type === 'order_configured');
  } else if (activeNotificationTab.value === 'order_validated') {
    // Filtrer uniquement les commandes validées qui sont paramétrées et ont un design défini
    const validNotifications = notifications.value.filter(n => isValidOrderValidatedNotification(n));
    
    // Dédupliquer par order_id : garder uniquement la notification la plus récente pour chaque commande
    const seenOrderIds = new Map();
    const deduplicated = [];
    
    for (const notification of validNotifications) {
      // Récupérer l'order_id depuis différentes sources possibles
      const orderId = notification.order_id || 
                      notification.order?.id || 
                      notification.data?.order_id || 
                      notification.data?.id ||
                      null;
      
      if (orderId) {
        // Si on a déjà vu cette commande, comparer les dates
        if (seenOrderIds.has(orderId)) {
          const existingNotification = seenOrderIds.get(orderId);
          const existingDate = new Date(existingNotification.created_at || existingNotification.createdAt || 0);
          const currentDate = new Date(notification.created_at || notification.createdAt || 0);
          
          // Garder la notification la plus récente
          if (currentDate > existingDate) {
            // Remplacer l'ancienne notification par la plus récente
            const index = deduplicated.findIndex(n => {
              const nOrderId = n.order_id || n.order?.id || n.data?.order_id || n.data?.id;
              return nOrderId === orderId;
            });
            if (index !== -1) {
              deduplicated[index] = notification;
            }
            seenOrderIds.set(orderId, notification);
          }
          // Sinon, ignorer cette notification (on garde l'existante)
        } else {
          // Première fois qu'on voit cette commande, l'ajouter
          deduplicated.push(notification);
          seenOrderIds.set(orderId, notification);
        }
      } else {
        // Si pas d'order_id, ajouter quand même (ne devrait pas arriver pour order_validated)
        deduplicated.push(notification);
      }
    }
    
    return deduplicated;
  } else if (activeNotificationTab.value === 'others') {
    const knownTypes = ['user_registered', 'order_configured', 'order_validated'];
    return notifications.value.filter(n => !knownTypes.includes(n.type));
  }
  return notifications.value;
});

// Compter les notifications par catégorie
function getTabCount(tabKey) {
  if (tabKey === 'new_registrations') {
    return notifications.value.filter(n => n.type === 'user_registered').length;
  } else if (tabKey === 'order_configured') {
    return notifications.value.filter(n => n.type === 'order_configured').length;
  } else if (tabKey === 'order_validated') {
    // Compter uniquement les commandes validées qui sont paramétrées et ont un design défini
    // Utiliser la même logique de déduplication que filteredNotifications
    const validNotifications = notifications.value.filter(n => isValidOrderValidatedNotification(n));
    
    // Dédupliquer par order_id : garder uniquement la notification la plus récente pour chaque commande
    const seenOrderIds = new Map();
    const deduplicated = [];
    
    for (const notification of validNotifications) {
      // Récupérer l'order_id depuis différentes sources possibles
      const orderId = notification.order_id || 
                      notification.order?.id || 
                      notification.data?.order_id || 
                      notification.data?.id ||
                      null;
      
      if (orderId) {
        // Si on a déjà vu cette commande, comparer les dates
        if (seenOrderIds.has(orderId)) {
          const existingNotification = seenOrderIds.get(orderId);
          const existingDate = new Date(existingNotification.created_at || existingNotification.createdAt || 0);
          const currentDate = new Date(notification.created_at || notification.createdAt || 0);
          
          // Garder la notification la plus récente
          if (currentDate > existingDate) {
            // Remplacer l'ancienne notification par la plus récente
            const index = deduplicated.findIndex(n => {
              const nOrderId = n.order_id || n.order?.id || n.data?.order_id || n.data?.id;
              return nOrderId === orderId;
            });
            if (index !== -1) {
              deduplicated[index] = notification;
            }
            seenOrderIds.set(orderId, notification);
          }
          // Sinon, ignorer cette notification (on garde l'existante)
        } else {
          // Première fois qu'on voit cette commande, l'ajouter
          deduplicated.push(notification);
          seenOrderIds.set(orderId, notification);
        }
      } else {
        // Si pas d'order_id, ajouter quand même (ne devrait pas arriver pour order_validated)
        deduplicated.push(notification);
      }
    }
    
    return deduplicated.length;
  } else if (tabKey === 'others') {
    const knownTypes = ['user_registered', 'order_configured', 'order_validated'];
    return notifications.value.filter(n => !knownTypes.includes(n.type)).length;
  }
  return 0;
}

// Écouter les événements de création/validation de commande pour rafraîchir les notifications
function handleOrderCreated(event) {
  console.log('AdminDashboard: Événement order-created reçu, rafraîchissement des notifications...', event.detail);
  fetchStats();
}

function handleOrderValidated(event) {
  console.log('AdminDashboard: Événement order-validated reçu, rafraîchissement des notifications...', event.detail);
  fetchStats();
}

onMounted(() => {
  fetchStats();
  
  // Écouter les événements de création et validation de commande
  window.addEventListener('order-created', handleOrderCreated);
  window.addEventListener('order-validated', handleOrderValidated);
});

onUnmounted(() => {
  // Nettoyer les écouteurs d'événements
  window.removeEventListener('order-created', handleOrderCreated);
  window.removeEventListener('order-validated', handleOrderValidated);
});
</script>

<style scoped>
.admin-dashboard {
  padding: 2rem;
}

h1 {
  margin-bottom: 1rem;
  font-size: 2rem;
  font-weight: bold;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 2rem 0 1rem 0;
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

.welcome-message {
  color: #6b7280;
  margin-bottom: 2rem;
  font-size: 1.125rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  border-left: 4px solid;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-users {
  border-left-color: #3b82f6;
}

.stat-orders {
  border-left-color: #10b981;
}

.stat-pages {
  border-left-color: #f59e0b;
}

.stat-revenue {
  border-left-color: #8b5cf6;
}

/* Centrer la carte de revenu total */
.stat-revenue {
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.stat-revenue .stat-icon {
  margin-bottom: 0.25rem;
}
.stat-revenue .stat-content {
  width: 100%;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.stat-detail {
  font-size: 0.75rem;
  color: #9ca3af;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  background-color: #fff;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card h3 {
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.card p {
  color: #6b7280;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  flex: 1;
}

.card-stats {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  text-align: center;
}

.card-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #eff6ff;
  border-radius: 0.375rem;
  text-align: center;
  transition: background-color 0.2s;
}

.card-link:hover {
  background-color: #dbeafe;
  text-decoration: none;
}

.recent-activity {
  background-color: #fff;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.activity-item:hover {
  background-color: #f3f4f6;
}

.activity-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: #374151;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Styles pour les onglets de notifications */
.notification-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  overflow-x: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #6b7280;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  position: relative;
  bottom: -2px;
}

.tab-button:hover {
  color: #3b82f6;
  background-color: #f3f4f6;
  border-radius: 0.375rem 0.375rem 0 0;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 600;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.375rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.tab-button.active .tab-badge {
  background-color: #2563eb;
}

/* Media queries pour responsive */
@media (max-width: 768px) {
  .admin-dashboard {
    padding: 1rem;
  }

  h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 1.25rem;
    margin: 1.5rem 0 0.75rem 0;
  }

  .welcome-message {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
  }

  .stat-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.8125rem;
  }

  .stat-detail {
    font-size: 0.6875rem;
  }

  .dashboard-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card {
    padding: 1.5rem;
  }

  .card h3 {
    font-size: 1rem;
  }

  .card p {
    font-size: 0.8125rem;
  }

  .recent-activity {
    padding: 1.5rem;
  }

  .activity-item {
    padding: 0.75rem;
  }

  .activity-icon {
    font-size: 1.25rem;
  }

  .activity-text {
    font-size: 0.875rem;
  }

  .notification-tabs {
    gap: 0.25rem;
  }

  .tab-button {
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
  }

  .tab-badge {
    min-width: 1.25rem;
    height: 1.25rem;
    font-size: 0.6875rem;
  }
}

@media (max-width: 480px) {
  .admin-dashboard {
    padding: 0.75rem;
  }

  h1 {
    font-size: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 0.875rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .card {
    padding: 1rem;
  }

  .card-stats {
    font-size: 0.8125rem;
  }

  .card-link {
    font-size: 0.875rem;
    padding: 0.375rem 0.75rem;
  }

  .notification-tabs {
    gap: 0.125rem;
  }

  .tab-button {
    padding: 0.5rem 0.625rem;
    font-size: 0.75rem;
  }

  .tab-badge {
    min-width: 1.125rem;
    height: 1.125rem;
    font-size: 0.625rem;
    padding: 0 0.25rem;
  }
}
</style>

