-- ============================================
-- TËGG - Script de Base de Données PostgreSQL
-- Version: 1.0.0
-- Date: 2024
-- ============================================

-- Suppression des tables existantes (ordre inverse des dépendances)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS commission_logs CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS service_items CASCADE;
DROP TABLE IF EXISTS service_subcategories CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS artisan_categories CASCADE;
DROP TABLE IF EXISTS artisans CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS otp_codes CASCADE;

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TYPES ÉNUMÉRÉS
-- ============================================

-- Type d'utilisateur
CREATE TYPE user_type AS ENUM ('client', 'artisan', 'admin');

-- Statut de l'utilisateur
CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked', 'suspended');

-- Type de service
CREATE TYPE service_type AS ENUM ('installation', 'reparation');

-- Statut de la demande
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Statut de la mission
CREATE TYPE mission_status AS ENUM ('accepted', 'in_progress', 'artisan_completed', 'client_confirmed', 'completed', 'disputed');

-- Statut du litige
CREATE TYPE dispute_status AS ENUM ('open', 'investigating', 'resolved', 'closed');

-- Statut du retrait
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- Type de notification
CREATE TYPE notification_type AS ENUM (
    'new_request', 
    'request_accepted', 
    'mission_completed', 
    'payment_received',
    'low_balance',
    'withdrawal_approved',
    'dispute_opened',
    'rating_received',
    'system'
);

-- ============================================
-- TABLE: users (table de base pour tous les utilisateurs)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    user_type user_type NOT NULL,
    status user_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_phone CHECK (phone ~ '^\+221[0-9]{9}$')
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- TABLE: otp_codes (codes de vérification)
-- ============================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'verification', -- verification, password_reset
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_otp_phone CHECK (phone ~ '^\+221[0-9]{9}$')
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- ============================================
-- TABLE: admins
-- ============================================
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'super_admin', -- super_admin, admin, moderator
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: clients (demandeurs)
-- ============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    photo_url VARCHAR(500),
    client_type VARCHAR(20) DEFAULT 'particulier', -- particulier, entreprise
    company_name VARCHAR(255),
    default_address_id UUID,
    total_requests INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_user ON clients(user_id);

-- ============================================
-- TABLE: artisans
-- ============================================
CREATE TABLE artisans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    photo_url VARCHAR(500),
    bio TEXT,
    
    -- Localisation
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    
    -- Finances
    balance DECIMAL(12, 2) DEFAULT 0.00,
    balance_threshold DECIMAL(12, 2) DEFAULT 1000.00, -- Seuil d'alerte
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Statistiques
    rating DECIMAL(3, 2) DEFAULT 5.00,
    total_reviews INTEGER DEFAULT 0,
    total_missions INTEGER DEFAULT 0,
    completed_missions INTEGER DEFAULT 0,
    
    -- Validation
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES admins(id),
    
    -- Documents (URLs)
    id_card_url VARCHAR(500),
    certificate_url VARCHAR(500),
    
    -- Disponibilité
    is_online BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT valid_balance CHECK (balance >= 0)
);

CREATE INDEX idx_artisans_user ON artisans(user_id);
CREATE INDEX idx_artisans_rating ON artisans(rating);
CREATE INDEX idx_artisans_location ON artisans(current_latitude, current_longitude);
CREATE INDEX idx_artisans_online ON artisans(is_online, is_available);

-- ============================================
-- TABLE: addresses
-- ============================================
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100), -- "Maison", "Bureau", etc.
    full_address VARCHAR(500) NOT NULL,
    neighborhood VARCHAR(100), -- Quartier
    city VARCHAR(100) DEFAULT 'Dakar',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- ============================================
-- TABLE: service_categories (catégories de services)
-- ============================================
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_fr VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: service_subcategories (sous-catégories)
-- ============================================
CREATE TABLE service_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subcategories_category ON service_subcategories(category_id);

-- ============================================
-- TABLE: service_items (éléments/équipements)
-- ============================================
CREATE TABLE service_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategory_id UUID REFERENCES service_subcategories(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_category ON service_items(category_id);
CREATE INDEX idx_items_subcategory ON service_items(subcategory_id);

-- ============================================
-- TABLE: artisan_categories (spécialités des artisans)
-- ============================================
CREATE TABLE artisan_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(artisan_id, category_id)
);

