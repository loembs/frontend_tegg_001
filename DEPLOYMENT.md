# 🚀 Guide de Déploiement Tëgg

## Architecture de Production

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📱 App Mobile (PWA)          💻 Dashboard Admin (Web)          │
│  https://app.tegg.sn          https://admin.tegg.sn             │
│         │                              │                         │
│         └──────────┬───────────────────┘                         │
│                    │                                             │
│                    ▼                                             │
│         ┌─────────────────────┐                                  │
│         │   🔌 API Backend    │                                  │
│         │  https://api.tegg.sn │                                  │
│         │   (Node.js/Express) │                                  │
│         └──────────┬──────────┘                                  │
│                    │                                             │
│                    ▼                                             │
│         ┌─────────────────────┐                                  │
│         │  🗄️ PostgreSQL DB   │                                  │
│         │   (Port 5432)       │                                  │
│         └─────────────────────┘                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prérequis

### Logiciels à installer

| Logiciel | Version | Téléchargement |
|----------|---------|----------------|
| Node.js | 18+ LTS | https://nodejs.org/ |
| PostgreSQL | 15+ | https://www.postgresql.org/download/ |
| Git | Latest | https://git-scm.com/ |
| VS Code | Latest | https://code.visualstudio.com/ |

### Outils optionnels
- **pgAdmin 4** : Interface graphique pour PostgreSQL
- **Postman** : Tester les API
- **ngrok** : Exposer l'API locale pour tester sur mobile

---

## 🗄️ ÉTAPE 1 : Configuration de la Base de Données

### 1.1 Installer PostgreSQL

**Windows :**
1. Télécharger depuis https://www.postgresql.org/download/windows/
2. Exécuter l'installateur
3. Mot de passe pour l'utilisateur `postgres` : notez-le !
4. Port par défaut : 5432

**macOS :**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian) :**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.2 Créer la base de données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Ou sur Windows (dans le terminal PostgreSQL)
psql -U postgres
```

```sql
-- Créer l'utilisateur
CREATE USER tegg_user WITH PASSWORD 'TeggSecure2024!';

-- Créer la base de données
CREATE DATABASE tegg_db OWNER tegg_user;

-- Donner les privilèges
GRANT ALL PRIVILEGES ON DATABASE tegg_db TO tegg_user;

-- Quitter
\q
```

### 1.3 Exécuter le script SQL

```bash
# Se connecter à la base tegg_db
psql -U tegg_user -d tegg_db -h localhost

# Ou exécuter directement le script
psql -U tegg_user -d tegg_db -h localhost -f backend/database/schema.sql
```

---

## 🔌 ÉTAPE 2 : Configuration du Backend API

### 2.1 Installer les dépendances

```bash
# Aller dans le dossier backend
cd backend

# Installer les packages
npm install
```

### 2.2 Configurer les variables d'environnement

Créer le fichier `backend/.env` :

```env
# Serveur
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tegg_db
DB_USER=tegg_user
DB_PASSWORD=TeggSecure2024!

# JWT Secret (générer un secret unique)
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_2024
JWT_EXPIRES_IN=7d

# Wave API (à configurer avec vos identifiants Wave)
WAVE_API_KEY=your_wave_api_key
WAVE_API_SECRET=your_wave_api_secret
WAVE_MERCHANT_ID=your_merchant_id

# SMS OTP (Twilio ou autre)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+221XXXXXXXX

# Frontend URLs
MOBILE_APP_URL=http://localhost:5173
ADMIN_DASHBOARD_URL=http://localhost:5173?admin=true
```

### 2.3 Lancer le serveur API

```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Le serveur API démarre sur `http://localhost:3001`

### 2.4 Tester l'API

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3001/api/health

# Réponse attendue:
# {"status":"ok","timestamp":"...","database":"connected"}
```

---

## 📱 ÉTAPE 3 : Configuration du Frontend

### 3.1 Installer les dépendances

```bash
# À la racine du projet
npm install
```

### 3.2 Configurer l'URL de l'API

Créer le fichier `.env.local` à la racine :

```env
VITE_API_URL=http://localhost:3001/api
```

### 3.3 Lancer le frontend

```bash
# Mode développement
npm run dev

# Le frontend démarre sur http://localhost:5173
```

---

## 📲 ÉTAPE 4 : Tester sur Mobile (PWA)

### Option A : Réseau Local (WiFi)

1. **Trouver votre IP locale :**
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig | grep inet
   ```
   Exemple : `192.168.1.100`

