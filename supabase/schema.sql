-- ============================================================================
-- SCÈMA SUPABASE POUR TËGG PLATEFORME
-- Project ID: bzgxtsepphljwqsbvtds
-- ============================================================================

-- Activer l'extension UUID si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TYPES ENUMÉRÉS
-- ============================================================================

-- Rôles utilisateur
CREATE TYPE user_role AS ENUM ('client', 'artisan', 'admin');

-- Catégories de service
CREATE TYPE service_category AS ENUM ('electricite', 'froid', 'plomberie', 'menuiserie', 'peinture');

-- Types de service
CREATE TYPE service_type AS ENUM ('installation', 'reparation');

-- Statuts de demande
CREATE TYPE request_status AS ENUM ('en_attente', 'en_cours', 'terminee', 'annulee');

-- Types de notification
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Types de transaction
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'earning', 'commission', 'refund');

-- Statuts de retrait
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================================
-- TABLE: PROFILES (Utilisateurs)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'client',

  -- Profil
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_validated BOOLEAN DEFAULT false,

  -- Champs Artisan
  category service_category,
  sub_categories TEXT[],
  rating DECIMAL(2,1) DEFAULT 0,
  total_missions INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0,
  balance_threshold INTEGER DEFAULT 5000,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_online BOOLEAN DEFAULT false,

  -- Champs Client
  client_type TEXT DEFAULT 'particulier',
  address TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches courantes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_category ON profiles(category) WHERE role = 'artisan';
CREATE INDEX idx_profiles_is_online ON profiles(is_online) WHERE role = 'artisan' AND is_active = true;
CREATE INDEX idx_profiles_location ON profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- TABLE: CATEGORIES
-- ============================================================================
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Insérer les catégories par défaut
INSERT INTO categories (id, name, name_en, icon, color, order_index) VALUES
  ('electricite', 'Électricité', 'Electricity', 'Zap', 'amber', 1),
  ('froid', 'Froid', 'Refrigeration', 'Snowflake', 'blue', 2),
  ('plomberie', 'Plomberie', 'Plumbing', 'Wrench', 'emerald', 3),
  ('menuiserie', 'Menuiserie', 'Carpentry', 'Hammer', 'purple', 4),
  ('peinture', 'Peinture', 'Painting', 'Paintbrush', 'pink', 5);

-- ============================================================================
-- TABLE: SUBCATEGORIES
-- ============================================================================
CREATE TABLE subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Sous-catégories par défaut
INSERT INTO subcategories (id, category_id, name, name_en, icon, order_index) VALUES
  -- Électricité
  ('elec_installation', 'electricite', 'Installation', 'Installation', 'Zap', 1),
  ('elec_reparation', 'electricite', 'Réparation', 'Repair', 'Wrench', 2),
  ('elec_domotique', 'electricite', 'Domotique', 'HomeAutomation', 'Smartphone', 3),
  -- Froid
  ('froid_install', 'froid', 'Installation', 'Installation', 'Snowflake', 1),
  ('froid_repair', 'froid', 'Réparation', 'Repair', 'Wrench', 2),
  ('froid_maintenance', 'froid', 'Maintenance', 'Maintenance', 'Settings', 3),
  -- Plomberie
  ('plomb_install', 'plomberie', 'Installation', 'Installation', 'Wrench', 1),
  ('plomb_repair', 'plomberie', 'Réparation', 'Repair', 'Wrench', 2),
  ('plomb_drainage', 'plomberie', 'Drainage', 'Drainage', 'Droplet', 3),
  -- Menuiserie
  ('menu_furniture', 'menuiserie', 'Mobilier', 'Furniture', 'Armchair', 1),
  ('menu_doors', 'menuiserie', 'Portes/Fenêtres', 'Doors/Windows', 'Door', 2),
  ('menu_custom', 'menuiserie', 'Sur mesure', 'Custom', 'Ruler', 3),
  -- Peinture
  ('peint_interior', 'peinture', 'Intérieur', 'Interior', 'Paintbrush', 1),
  ('peint_exterior', 'peinture', 'Extérieur', 'Exterior', 'Paintbrush', 2),
  ('peint_decorative', 'peinture', 'Décorative', 'Decorative', 'Sparkles', 3);

-- ============================================================================
-- TABLE: SERVICE_REQUESTS (Demandes de service)
-- ============================================================================
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Client
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,

  -- Service
  category service_category NOT NULL,
  sub_category TEXT,
  service_type service_type NOT NULL DEFAULT 'installation',
  element_count INTEGER DEFAULT 1,
  description TEXT NOT NULL,

  -- Localisation
  address TEXT NOT NULL,
  quartier TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_urgent BOOLEAN DEFAULT false,

  -- Statut
  status request_status DEFAULT 'en_attente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Artisan assigné
  artisan_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  artisan_name TEXT,
  artisan_phone TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Finalisation
  completed_at TIMESTAMP WITH TIME ZONE,
  artisan_amount INTEGER,
  client_amount INTEGER,
  commission INTEGER,
  client_validated BOOLEAN DEFAULT false,
  artisan_validated BOOLEAN DEFAULT false
);

-- Index pour les recherches
CREATE INDEX idx_requests_status ON service_requests(status);
CREATE INDEX idx_requests_client ON service_requests(client_id);
CREATE INDEX idx_requests_artisan ON service_requests(artisan_id) WHERE artisan_id IS NOT NULL;
CREATE INDEX idx_requests_category ON service_requests(category);
CREATE INDEX idx_requests_created ON service_requests(created_at DESC);

-- ============================================================================
-- TABLE: NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = false;

-- ============================================================================
-- TABLE: TRANSACTIONS
-- ============================================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference TEXT,
  payment_method TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_reference ON transactions(reference) WHERE reference IS NOT NULL;

