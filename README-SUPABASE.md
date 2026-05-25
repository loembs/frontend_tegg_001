# Tëgg Platform - Intégration Supabase

Vue d'ensemble de l'intégration Supabase pour la plateforme Tëgg.

## 📁 Fichiers créés

```
frontend/
├── src/
│   ├── lib/
│   │   └── supabaseClient.ts        # Client Supabase + Types TypeScript
│   ├── services/
│   │   └── supabase.ts              # Service complet pour Supabase
│   ├── context/
│   │   └── SupabaseAppContext.tsx   # Context React avec Supabase
│   ├── hooks/
│   │   └── useSupabaseAuth.ts       # Hook d'authentification
│   └── App.supabase.tsx             # Version App.tsx pour Supabase
├── supabase/
│   ├── schema.sql                   # Schéma de base de données complet
│   ├── migration-utilities.ts       # Outils de migration
│   └── setup-guide.md               # Guide détaillé d'installation
└── .env.example                     # Variables d'environnement mises à jour
```

## 🚀 Démarrage rapide

### 1. Installer le client Supabase

```bash
npm install @supabase/supabase-js
```

### 2. Configurer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez ou sélectionnez le projet `tegg_plateforme`
3. Exécutez le fichier `supabase/schema.sql` dans le SQL Editor

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Editez `.env` avec vos clés Supabase:
```env
VITE_SUPABASE_URL=https://bzgxtsepphljwqsbvtds.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_ici
```

### 4. Mettre à jour App.tsx

Option 1 - Remplacer complètement:
```bash
cp src/App.supabase.tsx src/App.tsx
```

Option 2 - Migration progressive (voir ci-dessous)

## 🔄 Options de migration

### Option A: Remplacement complet

Remplacez les imports dans vos fichiers:

```tsx
// Avant
import { AppProvider, useApp } from './context/AppContext';

// Après
import { SupabaseAppProvider, useSupabaseApp } from './context/SupabaseAppContext';
```

### Option B: Feature Flag

Utilisez une variable d'environnement pour basculer:

```tsx
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

export const AppProvider = USE_SUPABASE ? SupabaseAppProvider : OriginalAppProvider;
export const useApp = USE_SUPABASE ? useSupabaseApp : useOriginalApp;
```

## 📊 Structure de la base de données

### Tables principales

- **profiles**: Utilisateurs (clients, artisans, admins)
- **service_requests**: Demandes de service
- **notifications**: Notifications utilisateurs
- **transactions**: Transactions financières
- **withdrawal_requests**: Demandes de retrait
- **reviews**: Avis clients
- **categories**: Catégories de services
- **subcategories**: Sous-catégories

### Vues

- **available_artisans**: Artisans en ligne et disponibles
- **dashboard_stats**: Statistiques globales

### Fonctions RPC

- `refund_artisan_provision()`: Rembourser un artisan
- `update_artisan_rating()`: Mettre à jour la note d'un artisan
- `get_available_requests()`: Rechercher des demandes disponibles

## 🔐 Sécurité (RLS)

Les politiques Row Level Security sont configurées pour:

- ✅ Les utilisateurs ne peuvent voir/modifier que leurs propres données
- ✅ Les administrateurs ont accès à toutes les données
- ✅ Les données sensibles (balance, etc.) sont protégées

## 🧪 Tester

Après configuration, testez les fonctionnalités:

1. **Inscription**: Créez un compte client et un compte artisan
2. **Connexion**: Vérifiez que la connexion fonctionne
3. **Création de demande**: Créez une demande de service en tant que client
4. **Acceptation**: Acceptez la demande en tant qu'artisan
5. **Notifications**: Vérifiez que les notifications fonctionnent

## 📚 Documentation

- [Guide d'installation détaillé](./supabase/setup-guide.md)
- [Documentation Supabase](https://supabase.com/docs)
- [Dashboard](https://supabase.com/dashboard/project/bzgxtsepphljwqsbvtds)

## 🆘 Support

Pour toute question sur l'intégration:
1. Vérifiez le [guide d'installation](./supabase/setup-guide.md)
2. Consultez les logs du navigateur
3. Vérifiez les politiques RLS dans le dashboard Supabase
