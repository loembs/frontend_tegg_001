# ✅ Checklist Migration vers Supabase

## 🎯 Vue d'ensemble

Migration complète de Tëgg Platform vers Supabase (Project ID: `bzgxtsepphljwqsbvtds`)

---

## 📦 Étape 1: Préparation

### Environnement
- [ ] Libérer de l'espace disque (minimum 2 GB)
- [ ] Node.js 18+ installé
- [ ] npm 9+ installé

### Fichiers de sauvegarde
- [ ] Sauvegarder `.env` actuel
- [ ] Commit les changements en cours
- [ ] Créer une branche de backup

```bash
git checkout -b backup-before-supabase
git add .
git commit -m "Backup avant migration Supabase"
git checkout main
```

---

## 📥 Étape 2: Installation

### Dépendances
- [ ] Installer le client Supabase

```bash
npm install @supabase/supabase-js
```

**En cas d'erreur ENOSPC (disque plein):**
1. Vider la corbeille Windows
2. Supprimer les fichiers temporaires: `%temp%`
3. Désinstaller les programmes inutiles
4. Réessayer l'installation

---

## 🗄️ Étape 3: Configuration Supabase

### Création du projet
- [ ] Se connecter sur https://supabase.com
- [ ] Sélectionner/Créer le projet `tegg_plateforme`
- [ ] Notez l'URL du projet

### Schéma de base de données
- [ ] Aller dans SQL Editor
- [ ] Copier le contenu de `supabase/schema.sql`
- [ ] Exécuter le script
- [ ] Vérifier que toutes les tables sont créées

### Configuration Auth
- [ ] Authentication > Providers > Email
- [ ] Activer "Enable Email provider"
- [ ] Désactiver "Confirm email" (pour tests)
- [ ] Désactiver "Double opt-in"

### Clés API
- [ ] Settings > API
- [ ] Copier le `Project URL`
- [ ] Copier le `anon public key`

---

## 🔧 Étape 4: Configuration Application

### Variables d'environnement
- [ ] Copier `.env.example` vers `.env`
- [ ] Remplir `VITE_SUPABASE_URL`
- [ ] Remplir `VITE_SUPABASE_ANON_KEY`

```env
VITE_SUPABASE_URL=https://bzgxtsepphljwqsbvtds.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_ici
```

### Mise à jour du code

**Option A - Remplacement complet:**
- [ ] Copier `src/App.supabase.tsx` vers `src/App.tsx`
- [ ] Remplacer les imports `useApp` par `useSupabaseApp`
- [ ] Remplacer `AppProvider` par `SupabaseAppProvider`

**Option B - Feature Flag:**
- [ ] Ajouter `VITE_USE_SUPABASE=true` dans `.env`
- [ ] Implémenter la logique de basculement

---

## 👤 Étape 5: Compte Admin

### Création du compte
- [ ] Créer le compte via l'interface d'auth
- [ ] Récupérer l'UUID depuis les logs ou le dashboard
- [ ] Exécuter le SQL pour créer le profil admin:

```sql
INSERT INTO profiles (id, email, phone, first_name, last_name, role, is_active, is_validated)
VALUES ('UUID_FROM_AUTH', 'admin@tegg.sn', '+221771234567', 'Admin', 'Tëgg', 'admin', true, true);
```

- [ ] Tester la connexion admin

---

## 🧪 Étape 6: Tests

### Inscription
- [ ] Créer un compte client
- [ ] Créer un compte artisan
- [ ] Vérifier les profils dans le dashboard Supabase

### Connexion
- [ ] Se connecter en tant que client
- [ ] Se connecter en tant qu'artisan
- [ ] Se connecter en tant qu'admin

### Fonctionnalités Client
- [ ] Créer une demande de service
- [ ] Voir les demandes en cours
- [ ] Noter un artisan

### Fonctionnalités Artisan
- [ ] Voir les demandes disponibles
- [ ] Accepter une demande
- [ ] Mettre à jour la position
- [ ] Effectuer un dépôt
- [ ] Demander un retrait

### Fonctionnalités Admin
- [ ] Voir le dashboard
- [ ] Valider un artisan
- [ ] Bloquer un artisan
- [ ] Traiter une demande de retrait

---

## 🚀 Étape 7: Déploiement

### Build
- [ ] `npm run build`
- [ ] Vérifier que le build réussit

### Déploiement
**Vercel:**
- [ ] Connecter le projet Vercel
- [ ] Ajouter les variables d'environnement
- [ ] Déployer

**Netlify:**
- [ ] Connecter le projet Netlify
- [ ] Ajouter les variables d'environnement
- [ ] Déployer

### Post-déploiement
- [ ] Tester en production
- [ ] Vérifier les logs Supabase
- [ ] Surveiller les performances

---

## 📊 Étape 8: Monitoring

### Tableau de bord Supabase
- [ ] Surveiller les connexions
- [ ] Vérifier les requêtes API
- [ ] Surveiller la taille de la base de données

### Alertes
- [ ] Configurer les alertes de quota
- [ ] Configurer les alertes d'erreurs

---

## 🔄 Rollback (si problème)

```bash
# Restaurer l'ancienne version
git checkout backup-before-supabase
git checkout main -- .env
npm install
npm run dev
```

---

## 📞 Support

- [ ] Guide d'installation: `supabase/setup-guide.md`
- [ ] README: `README-SUPABASE.md`
- [ ] Documentation Supabase: https://supabase.com/docs

---

**Cochez chaque case une fois complétée! ✅**
