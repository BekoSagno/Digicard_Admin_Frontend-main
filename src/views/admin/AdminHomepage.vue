<template>
  <div class="admin-settings">
    <h1>Contenu de la Page d'Accueil</h1>

    <div class="settings-section">
      <h2>Héro</h2>
      <form @submit.prevent="save">
        <div class="form-grid">
          <div class="form-group">
            <label>Titre</label>
            <input v-model="homepage.hero_title" type="text" placeholder="Titre principal" />
          </div>
          <div class="form-group">
            <label>Sous-titre</label>
            <input v-model="homepage.hero_subtitle" type="text" placeholder="Sous-titre" />
          </div>
          <div class="form-group">
            <label>Texte du CTA</label>
            <input v-model="homepage.hero_cta_text" type="text" placeholder="Commander maintenant" />
          </div>
          <div class="form-group">
            <label>Lien du CTA</label>
            <input v-model="homepage.hero_cta_link" type="text" placeholder="/#commander" />
          </div>
          <div class="form-group" style="grid-column: 1 / -1">
            <label>Image (URL)</label>
            <input v-model="homepage.hero_image_url" type="text" placeholder="https://..." />
          </div>
        </div>

        <h3>Points clés</h3>
        <div class="highlights">
          <div class="highlight-row" v-for="(h, i) in homepage.highlights" :key="i">
            <input v-model="h.title" class="w-full" type="text" placeholder="Titre" />
            <input v-model="h.text" class="w-full" type="text" placeholder="Texte" />
            <button type="button" class="btn-danger" @click="removeHighlight(i)">Supprimer</button>
          </div>
          <button type="button" class="btn" @click="addHighlight">+ Ajouter un point clé</button>
        </div>

        <h3>FAQ Section</h3>
        <div class="faqs-section">
          <div class="faq-item" v-for="(faq, i) in homepage.faqs" :key="i">
            <div class="faq-header">
              <strong>FAQ #{{ i + 1 }}</strong>
              <button type="button" class="btn-danger" @click="removeFAQ(i)">Supprimer</button>
            </div>
            <div class="form-grid">
              <div class="form-group" style="grid-column: 1 / -1">
                <label>Question</label>
                <input v-model="faq.question" type="text" placeholder="Question fréquente" />
              </div>
              <div class="form-group" style="grid-column: 1 / -1">
                <label>Réponse</label>
                <textarea v-model="faq.answer" rows="4" placeholder="Réponse détaillée"></textarea>
              </div>
            </div>
          </div>
          <div class="section-actions">
            <button type="button" class="btn" @click="addFAQ">+ Ajouter une FAQ</button>
            <button type="button" class="btn-save-section" :disabled="savingFAQs" @click="saveFAQs">
              {{ savingFAQs ? "Enregistrement..." : "Enregistrer les FAQs" }}
            </button>
          </div>
        </div>

        <h3>Section Témoignages</h3>
        <div class="testimonials-section">
          <div class="testimonial-item" v-for="(testimonial, i) in homepage.testimonials" :key="i">
            <div class="testimonial-header">
              <strong>Témoignage #{{ i + 1 }}</strong>
              <button type="button" class="btn-danger" @click="removeTestimonial(i)">Supprimer</button>
            </div>
            <div class="form-grid">
              <div class="form-group" style="grid-column: 1 / -1">
                <label>Texte du témoignage</label>
                <textarea v-model="testimonial.text" rows="3" placeholder="Texte du témoignage"></textarea>
              </div>
              <div class="form-group">
                <label>Nom de l'auteur</label>
                <input v-model="testimonial.author_name" type="text" placeholder="Nom complet" />
              </div>
              <div class="form-group">
                <label>Rôle / Fonction</label>
                <input v-model="testimonial.author_role" type="text" placeholder="Ex: CEO, Tech Innov" />
              </div>
              <div class="form-group" style="grid-column: 1 / -1">
                <label>Avatar</label>
                <div class="flex items-center gap-4">
                  <div v-if="testimonial.avatar_url" class="flex-shrink-0">
                    <img
                      v-if="!avatarErrors[i]"
                      :src="getAvatarPreviewUrl(testimonial.avatar_url)"
                      :alt="`Avatar de ${testimonial.author_name}`"
                      class="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                      @error="handleAvatarError($event, testimonial, i)"
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center border-2 border-gray-300"
                    >
                      <svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1">
                    <input
                      :id="`testimonialAvatarInput_${i}`"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/gif"
                      @change="handleTestimonialAvatarUpload($event, i)"
                      class="hidden"
                    />
                    <button
                      type="button"
                      class="btn-secondary"
                      @click="() => triggerFileInput(`testimonialAvatarInput_${i}`)"
                      :disabled="uploadingAvatar[i]"
                    >
                      {{
                        uploadingAvatar[i]
                          ? "Upload..."
                          : testimonial.avatar_url
                            ? "Changer l'avatar"
                            : "Télécharger un avatar"
                      }}
                    </button>
                    <p v-if="testimonial.avatar_url" class="text-xs text-slate-500 mt-1">
                      {{ testimonial.avatar_url }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="section-actions">
            <button type="button" class="btn" @click="addTestimonial">+ Ajouter un témoignage</button>
            <button type="button" class="btn-save-section" :disabled="savingTestimonials" @click="saveTestimonials">
              {{ savingTestimonials ? "Enregistrement..." : "Enregistrer les Témoignages" }}
            </button>
          </div>
        </div>

        <h3>Section Preuve Sociale (Entreprises)</h3>
        <div class="social-proof-section">
          <div class="social-proof-item" v-for="(company, i) in homepage.social_proof" :key="i">
            <div class="social-proof-header">
              <strong>Entreprise #{{ i + 1 }}</strong>
              <button type="button" class="btn-danger" @click="removeSocialProof(i)">Supprimer</button>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Nom de l'entreprise</label>
                <input v-model="company.name" type="text" placeholder="Ex: IconValley" />
              </div>
              <div class="form-group" style="grid-column: 1 / -1">
                <label>Logo</label>
                <div class="flex items-center gap-4">
                  <div v-if="company.logo_url" class="flex-shrink-0">
                    <img
                      v-if="!logoErrors[i]"
                      :src="getLogoPreviewUrl(company.logo_url)"
                      :alt="`Logo ${company.name}`"
                      class="h-12 w-auto max-w-32 object-contain border-2 border-gray-300 rounded p-1 bg-white"
                      @error="handleLogoError($event, company, i)"
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="h-12 w-32 bg-gray-200 border-2 border-gray-300 rounded flex items-center justify-center"
                    >
                      <span class="text-xs text-gray-500">Logo indisponible</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <input
                      :id="`socialProofLogoInput_${i}`"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                      @change="handleSocialProofLogoUpload($event, i)"
                      class="hidden"
                    />
                    <button
                      type="button"
                      class="btn-secondary"
                      @click="() => triggerFileInput(`socialProofLogoInput_${i}`)"
                      :disabled="uploadingLogo[i]"
                    >
                      {{
                        uploadingLogo[i] ? "Upload..." : company.logo_url ? "Changer le logo" : "Télécharger un logo"
                      }}
                    </button>
                    <p v-if="company.logo_url" class="text-xs text-slate-500 mt-1">
                      {{ company.logo_url }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="section-actions">
            <button type="button" class="btn" @click="addSocialProof">+ Ajouter une entreprise</button>
            <button type="button" class="btn-save-section" :disabled="savingSocialProof" @click="saveSocialProof">
              {{ savingSocialProof ? "Enregistrement..." : "Enregistrer les Entreprises" }}
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-save" :disabled="saving">{{ saving ? "Enregistrement..." : "Enregistrer" }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
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
  const DEFAULTS = {
    hero_title:
      'La Carte de Visite, <br class="hidden sm:block" />' +
      '<span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">Réinventée.</span>',
    hero_subtitle: "Partagez instantanément vos contacts, liens et profils avec une seule carte intelligente.",
    hero_cta_text: "Commander ma carte",
    hero_cta_link: "/#commander",
    hero_image_url: "",
    highlights: [
      { title: "NFC + QR", text: "Compatible iOS/Android et QR Code" },
      { title: "Personnalisable", text: "Votre branding, vos couleurs" },
      { title: "Mise à jour instantanée", text: "Modifiez sans réimprimer" },
    ],
    faqs: [
      {
        question: "Comment fonctionne la technologie NFC ?",
        answer:
          "La technologie NFC (Near Field Communication) permet à votre carte de communiquer sans contact avec un smartphone compatible. Il suffit d'approcher la carte du téléphone pour que votre profil s'affiche instantanément, sans aucune application nécessaire.",
      },
      {
        question: "Dois-je recharger ma carte ?",
        answer:
          "Non, nos cartes et stickers NFC sont passifs, ce qui signifie qu'ils n'ont pas de batterie et n'ont jamais besoin d'être rechargés. Ils sont alimentés par le champ magnétique du téléphone lorsqu'il est à proximité.",
      },
      {
        question: "Puis-je modifier mon profil après avoir commandé ma carte ?",
        answer:
          "Oui, absolument ! Vous pouvez vous connecter à votre espace membre à tout moment pour mettre à jour vos informations, liens et photos. Les changements sont appliqués en temps réel sur votre profil public.",
      },
      {
        question: "Est-ce que tous les téléphones sont compatibles ?",
        answer:
          "La grande majorité des smartphones modernes (iOS et Android) sont équipés de la technologie NFC. Pour les téléphones plus anciens, chaque carte dispose également d'un QR Code que vous pouvez faire scanner pour un accès garanti à votre profil.",
      },
    ],
    testimonials: [
      {
        text: "Absolument révolutionnaire ! En tant que consultant, je rencontre des dizaines de personnes chaque semaine. Cette carte a simplifié mes échanges et renforcé mon image de marque. Un indispensable.",
        author_name: "Aminata Bah",
        author_role: "Consultante en Stratégie",
        avatar_url: "/images/avatar1.jpg",
      },
      {
        text: "J'étais sceptique au début, mais le sticker NFC est génial. Je l'ai collé sur mon téléphone et je n'ai plus jamais à m'inquiéter d'oublier mes cartes de visite. Efficace et très pro.",
        author_name: "Mamadou Diallo",
        author_role: "CEO, Tech Innov",
        avatar_url: "/images/avatar2.jpg",
      },
      {
        text: "Le design de la carte PVC est superbe et la personnalisation du profil en ligne est très intuitive. Nos clients sont impressionnés à chaque fois. Je recommande vivement !",
        author_name: "Fatou Camara",
        author_role: "Directrice Marketing, Agence Créa",
        avatar_url: "/images/avatar3.jpg",
      },
    ],
    social_proof: [
      {
        name: "IconValley",
        logo_url: "/images/LogoIconValley.png",
      },
      {
        name: "Gnalenmady Consulting",
        logo_url: "/images/LogoGnalenmady.png",
      },
      {
        name: "Byte Securitas",
        logo_url: "/images/LogoByteSecuritas.png",
      },
      {
        name: "Bally Multi Expertise",
        logo_url: "/images/LogoBMEX.png",
      },
      {
        name: "AGEP Events",
        logo_url: "/images/LogoAGEP.png",
      },
    ],
  };

  const homepage = ref({ ...DEFAULTS });
  const saving = ref(false);
  const savingFAQs = ref(false);
  const savingTestimonials = ref(false);
  const savingSocialProof = ref(false);
  const uploadingAvatar = ref({});
  const uploadingLogo = ref({});

  async function load() {
    try {
      const res = await adminAxios.get("/api/admin/homepage", {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      const fromServer = res.data.homepage || {};
      // Fusionner avec les valeurs par défaut pour pré-remplir tous les champs
      homepage.value = {
        ...DEFAULTS,
        ...fromServer,
        highlights:
          Array.isArray(fromServer.highlights) && fromServer.highlights.length > 0
            ? fromServer.highlights
            : DEFAULTS.highlights,
        faqs: Array.isArray(fromServer.faqs) && fromServer.faqs.length > 0 ? fromServer.faqs : DEFAULTS.faqs,
        testimonials:
          Array.isArray(fromServer.testimonials) && fromServer.testimonials.length > 0
            ? fromServer.testimonials
            : DEFAULTS.testimonials,
        social_proof:
          Array.isArray(fromServer.social_proof) && fromServer.social_proof.length > 0
            ? fromServer.social_proof
            : DEFAULTS.social_proof,
      };
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      alert("Erreur lors du chargement des données");
    }
  }

  function addHighlight() {
    homepage.value.highlights = homepage.value.highlights || [];
    homepage.value.highlights.push({ title: "", text: "" });
  }
  function removeHighlight(i) {
    homepage.value.highlights.splice(i, 1);
  }

  function addFAQ() {
    homepage.value.faqs = homepage.value.faqs || [];
    homepage.value.faqs.push({ question: "", answer: "" });
  }
  function removeFAQ(i) {
    homepage.value.faqs.splice(i, 1);
  }

  function addTestimonial() {
    homepage.value.testimonials = homepage.value.testimonials || [];
    homepage.value.testimonials.push({ text: "", author_name: "", author_role: "", avatar_url: "" });
  }
  function removeTestimonial(i) {
    homepage.value.testimonials.splice(i, 1);
  }

  function addSocialProof() {
    homepage.value.social_proof = homepage.value.social_proof || [];
    homepage.value.social_proof.push({ name: "", logo_url: "" });
  }
  function removeSocialProof(i) {
    homepage.value.social_proof.splice(i, 1);
  }

  async function save() {
    saving.value = true;
    try {
      await setCsrfToken();
      await adminAxios.post("/api/admin/homepage", homepage.value, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      alert("Contenu enregistré");
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      saving.value = false;
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
    }
  }

  // Sauvegarder uniquement les FAQs
  async function saveFAQs() {
    savingFAQs.value = true;
    try {
      await setCsrfToken();

      // Charger les données actuelles du serveur
      const currentRes = await adminAxios.get("/api/admin/homepage", {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      const currentData = currentRes.data.homepage || {};

      // Mettre à jour uniquement les FAQs
      const updatedData = {
        ...currentData,
        faqs: homepage.value.faqs,
      };

      await adminAxios.post("/api/admin/homepage", updatedData, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      alert("FAQs enregistrées avec succès");
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'enregistrement des FAQs");
    } finally {
      savingFAQs.value = false;
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
    }
  }

  // Sauvegarder uniquement les Testimonials
  async function saveTestimonials() {
    savingTestimonials.value = true;
    try {
      await setCsrfToken();

      // Charger les données actuelles du serveur
      const currentRes = await adminAxios.get("/api/admin/homepage", {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      const currentData = currentRes.data.homepage || {};

      // Mettre à jour uniquement les testimonials
      const updatedData = {
        ...currentData,
        testimonials: homepage.value.testimonials,
      };

      await adminAxios.post("/api/admin/homepage", updatedData, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      alert("Témoignages enregistrés avec succès");
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'enregistrement des témoignages");
    } finally {
      savingTestimonials.value = false;
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
    }
  }

  // Sauvegarder uniquement les Social Proof (entreprises)
  async function saveSocialProof() {
    savingSocialProof.value = true;
    try {
      await setCsrfToken();

      // Charger les données actuelles du serveur
      const currentRes = await adminAxios.get("/api/admin/homepage", {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      const currentData = currentRes.data.homepage || {};

      // Mettre à jour uniquement les social_proof
      const updatedData = {
        ...currentData,
        social_proof: homepage.value.social_proof,
      };

      await adminAxios.post("/api/admin/homepage", updatedData, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });
      alert("Entreprises enregistrées avec succès");
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'enregistrement des entreprises");
    } finally {
      savingSocialProof.value = false;
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
    }
  }

  // Fonctions pour obtenir les URLs de preview
  const getAvatarPreviewUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    const backendUrl = import.meta.env.VITE_APP_URL_BACKEND || "http://127.0.0.1:8000";

    // Si c'est déjà une URL complète
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      return avatarUrl;
    }

    // Si c'est un chemin de storage du backend (commence par /storage/)
    if (avatarUrl.startsWith("/storage/")) {
      return backendUrl + avatarUrl;
    }

    // Si c'est un chemin relatif commençant par /, l'utiliser tel quel (peut être un asset statique)
    if (avatarUrl.startsWith("/")) {
      // Pour les images statiques comme /images/avatar1.jpg, on peut les laisser telles quelles
      // car elles sont servies par le serveur frontend
      return avatarUrl;
    }

    // Sinon, supposer que c'est un chemin relatif et ajouter le backend URL
    return backendUrl + "/" + avatarUrl.replace(/^\//, "");
  };

  const getLogoPreviewUrl = (logoUrl) => {
    if (!logoUrl) return null;
    const backendUrl = import.meta.env.VITE_APP_URL_BACKEND || "http://127.0.0.1:8000";

    // Si c'est déjà une URL complète
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      return logoUrl;
    }

    // Si c'est un chemin de storage du backend (commence par /storage/)
    if (logoUrl.startsWith("/storage/")) {
      return backendUrl + logoUrl;
    }

    // Si c'est un chemin relatif commençant par /, l'utiliser tel quel (peut être un asset statique)
    if (logoUrl.startsWith("/")) {
      return logoUrl;
    }

    // Sinon, supposer que c'est un chemin relatif et ajouter le backend URL
    return backendUrl + "/" + logoUrl.replace(/^\//, "");
  };

  // Track des erreurs d'image pour éviter les boucles (index -> bool)
  const avatarErrors = ref({});
  const logoErrors = ref({});

  // Fonction pour déclencher l'input de fichier de manière sûre
  const triggerFileInput = (inputId) => {
    if (typeof document !== "undefined") {
      const input = document.getElementById(inputId);
      if (input) {
        input.click();
      }
    }
  };

  // Gestion des erreurs d'image
  const handleAvatarError = (event, testimonial, index) => {
    // Éviter la boucle infinie : si l'image a déjà été gérée, ne pas réessayer
    if (avatarErrors.value[index]) {
      return;
    }

    console.error("Erreur de chargement de l'avatar:", testimonial.avatar_url);

    // Marquer comme géré pour éviter la boucle
    avatarErrors.value[index] = true;

    // Arrêter la propagation et empêcher les nouveaux essais
    event.stopPropagation();
    event.preventDefault();

    // Empêcher le rechargement de l'image
    const img = event.target;
    img.onerror = null; // Supprimer le handler pour éviter les nouvelles tentatives
    img.src = ""; // Vider le src pour éviter les tentatives de rechargement
    img.style.display = "none";
  };

  const handleLogoError = (event, company, index) => {
    // Éviter la boucle infinie
    if (logoErrors.value[index]) {
      return;
    }

    console.error("Erreur de chargement du logo:", company.logo_url);
    logoErrors.value[index] = true;

    // Arrêter la propagation
    event.stopPropagation();
    event.preventDefault();

    // Empêcher le rechargement
    const img = event.target;
    img.onerror = null;
    img.src = "";
    img.style.display = "none";
  };

  // Fonctions d'upload
  const handleTestimonialAvatarUpload = async (event, index) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier est trop volumineux (max 2MB).");
      event.target.value = "";
      return;
    }

    uploadingAvatar.value[index] = true;
    try {
      await setCsrfToken();

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await adminAxios.post("/api/admin/homepage/upload-testimonial-avatar", formData, {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.avatar_url) {
        homepage.value.testimonials[index].avatar_url = response.data.avatar_url;
        // Réinitialiser l'erreur pour cet index
        avatarErrors.value[index] = false;
        alert("Avatar uploadé avec succès !");
      }
    } catch (error) {
      console.error("Erreur upload avatar:", error);
      alert(error.response?.data?.message || "Erreur lors de l'upload de l'avatar.");
    } finally {
      uploadingAvatar.value[index] = false;
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
      event.target.value = "";
    }
  };

  const handleSocialProofLogoUpload = async (event, index) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier est trop volumineux (max 2MB).");
      event.target.value = "";
      return;
    }

    uploadingLogo.value[index] = true;
    try {
      await setCsrfToken();

      const formData = new FormData();
      formData.append("logo", file);

      const response = await adminAxios.post("/api/admin/homepage/upload-social-proof-logo", formData, {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.logo_url) {
        homepage.value.social_proof[index].logo_url = response.data.logo_url;
        // Réinitialiser l'erreur pour cet index
        logoErrors.value[index] = false;
        alert("Logo uploadé avec succès !");
      }
    } catch (error) {
      console.error("Erreur upload logo:", error);
      alert(error.response?.data?.message || "Erreur lors de l'upload du logo.");
    } finally {
      uploadingLogo.value[index] = false;
      delete adminAxios.defaults.headers.common["X-XSRF-TOKEN"];
      event.target.value = "";
    }
  };

  onMounted(load);
</script>

<style scoped>
  .admin-settings {
    padding: 2rem;
  }
  .settings-section {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 2rem;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .form-group input,
  .form-group textarea {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-family: inherit;
  }
  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  .btn-save {
    background: #2563eb;
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
  }
  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn {
    background: #e5e7eb;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
  }
  .btn-danger {
    background: #ef4444;
    color: #fff;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
  }
  .highlights,
  .faqs-section,
  .testimonials-section,
  .social-proof-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0.5rem 0 1rem;
  }
  .highlight-row {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 0.5rem;
    align-items: center;
  }
  .faq-item,
  .testimonial-item,
  .social-proof-item {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 1rem;
    background: #f9fafb;
  }
  .faq-header,
  .testimonial-header,
  .social-proof-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .section-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }
  .btn-save-section {
    background: #10b981;
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }
  .btn-save-section:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 640px) {
    .section-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .btn-save-section {
      width: 100%;
    }
  }
  h3 {
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #1f2937;
    font-size: 1.25rem;
  }
  @media (max-width: 480px) {
    .admin-settings {
      padding: 0.75rem;
    }
    .highlight-row {
      grid-template-columns: 1fr;
    }
    .faq-header,
    .testimonial-header,
    .social-proof-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
  }
</style>
