# Guide de Migration vers Supabase - Tëgg Platform

## 📋 Vue d'ensemble

Ce guide vous accompagne dans la migration de votre plateforme Tëgg vers Supabase comme backend.

**Informations du projet:**
- Project ID: `bzgxtsepphljwqsbvtds`
- Project URL: `https://bzgxtsepphljwqsbvtds.supabase.co`
- Project Name: `tegg_plateforme`

---

## 🔧 Étape 1: Installation des dépendances

```bash
npm install @supabase/supabase-js
```

**Note:** Si vous rencontrez une erreur d'espace disque, libérez de l'espace puis réessayez.

---

## 🗄️ Étape 2: Configuration du projet Supabase

### 2.1 Créer le projet sur Supabase

1. Allez sur https://supabase.com
2. Créez un nouveau projet ou sélectionnez `tegg_plateforme`
3. Notez vos clés API depuis **Settings > API**

### 2.2 Exécuter le schéma SQL

1. Dans le dashboard Supabase, allez dans **SQL Editor**
2. Copiez le contenu du fichier `supabase/schema.sql`
3. Exécutez le script SQL

Cela créera:
- ✅ Tables: `profiles`, `categories`, `subcategories`, `service_requests`, `notifications`, `transactions`, `withdrawal_requests`, `reviews`
- ✅ Types énumérés
- ✅ Index pour les performances
- ✅ Row Level Security (RLS)
- ✅ Fonctions RPC
- ✅ Vues utiles
- ✅ Données initiales (catégories)

### 2.3 Récupérer les clés API

Dans **Settings > API**, copiez:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon/public` key → `VITE_SUPABASE_ANON_KEY`

---

## 🔐 Étape 3: Configuration de l'authentification Supabase

### 3.1 Configurer les providers

Dans **Authentication > Providers**:

1. **Email**:
   - ✅ Activer "Enable Email provider"
   - ✅ "Confirm email" = OFF (mode démo)
   - ✅ "Double opt-in" = OFF

2. **Phone** (optionnel - pour SMS OTP):
   - Activer si vous avez un provider SMS (Twilio, etc.)

### 3.2 Créer le compte admin par défaut

```sql
-- Dans le SQL Editor, exécutez:
-- Remplacez 'YOUR_ADMIN_ID' par l'UUID du compte créé via l'interface

INSERT INTO profiles (id, email, phone, first_name, last_name, role, is_active, is_validated)
VALUES (
  'YOUR_ADMIN_ID',
  'admin@tegg.sn',
  '+221771234567',
  'Admin',
  'Tëgg',
  'admin',
  true,
  true
);
```

---

## 📝 Étape 4: Configuration des variables d'environnement

1. Copiez `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Remplissez les valeurs Supabase:
```env
VITE_SUPABASE_URL=https://bzgxtsepphljwqsbvtds.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_ici
```

---

## 🔄 Étape 5: Migrer le code

### Option A: Remplacer complètement l'API

1. Dans `src/main.tsx`, remplacez:
```tsx
import { AppProvider } from './context/AppContext';
```
par:
```tsx
import { SupabaseAppProvider } from './context/SupabaseAppContext';
```

2. Remplacez `<AppProvider>` par `<SupabaseAppProvider>`:

```tsx
// Avant
root.render(
  <AppProvider>
    <App />
  </AppProvider>
);

// Après
root.render(
  <SupabaseAppProvider>
    <App />
  </SupabaseAppProvider>
);
```

3. Remplacez tous les `useApp()` par `useSupabaseApp()` dans vos composants

### Option B: Migration progressive

Gardez les deux contextes et basculez selon une feature flag:

```tsx
const USE_SUPABASE = true;

export const AppProvider = USE_SUPABASE ? SupabaseAppProvider : OriginalAppProvider;
export const useApp = USE_SUPABASE ? useSupabaseApp : useOriginalApp;
```

---

## 🧪 Étape 6: Tester

### 6.1 Créer des comptes de test

**Client test:**
- Phone: `+221771111111`
- Password: `test123`
- Role: Client

**Artisan test:**
- Phone: `+221772222222`
- Password: `test123`
- Role: Artisan
- Category: Électricité

### 6.2 Vérifier les fonctionnalités

- ✅ Inscription client/artisan
- ✅ Connexion
- ✅ Création de demande de service
- ✅ Liste des demandes disponibles (artisan)
- ✅ Acceptation d'une demande
- ✅ Notifications
- ✅ Dépôt de solde
- ✅ Validation artisan (admin)

---

## 📊 Étape 7: Row Level Security (RLS)

Le schéma inclut des politiques RLS basiques. Pour la production, ajustez-les selon vos besoins:

### Exemple: Rendre les demandes visibles par tous
```sql
DROP POLICY IF EXISTS "Service Requests: Public read" ON service_requests;
CREATE POLICY "Service Requests: Public read" ON service_requests
  FOR SELECT USING (true);
```

### Exemple: Admin peut tout faire
```sql
CREATE POLICY "Admin all access" ON service_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
```

---

## 🚀 Étape 8: Déploiement

### Mettre à jour les variables d'environnement en production

Dans votre plateforme de déploiement (Vercel, Netlify, etc.):

1. Ajoutez les variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Rebuild et deploy

---

## 📁 Structure des fichiers créés

```
frontend/
├── src/
│   ├── lib/
│   │   └── supabaseClient.ts       # Client Supabase configuré
│   ├── services/
│   │   ├── api.ts                  # Ancien service (à supprimer)
│   │   └── supabase.ts             # Nouveau service Supabase
│   └── context/
│       ├── AppContext.tsx          # Ancien context (à supprimer)
│       └── SupabaseAppContext.tsx  # Nouveau context Supabase
├── supabase/
│   ├── schema.sql                  # Schéma de base de données
│   └── setup-guide.md              # Ce guide
├── .env.example                    # Variables d'environnement
└── package.json                    # Dépendances (à jour)
```

---

## 🔍 Checklist de migration

- [ ] Installer `@supabase/supabase-js`
- [ ] Créer/configurer le projet Supabase
- [ ] Exécuter le schéma SQL
- [ ] Configurer l'authentification
- [ ] Créer le compte admin
- [ ] Configurer `.env`
- [ ] Mettre à jour `main.tsx`
- [ ] Tester les fonctionnalités
- [ ] Supprimer l'ancien code API
- [ ] Déployer en production

---

## 🆘 Support

### Problèmes courants

**"Invalid API Key"**
- Vérifiez que `VITE_SUPABASE_ANON_KEY` est correcte dans `.env`
- Redémarrez le serveur de développement après modification

**"Row Level Security policy violation"**
- Vérifiez les politiques RLS dans le dashboard Supabase
- Utilisez le SQL Editor pour ajuster les politiques

**Auth ne fonctionne pas**
- Vérifiez que l'auth email est activée
- Désactivez "Confirm email" pour les tests

### Liens utiles

- [Documentation Supabase](https://supabase.com/docs)
- [Dashboard Supabase](https://supabase.com/dashboard)
- [Schema SQL Reference](https://supabase.com/docs/guides/database)

---

**Félicitations!** Votre plateforme Tëgg utilise maintenant Supabase comme backend. 🎉