2. **Lancer avec l'IP locale :**
   ```bash
   # Backend
   cd backend
   npm run dev
   # API disponible sur http://192.168.1.100:3001
   
   # Frontend (nouveau terminal)
   npm run dev -- --host
   # App disponible sur http://192.168.1.100:5173
   ```

3. **Sur votre téléphone :**
   - Connectez-vous au même WiFi
   - Ouvrez Chrome/Safari
   - Allez sur `http://192.168.1.100:5173`

### Option B : ngrok (Accès externe)

1. **Installer ngrok :**
   ```bash
   npm install -g ngrok
   ```

2. **Exposer l'API :**
   ```bash
   ngrok http 3001
   # Note l'URL: https://xxxx.ngrok.io
   ```

3. **Mettre à jour `.env.local` :**
   ```env
   VITE_API_URL=https://xxxx.ngrok.io/api
   ```

4. **Exposer le frontend :**
   ```bash
   ngrok http 5173
   # Utilisez cette URL sur votre mobile
   ```

### Option C : Installer comme PWA

1. Ouvrez l'app sur votre mobile (Chrome Android ou Safari iOS)
2. **Android :** Menu ⋮ → "Ajouter à l'écran d'accueil"
3. **iOS :** Bouton Partager → "Sur l'écran d'accueil"

---

## 💻 ÉTAPE 5 : Dashboard Admin

### Accès local
- URL : `http://localhost:5173?admin=true`
- Ou : `http://localhost:5173/admin`

### Identifiants de test
- **Téléphone :** +221 33 800 00 00
- **Mot de passe :** admin

---

## 🚀 ÉTAPE 6 : Déploiement Production

### Option A : VPS (Recommandé pour l'Afrique)

**Fournisseurs recommandés :**
- OVH (datacenter en France)
- DigitalOcean
- Vultr
- AWS Lightsail

**Configuration serveur :**
```bash
# Ubuntu 22.04 LTS
# Minimum: 2 vCPU, 4GB RAM, 50GB SSD

# Installer les dépendances
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql nginx certbot

# Installer PM2 pour gérer Node.js
sudo npm install -g pm2

# Cloner le projet
git clone https://github.com/votre-repo/tegg.git
cd tegg

# Backend
cd backend
npm install
pm2 start npm --name "tegg-api" -- start

# Frontend (build)
cd ..
npm install
npm run build

# Copier le build vers nginx
sudo cp -r dist/* /var/www/tegg/
```

**Configuration Nginx :**
```nginx
# /etc/nginx/sites-available/tegg

# API Backend
server {
    listen 80;
    server_name api.tegg.sn;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# App Mobile
server {
    listen 80;
    server_name app.tegg.sn;
    root /var/www/tegg;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Dashboard Admin
server {
    listen 80;
    server_name admin.tegg.sn;
    root /var/www/tegg;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**SSL avec Let's Encrypt :**
```bash
sudo certbot --nginx -d api.tegg.sn -d app.tegg.sn -d admin.tegg.sn
```

### Option B : Vercel + Railway

**Frontend (Vercel) :**
```bash
npm install -g vercel
vercel --prod
```

**Backend (Railway) :**
1. Connectez votre repo GitHub à Railway
2. Ajoutez un service PostgreSQL
3. Configurez les variables d'environnement

---

## 🔒 Sécurité Production

### Checklist
- [ ] Changer tous les mots de passe par défaut
- [ ] Générer un nouveau JWT_SECRET (64 caractères minimum)
- [ ] Activer HTTPS (SSL/TLS)
- [ ] Configurer les CORS correctement
- [ ] Activer le rate limiting
- [ ] Configurer les backups PostgreSQL
- [ ] Mettre en place le monitoring (PM2, Sentry)

### Générer un JWT Secret sécurisé
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📞 Support

Pour toute question ou problème :
- Email : support@tegg.sn
- Documentation API : http://api.tegg.sn/docs

---

## 📝 Commandes Utiles

```bash
# Logs du backend
pm2 logs tegg-api

# Redémarrer l'API
pm2 restart tegg-api

# Status des services
pm2 status

# Backup de la base de données
pg_dump -U tegg_user tegg_db > backup_$(date +%Y%m%d).sql

# Restaurer un backup
psql -U tegg_user tegg_db < backup_20240115.sql
```
