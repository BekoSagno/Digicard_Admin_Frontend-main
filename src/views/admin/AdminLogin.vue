<template>
  <div class="admin-login">
    <div class="login-card">
      <h1>Connexion Admin</h1>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@example.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
          />
        </div>

        <div v-if="error" class="error-message" style="white-space: pre-line;">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-login">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuthStore } from '../../stores/adminAuth';

const router = useRouter();
const authStore = useAdminAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);

async function handleLogin() {
  loading.value = true;
  error.value = null;

  try {
    const result = await authStore.login(email.value, password.value);

    if (result.success) {
      // Rediriger vers le dashboard admin
      router.push('/admin');
    } else {
      error.value = result.message || 'Erreur de connexion';
    }
  } catch (err) {
    console.error('Erreur de connexion:', err);
    
    // Gestion plus détaillée des erreurs
    if (err.response) {
      // Erreur de réponse du serveur
      error.value = err.response.data?.message || `Erreur serveur (${err.response.status})`;
    } else if (err.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      error.value = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet et que le serveur est démarré.';
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      error.value = err.message || 'Une erreur est survenue lors de la connexion';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.admin-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-card {
  background-color: #fff;
  padding: 3rem;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

h1 {
  margin-bottom: 2rem;
  font-size: 1.875rem;
  font-weight: bold;
  text-align: center;
  color: #1f2937;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #fee2e2;
  color: #dc2626;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.btn-login {
  width: 100%;
  padding: 0.875rem;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-login:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-login:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

/* Media queries pour responsive */
@media (max-width: 768px) {
  .admin-login {
    padding: 1rem;
  }

  .login-card {
    padding: 2rem;
    max-width: 100%;
  }

  h1 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
}

@media (max-width: 480px) {
  .admin-login {
    padding: 0.5rem;
  }

  .login-card {
    padding: 1.5rem;
  }

  h1 {
    font-size: 1.25rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  label {
    font-size: 0.875rem;
  }

  input {
    padding: 0.625rem;
    font-size: 0.9375rem;
  }

  .btn-login {
    padding: 0.75rem;
    font-size: 0.9375rem;
  }

  .error-message {
    font-size: 0.8125rem;
    padding: 0.625rem;
  }
}
</style>

