// 1. Importer le fichier CSS principal qui contient les styles de Tailwind
import './assets/main.css'
import './assets/admin-responsive.css'

// 2. Importer les fonctions nécessaires de Vue
import { createApp } from 'vue'

// 3. Importer Pinia pour la gestion d'état
import { createPinia } from 'pinia'

// 4. Importer le composant racine de l'application
import App from './App.vue'

// 5. Importer notre configurateur de routes (le "GPS" de l'application)
import router from './router'

// 6. Créer l'instance de Pinia
const pinia = createPinia()

// 7. Créer l'instance de l'application Vue
const app = createApp(App)

// 8. Dire à l'application d'utiliser Pinia et le routeur
app.use(pinia)
app.use(router)

// 9. Monter (afficher) l'application dans l'élément HTML qui a l'id "app"
app.mount('#app')