-- ============================================================================
-- TABLE: WITHDRAWAL_REQUESTS (Demandes de retrait)
-- ============================================================================
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artisan_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  artisan_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status withdrawal_status DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  payment_reference TEXT
);

CREATE INDEX idx_withdrawals_artisan ON withdrawal_requests(artisan_id, requested_at DESC);
CREATE INDEX idx_withdrawals_status ON withdrawal_requests(status);

-- ============================================================================
-- TABLE: REVIEWS (Avis)
-- ============================================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(request_id)
);

CREATE INDEX idx_reviews_artisan ON reviews(artisan_id, created_at DESC);
CREATE INDEX idx_reviews_client ON reviews(client_id);

-- ============================================================================
-- FONCTIONS ET TRIGGERS
-- ============================================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FONCTIONS RPC (Remote Procedure Calls)
-- ============================================================================

-- Rembourser la provision d'un artisan
CREATE OR REPLACE FUNCTION refund_artisan_provision(
  request_id UUID,
  artisan_id UUID,
  amount INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Créditer le solde de l'artisan
  UPDATE profiles
  SET balance = balance + amount
  WHERE id = artisan_id;

  -- Enregistrer la transaction
  INSERT INTO transactions (user_id, type, amount, balance_after, description)
  SELECT
    artisan_id,
    'refund',
    amount,
    p.balance,
    'Remboursement provision pour demande annulée: ' || request_id
  FROM profiles p
  WHERE id = artisan_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour la note d'un artisan
CREATE OR REPLACE FUNCTION update_artisan_rating(
  p_artisan_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  avg_rating DECIMAL;
  total_count INTEGER;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO avg_rating, total_count
  FROM reviews
  WHERE artisan_id = p_artisan_id;

  UPDATE profiles
  SET rating = ROUND(avg_rating * 10) / 10,
      total_missions = total_count
  WHERE id = p_artisan_id;

  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtenir les demandes disponibles pour un artisan
CREATE OR REPLACE FUNCTION get_available_requests(
  p_category service_category DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_max_distance INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  category service_category,
  description TEXT,
  address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  is_urgent BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.client_id,
    sr.client_name,
    sr.client_phone,
    sr.category,
    sr.description,
    sr.address,
    sr.latitude,
    sr.longitude,
    sr.is_urgent,
    sr.created_at
  FROM service_requests sr
  WHERE sr.status = 'en_attente'
    AND (p_category IS NULL OR sr.category = p_category)
    AND sr.artisan_id IS NULL
  ORDER BY sr.is_urgent DESC, sr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- POLITIQUES RLS

-- Profiles: Tout le monde peut lire, seul le propriétaire peut modifier
CREATE POLICY "Profiles: Public read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Profiles: Update own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles: Insert authenticated" ON profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Service Requests: Public read, gestion par clients/artisans
CREATE POLICY "Service Requests: Public read" ON service_requests
  FOR SELECT USING (true);

CREATE POLICY "Service Requests: Client insert" ON service_requests
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Service Requests: Client update own" ON service_requests
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = artisan_id);

-- Notifications: Seul l'utilisateur peut voir/ses notifications
CREATE POLICY "Notifications: Read own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notifications: Insert authenticated" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Notifications: Update own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Transactions: Seul l'utilisateur peut voir ses transactions
CREATE POLICY "Transactions: Read own" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Transactions: Insert authenticated" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Withdrawal Requests: Les artisans peuvent voir leurs demandes
CREATE POLICY "Withdrawals: Read own" ON withdrawal_requests
  FOR SELECT USING (auth.uid() = artisan_id);

CREATE POLICY "Withdrawals: Insert artisan" ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = artisan_id);

CREATE POLICY "Withdrawals: Admin update" ON withdrawal_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Reviews: Public read, insert par client
CREATE POLICY "Reviews: Public read" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Reviews: Insert client" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- ============================================================================
-- DONNÉES INITIALES
-- ============================================================================

-- Créer un admin par défaut (mot de passe: admin123)
-- Note: Ce compte doit être créé via l'interface Supabase Auth
-- Ensuite, exécuter:
-- INSERT INTO profiles (id, email, phone, first_name, last_name, role, is_active, is_validated)
-- VALUES ('UUID_FROM_AUTH', 'admin@tegg.sn', '+221000000000', 'Admin', 'Tëgg', 'admin', true, true);

-- ============================================================================
-- VUES UTILES
-- ============================================================================

-- Vue: Artisans disponibles
CREATE VIEW available_artisans AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.category,
  p.rating,
  p.total_missions,
  p.is_online,
  p.latitude,
  p.longitude
FROM profiles p
WHERE p.role = 'artisan'
  AND p.is_active = true
  AND p.is_online = true
  AND p.is_validated = true;

-- Vue: Statistiques dashboard
CREATE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'artisan') AS total_artisans,
  (SELECT COUNT(*) FROM profiles WHERE role = 'artisan' AND is_online = true) AS active_artisans,
  (SELECT COUNT(*) FROM profiles WHERE role = 'artisan' AND NOT is_validated) AS pending_validation,
  (SELECT COUNT(*) FROM profiles WHERE role = 'client') AS total_clients,
  (SELECT COUNT(*) FROM service_requests) AS total_requests,
  (SELECT COUNT(*) FROM service_requests WHERE status = 'en_attente') AS pending_requests,
  (SELECT COUNT(*) FROM service_requests WHERE status = 'en_cours') AS active_requests,
  (SELECT COUNT(*) FROM service_requests WHERE status = 'terminee') AS completed_requests;

-- ============================================================================
-- FIN DU SCHÉMA
-- ============================================================================