CREATE INDEX idx_artisan_categories ON artisan_categories(artisan_id);
CREATE INDEX idx_category_artisans ON artisan_categories(category_id);

-- ============================================
-- TABLE: service_requests (demandes des clients)
-- ============================================
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(20) UNIQUE NOT NULL, -- TEG-XXXXXX
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id),
    subcategory_id UUID REFERENCES service_subcategories(id),
    item_id UUID REFERENCES service_items(id),
    
    -- Détails de la demande
    service_type service_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    is_urgent BOOLEAN DEFAULT FALSE,
    
    -- Adresse
    address VARCHAR(500) NOT NULL,
    neighborhood VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Statut
    status request_status DEFAULT 'pending',
    
    -- Dates
    requested_date DATE,
    requested_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

CREATE INDEX idx_requests_client ON service_requests(client_id);
CREATE INDEX idx_requests_category ON service_requests(category_id);
CREATE INDEX idx_requests_status ON service_requests(status);
CREATE INDEX idx_requests_created ON service_requests(created_at DESC);
CREATE INDEX idx_requests_location ON service_requests(latitude, longitude);

-- ============================================
-- TABLE: missions (missions acceptées par les artisans)
-- ============================================
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(20) UNIQUE NOT NULL, -- MIS-XXXXXX
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisans(id),
    
    -- Statut
    status mission_status DEFAULT 'accepted',
    
    -- Finances
    provision_amount DECIMAL(10, 2) DEFAULT 500.00, -- Provision bloquée
    artisan_declared_amount DECIMAL(12, 2), -- Montant déclaré par l'artisan
    client_declared_amount DECIMAL(12, 2), -- Montant déclaré par le client
    final_amount DECIMAL(12, 2), -- Montant final retenu
    commission_rate DECIMAL(5, 4) DEFAULT 0.01, -- 1%
    commission_amount DECIMAL(10, 2),
    
    -- Dates
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    artisan_completed_at TIMESTAMP WITH TIME ZONE,
    client_confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Distance
    distance_km DECIMAL(6, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_missions_request ON missions(request_id);
CREATE INDEX idx_missions_artisan ON missions(artisan_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_date ON missions(created_at DESC);

-- ============================================
-- TABLE: reviews (avis et notations)
-- ============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    artisan_id UUID NOT NULL REFERENCES artisans(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(mission_id, client_id)
);

CREATE INDEX idx_reviews_artisan ON reviews(artisan_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ============================================
-- TABLE: disputes (litiges)
-- ============================================
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(20) UNIQUE NOT NULL, -- DIS-XXXXXX
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES users(id),
    
    type VARCHAR(50) NOT NULL, -- amount_mismatch, quality, no_show, other
    description TEXT NOT NULL,
    
    status dispute_status DEFAULT 'open',
    
    -- Résolution
    resolved_by UUID REFERENCES admins(id),
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disputes_mission ON disputes(mission_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================
-- TABLE: deposits (dépôts des artisans)
-- ============================================
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(30) UNIQUE NOT NULL, -- DEP-XXXXXX
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'wave', -- wave, orange_money, cash
    payment_reference VARCHAR(100), -- Référence Wave/OM
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_deposits_artisan ON deposits(artisan_id);
CREATE INDEX idx_deposits_status ON deposits(status);

-- ============================================
-- TABLE: withdrawal_requests (demandes de retrait)
-- ============================================
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(30) UNIQUE NOT NULL, -- WIT-XXXXXX
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'wave',
    phone_number VARCHAR(20),
    status withdrawal_status DEFAULT 'pending',
    
    -- Traitement
    processed_by UUID REFERENCES admins(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    payment_reference VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_withdrawal CHECK (amount > 0)
);

CREATE INDEX idx_withdrawals_artisan ON withdrawal_requests(artisan_id);
CREATE INDEX idx_withdrawals_status ON withdrawal_requests(status);

-- ============================================
-- TABLE: commission_logs (historique des commissions)
-- ============================================
CREATE TABLE commission_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisans(id),
    
    type VARCHAR(30) NOT NULL, -- provision, adjustment, final
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    
    balance_before DECIMAL(12, 2),
    balance_after DECIMAL(12, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commission_mission ON commission_logs(mission_id);
CREATE INDEX idx_commission_artisan ON commission_logs(artisan_id);
CREATE INDEX idx_commission_date ON commission_logs(created_at DESC);

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Données additionnelles (IDs, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_date ON notifications(created_at DESC);

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Catégories de services
INSERT INTO service_categories (id, name, name_fr, icon, color, display_order) VALUES
    (uuid_generate_v4(), 'electricity', 'Électricité', 'Zap', '#F59E0B', 1),
    (uuid_generate_v4(), 'cooling', 'Froid', 'Snowflake', '#3B82F6', 2),
    (uuid_generate_v4(), 'plumbing', 'Plomberie', 'Droplets', '#06B6D4', 3),
    (uuid_generate_v4(), 'carpentry', 'Menuiserie', 'Hammer', '#8B5CF6', 4),
    (uuid_generate_v4(), 'painting', 'Peinture', 'Paintbrush', '#EC4899', 5);

-- Sous-catégories pour Froid
INSERT INTO service_subcategories (category_id, name, name_fr, icon)
SELECT id, 'air_conditioning', 'Climatisation', 'Wind'
FROM service_categories WHERE name = 'cooling';

INSERT INTO service_subcategories (category_id, name, name_fr, icon)
SELECT id, 'refrigeration', 'Réfrigérateur', 'Refrigerator'
FROM service_categories WHERE name = 'cooling';

-- Éléments pour Électricité
INSERT INTO service_items (category_id, name, name_fr)
SELECT id, 'outlet', 'Prise électrique' FROM service_categories WHERE name = 'electricity'
UNION ALL
SELECT id, 'switch', 'Interrupteur' FROM service_categories WHERE name = 'electricity'
UNION ALL
SELECT id, 'lighting', 'Éclairage' FROM service_categories WHERE name = 'electricity'
UNION ALL
SELECT id, 'electrical_panel', 'Tableau électrique' FROM service_categories WHERE name = 'electricity'
UNION ALL
SELECT id, 'wiring', 'Câblage' FROM service_categories WHERE name = 'electricity';

-- Éléments pour Climatisation
INSERT INTO service_items (subcategory_id, category_id, name, name_fr)
SELECT s.id, s.category_id, 'split_ac', 'Climatiseur Split'
FROM service_subcategories s WHERE s.name = 'air_conditioning'
UNION ALL
SELECT s.id, s.category_id, 'window_ac', 'Climatiseur fenêtre'
FROM service_subcategories s WHERE s.name = 'air_conditioning'
UNION ALL
SELECT s.id, s.category_id, 'central_ac', 'Climatisation centrale'
FROM service_subcategories s WHERE s.name = 'air_conditioning';

-- Éléments pour Réfrigérateur
INSERT INTO service_items (subcategory_id, category_id, name, name_fr)
SELECT s.id, s.category_id, 'fridge', 'Réfrigérateur'
FROM service_subcategories s WHERE s.name = 'refrigeration'
UNION ALL
SELECT s.id, s.category_id, 'freezer', 'Congélateur'
FROM service_subcategories s WHERE s.name = 'refrigeration'
UNION ALL
SELECT s.id, s.category_id, 'fridge_freezer', 'Combiné réfrigérateur-congélateur'
FROM service_subcategories s WHERE s.name = 'refrigeration';

-- Éléments pour Plomberie
INSERT INTO service_items (category_id, name, name_fr)
SELECT id, 'faucet', 'Robinet' FROM service_categories WHERE name = 'plumbing'
UNION ALL
SELECT id, 'toilet', 'WC/Toilettes' FROM service_categories WHERE name = 'plumbing'
UNION ALL
SELECT id, 'sink', 'Lavabo/Évier' FROM service_categories WHERE name = 'plumbing'
UNION ALL
SELECT id, 'shower', 'Douche' FROM service_categories WHERE name = 'plumbing'
UNION ALL
SELECT id, 'water_heater', 'Chauffe-eau' FROM service_categories WHERE name = 'plumbing'
UNION ALL
SELECT id, 'pipes', 'Tuyauterie' FROM service_categories WHERE name = 'plumbing';

-- Éléments pour Menuiserie
INSERT INTO service_items (category_id, name, name_fr)
SELECT id, 'door', 'Porte' FROM service_categories WHERE name = 'carpentry'
UNION ALL
SELECT id, 'window', 'Fenêtre' FROM service_categories WHERE name = 'carpentry'
UNION ALL
SELECT id, 'furniture', 'Meuble' FROM service_categories WHERE name = 'carpentry'
UNION ALL
SELECT id, 'closet', 'Placard/Armoire' FROM service_categories WHERE name = 'carpentry'
UNION ALL
SELECT id, 'wooden_floor', 'Parquet' FROM service_categories WHERE name = 'carpentry';

-- Éléments pour Peinture
INSERT INTO service_items (category_id, name, name_fr)
SELECT id, 'interior_wall', 'Mur intérieur' FROM service_categories WHERE name = 'painting'
UNION ALL
SELECT id, 'exterior_wall', 'Mur extérieur' FROM service_categories WHERE name = 'painting'
UNION ALL
SELECT id, 'ceiling', 'Plafond' FROM service_categories WHERE name = 'painting'
UNION ALL
SELECT id, 'woodwork', 'Boiseries' FROM service_categories WHERE name = 'painting'
UNION ALL
SELECT id, 'metal', 'Métal/Fer forgé' FROM service_categories WHERE name = 'painting';

-- ============================================
-- COMPTE ADMIN PAR DÉFAUT
-- ============================================
DO $$
DECLARE
    admin_user_id UUID;
    admin_id UUID;
BEGIN
    -- Créer l'utilisateur admin
    INSERT INTO users (phone, phone_verified, password_hash, user_type, status)
    VALUES (
        '+221338000000',
        TRUE,
        crypt('admin', gen_salt('bf')),
        'admin',
        'active'
    )
    RETURNING id INTO admin_user_id;
    
    -- Créer le profil admin
    INSERT INTO admins (user_id, first_name, last_name, email, role)
    VALUES (
        admin_user_id,
        'Super',
        'Admin',
        'admin@tegg.sn',
        'super_admin'
    );
    
    RAISE NOTICE 'Admin créé avec succès. Téléphone: +221338000000, Mot de passe: admin';
END $$;

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour générer une référence unique
CREATE OR REPLACE FUNCTION generate_reference(prefix VARCHAR(3))
RETURNS VARCHAR(20) AS $$
DECLARE
    new_ref VARCHAR(20);
    ref_exists BOOLEAN;
BEGIN
    LOOP
        new_ref := prefix || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        -- Vérifier l'unicité selon le préfixe
        CASE prefix
            WHEN 'TEG' THEN
                SELECT EXISTS(SELECT 1 FROM service_requests WHERE reference = new_ref) INTO ref_exists;
            WHEN 'MIS' THEN
                SELECT EXISTS(SELECT 1 FROM missions WHERE reference = new_ref) INTO ref_exists;
            WHEN 'DIS' THEN
                SELECT EXISTS(SELECT 1 FROM disputes WHERE reference = new_ref) INTO ref_exists;
            WHEN 'DEP' THEN
                SELECT EXISTS(SELECT 1 FROM deposits WHERE reference = new_ref) INTO ref_exists;
            WHEN 'WIT' THEN
                SELECT EXISTS(SELECT 1 FROM withdrawal_requests WHERE reference = new_ref) INTO ref_exists;
            ELSE
                ref_exists := FALSE;
        END CASE;
        
        EXIT WHEN NOT ref_exists;
    END LOOP;
    
    RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer la distance entre deux points (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 6371; -- Rayon de la Terre en km
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    
    a := SIN(dlat/2) * SIN(dlat/2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dlon/2) * SIN(dlon/2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN ROUND((R * c)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour calculer la commission
CREATE OR REPLACE FUNCTION calculate_commission(
    amount DECIMAL,
    commission_rate DECIMAL DEFAULT 0.01,
    min_commission DECIMAL DEFAULT 500
)
RETURNS DECIMAL AS $$
DECLARE
    calculated DECIMAL;
BEGIN
    calculated := amount * commission_rate;
    RETURN GREATEST(calculated, min_commission);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour mettre à jour la note d'un artisan
CREATE OR REPLACE FUNCTION update_artisan_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE artisans
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 5)
            FROM reviews
            WHERE artisan_id = NEW.artisan_id AND is_visible = TRUE
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE artisan_id = NEW.artisan_id AND is_visible = TRUE
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.artisan_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_artisan_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_artisan_rating();

-- Fonction pour créer une notification de note basse
CREATE OR REPLACE FUNCTION check_low_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rating < 3 THEN
        -- Créer une alerte pour les admins
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT 
            u.id,
            'system',
            'Alerte: Note basse',
            'L''artisan ' || a.first_name || ' ' || a.last_name || ' a reçu une note de ' || NEW.rating || ' étoiles',
            jsonb_build_object('artisan_id', NEW.artisan_id, 'review_id', NEW.id, 'rating', NEW.rating)
        FROM admins adm
        JOIN users u ON adm.user_id = u.id
        JOIN artisans a ON a.id = NEW.artisan_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_low_rating
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION check_low_rating();

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les tables concernées
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_artisans_updated_at BEFORE UPDATE ON artisans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_missions_updated_at BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue des artisans avec leurs catégories
CREATE OR REPLACE VIEW v_artisans_full AS
SELECT 
    a.*,
    u.phone,
    u.status as user_status,
    u.last_login,
    ARRAY_AGG(DISTINCT sc.name_fr) as categories
FROM artisans a
JOIN users u ON a.user_id = u.id
LEFT JOIN artisan_categories ac ON a.id = ac.artisan_id
LEFT JOIN service_categories sc ON ac.category_id = sc.id
GROUP BY a.id, u.phone, u.status, u.last_login;

-- Vue des demandes avec détails
CREATE OR REPLACE VIEW v_requests_full AS
SELECT 
    sr.*,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    u.phone as client_phone,
    sc.name_fr as category_name,
    sc.icon as category_icon,
    ssc.name_fr as subcategory_name,
    si.name_fr as item_name
FROM service_requests sr
JOIN clients c ON sr.client_id = c.id
JOIN users u ON c.user_id = u.id
JOIN service_categories sc ON sr.category_id = sc.id
LEFT JOIN service_subcategories ssc ON sr.subcategory_id = ssc.id
LEFT JOIN service_items si ON sr.item_id = si.id;

-- Vue des missions avec détails
CREATE OR REPLACE VIEW v_missions_full AS
SELECT 
    m.*,
    sr.title as request_title,
    sr.service_type,
    sr.address,
    sr.neighborhood,
    sr.is_urgent,
    sc.name_fr as category_name,
    a.first_name as artisan_first_name,
    a.last_name as artisan_last_name,
    a.rating as artisan_rating,
    ua.phone as artisan_phone,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    uc.phone as client_phone
FROM missions m
JOIN service_requests sr ON m.request_id = sr.id
JOIN service_categories sc ON sr.category_id = sc.id
JOIN artisans a ON m.artisan_id = a.id
JOIN users ua ON a.user_id = ua.id
JOIN clients c ON sr.client_id = c.id
JOIN users uc ON c.user_id = uc.id;

-- Vue des revenus par période
CREATE OR REPLACE VIEW v_revenue_stats AS
SELECT 
    DATE_TRUNC('day', m.completed_at) as period_day,
    DATE_TRUNC('week', m.completed_at) as period_week,
    DATE_TRUNC('month', m.completed_at) as period_month,
    COUNT(*) as total_missions,
    SUM(m.final_amount) as total_revenue,
    SUM(m.commission_amount) as total_commission,
    AVG(m.final_amount) as avg_mission_amount
FROM missions m
WHERE m.status = 'completed'
GROUP BY 
    DATE_TRUNC('day', m.completed_at),
    DATE_TRUNC('week', m.completed_at),
    DATE_TRUNC('month', m.completed_at);

-- ============================================
-- PERMISSIONS
-- ============================================

-- Créer un rôle pour l'application
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tegg_app') THEN
        CREATE ROLE tegg_app WITH LOGIN PASSWORD 'TeggApp2024!';
    END IF;
END $$;

-- Donner les permissions
GRANT USAGE ON SCHEMA public TO tegg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tegg_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tegg_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tegg_app;

-- ============================================
-- FIN DU SCRIPT
-- ============================================

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Base de données Tëgg initialisée avec succès!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Compte Admin: +221338000000 / admin';
    RAISE NOTICE '========================================';
END $$;
