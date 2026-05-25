/**
 * Service Supabase pour Tëgg Platform
 * Remplacement complet de l'API backend par Supabase
 */

import { supabase, Database, Profile, ServiceRequestDB, NotificationDB, Transaction, WithdrawalRequestDB } from '../lib/supabaseClient';
import { UserRole, ServiceCategory, RequestStatus } from '../types';

// ================================
// TYPES DE RETOUR
// ================================

export interface AuthResponse {
  success: boolean;
  user?: Profile;
  token?: string;
  error?: string;
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ================================
// AUTH SERVICE
// ================================

export const authService = {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(data: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: UserRole;
    category?: ServiceCategory;
    email?: string;
  }): Promise<AuthResponse> {
    try {
      const email = data.email || `${data.phone.replace(/\s/g, '')}@tegg.sn`;

      // 1. Créer l'auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: data.password,
        phone: data.phone,
        options: {
          data: {
            phone: data.phone,
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.userType,
          },
        },
      });

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Erreur lors de la création du compte' };
      }

      // 2. Créer le profil
      const profileData: Partial<Profile> = {
        id: authData.user.id,
        email,
        phone: data.phone,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.userType,
        is_active: true,
      };

      if (data.userType === 'artisan' && data.category) {
        profileData.category = data.category;
        profileData.balance = 0;
        profileData.balance_threshold = 5000;
        profileData.rating = 0;
        profileData.total_missions = 0;
        profileData.is_online = false;
        profileData.is_validated = false;
      } else if (data.userType === 'client') {
        profileData.client_type = 'particulier';
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      // 3. Récupérer la session
      const { data: sessionData } = await supabase.auth.getSession();

      return {
        success: true,
        user: profileData as Profile,
        token: sessionData.session?.access_token,
      };
    } catch (error) {
      return { success: false, error: 'Une erreur est survenue' };
    }
  },

  /**
   * Connexion (accepte email ou téléphone)
   */
  async login(phone: string, password: string): Promise<AuthResponse> {
    try {
      // Nettoyer l'input (enlever les espaces)
      const credential = phone.trim();
      const isEmail = credential.includes('@');

      // Trouver l'utilisateur par email ou téléphone
      let query = supabase
        .from('profiles')
        .select('*');

      if (isEmail) {
        query = query.ilike('email', credential);
      } else {
        query = query.eq('phone', credential);
      }

      const { data: profile, error: profileError } = await query.single();

      if (profileError || !profile) {
        return { success: false, error: isEmail ? 'Email ou mot de passe incorrect' : 'Numéro de téléphone ou mot de passe incorrect' };
      }

      if (!profile.is_active) {
        return { success: false, error: 'Ce compte a été désactivé' };
      }

      // Vérifier que l'email et le mot de passe sont valides
      if (!profile.email || !password || password.trim() === '') {
        return { success: false, error: 'Email ou mot de passe manquant' };
      }

      console.log('Tentative de connexion:', { email: profile.email, hasPassword: !!password });

      // Connecter avec l'email du profil
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email.trim(),
        password: password.trim(),
      });

      if (authError || !authData.user) {
        console.error('Erreur de connexion:', authError);
        return { success: false, error: authError?.message || 'Mot de passe incorrect' };
      }

      return {
        success: true,
        user: profile,
        token: authData.session.access_token,
      };
    } catch (error) {
      return { success: false, error: 'Une erreur est survenue' };
    }
  },

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Récupérer l'utilisateur actuel
   */
  async me(): Promise<Profile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return profile;
    } catch {
      return null;
    }
  },

  /**
   * Rafraîchir la session
   */
  async refreshSession(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        return null;
      }

      return data.session.access_token;
    } catch {
      return null;
    }
  },

  /**
   * Changer le mot de passe
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResult<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: 'Non authentifié' };
      }

      // Vérifier l'ancien mot de passe en se reconnectant
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (verifyError) {
        return { data: null, error: 'Mot de passe actuel incorrect' };
      }

      // Mettre à jour le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// CATEGORIES SERVICE
// ================================

export const categoriesService = {
  async list(): Promise<ApiResult<Database['public']['Tables']['categories']['Row'][]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async get(id: string): Promise<ApiResult<Database['public']['Tables']['categories']['Row']>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getSubcategories(categoryId: string): Promise<ApiResult<Database['public']['Tables']['subcategories']['Row'][]>> {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('order_index');

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// PROFILES SERVICE
// ================================

export const profilesService = {
  async getProfile(userId: string): Promise<ApiResult<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async updateProfile(userId: string, data: Partial<Profile>): Promise<ApiResult<Profile>> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async updateLocation(userId: string, latitude: number, longitude: number): Promise<ApiResult<boolean>> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async setOnline(userId: string, isOnline: boolean): Promise<ApiResult<boolean>> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// CLIENTS SERVICE
// ================================

export const clientService = {
  async getStats(clientId: string): Promise<ApiResult<any>> {
    try {
      // Récupérer les statistiques du client
      const [requestsResult, completedResult] = await Promise.all([
        supabase
          .from('service_requests')
          .select('id')
          .eq('client_id', clientId),
        supabase
          .from('service_requests')
          .select('id')
          .eq('client_id', clientId)
          .eq('status', 'terminee'),
      ]);

      const stats = {
        totalRequests: requestsResult.data?.length || 0,
        completedRequests: completedResult.data?.length || 0,
        pendingRequests: (requestsResult.data?.length || 0) - (completedResult.data?.length || 0),
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getAddresses(clientId: string): Promise<ApiResult<any[]>> {
    // Pour les adresses, on peut utiliser une table séparée ou les stocker dans le profil
    // Pour l'instant, retourner l'adresse du profil
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('address')
        .eq('id', clientId)
        .single();

      const addresses = profile?.address ? [{ address: profile.address, isDefault: true }] : [];

      return { data: addresses, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// ARTISANS SERVICE
// ================================

export const artisanService = {
  async getBalance(artisanId: string): Promise<ApiResult<any>> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('balance, balance_threshold')
        .eq('id', artisanId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      // Récupérer les transactions récentes
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', artisanId)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        data: {
          balance: profile?.balance || 0,
          balance_threshold: profile?.balance_threshold || 5000,
          recentTransactions: transactions || [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async deposit(artisanId: string, amount: number, paymentMethod?: string, paymentReference?: string): Promise<ApiResult<any>> {
    try {
      // Récupérer le solde actuel
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', artisanId)
        .single();

      const currentBalance = profile?.balance || 0;
      const newBalance = currentBalance + amount;
      const reference = paymentReference || `DEP-${Date.now()}`;

      // Mettre à jour le solde dans un transaction
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', artisanId);

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      // Enregistrer la transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: artisanId,
          type: 'deposit',
          amount,
          balance_after: newBalance,
          reference,
          payment_method: paymentMethod,
        });

      if (transactionError) {
        return { data: null, error: transactionError.message };
      }

      return {
        data: { reference, newBalance },
        error: null,
      };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async withdraw(artisanId: string): Promise<ApiResult<any>> {
    try {
      // Récupérer le profil de l'artisan
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance, first_name, last_name')
        .eq('id', artisanId)
        .single();

      if (profileError || !profile) {
        return { data: null, error: 'Profil non trouvé' };
      }

      if (profile.balance <= 0) {
        return { data: null, error: 'Solde insuffisant' };
      }

      // Vérifier si une demande est déjà en cours
      const { data: existingRequest } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('artisan_id', artisanId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        return { data: null, error: 'Une demande de retrait est déjà en cours' };
      }

      // Créer la demande de retrait
      const reference = `RET-${Date.now()}`;
      const { error: requestError } = await supabase
        .from('withdrawal_requests')
        .insert({
          artisan_id: artisanId,
          artisan_name: `${profile.first_name} ${profile.last_name}`,
          amount: profile.balance,
          status: 'pending',
          requested_at: new Date().toISOString(),
        });

      if (requestError) {
        return { data: null, error: requestError.message };
      }

      return {
        data: { reference, amount: profile.balance },
        error: null,
      };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getAvailableArtisans(category?: ServiceCategory, latitude?: number, longitude?: number): Promise<ApiResult<Profile[]>> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'artisan')
        .eq('is_active', true)
        .eq('is_online', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      // Filtrer par distance si des coordonnées sont fournies
      let artisans = data || [];
      if (latitude && longitude) {
        artisans = artisans.filter(artisan => {
          if (artisan.latitude && artisan.longitude) {
            const distance = calculateDistance(latitude, longitude, artisan.latitude, artisan.longitude);
            return distance <= 50; // 50 km max
          }
          return false;
        });
      }

      return { data: artisans, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// REQUESTS SERVICE (Demandes)
// ================================

export const requestsService = {
  async list(clientId?: string, status?: RequestStatus): Promise<ApiResult<ServiceRequestDB[]>> {
    try {
      let query = supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async get(id: string): Promise<ApiResult<ServiceRequestDB>> {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async create(data: {
    clientId: string;
    clientName: string;
    clientPhone: string;
    categoryId: string;
    subcategoryId?: string;
    serviceType: Database['Enums']['service_type'];
    title?: string;
    description: string;
    quantity?: number;
    isUrgent?: boolean;
    address: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<ApiResult<{ request: ServiceRequestDB }>> {
    try {
      const requestData: Partial<ServiceRequestDB> = {
        client_id: data.clientId,
        client_name: data.clientName,
        client_phone: data.clientPhone,
        category: data.categoryId as ServiceCategory,
        sub_category: data.subcategoryId,
        service_type: data.serviceType,
        description: data.description,
        element_count: data.quantity || 1,
        address: data.address,
        quartier: data.neighborhood || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        is_urgent: data.isUrgent || false,
        status: 'en_attente',
      };

      const { data: request, error } = await supabase
        .from('service_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      // Créer une notification pour les artisans de la catégorie
      await this.notifyNearbyArtisans(
        data.clientId,
        data.categoryId as ServiceCategory,
        request.id,
        data.latitude,
        data.longitude
      );

      return { data: { request }, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async cancel(id: string, reason?: string): Promise<ApiResult<boolean>> {
    try {
      // Récupérer la demande
      const { data: request } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (!request) {
        return { data: null, error: 'Demande non trouvée' };
      }

      // Si un artisan a déjà accepté, rembourser la provision
      if (request.artisan_id && request.artisan_amount) {
        await supabase.rpc('refund_artisan_provision', {
          request_id: id,
          artisan_id: request.artisan_id,
          amount: request.artisan_amount,
        });
      }

      // Mettre à jour le statut
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'annulee',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async confirm(id: string, amount: number, rating?: number, comment?: string): Promise<ApiResult<any>> {
    try {
      const { data: request, error: requestError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (requestError || !request) {
        return { data: null, error: 'Demande non trouvée' };
      }

      // Calculer la commission (20%)
      const commission = Math.round(amount * 0.2);
      const artisanAmount = amount - commission;

      // Mettre à jour la demande
      await supabase
        .from('service_requests')
        .update({
          status: 'terminee',
          completed_at: new Date().toISOString(),
          client_amount: amount,
          artisan_amount: artisanAmount,
          commission,
          client_validated: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Ajouter l'avis si fourni
      if (rating && request.artisan_id) {
        await supabase
          .from('reviews')
          .insert({
            request_id: id,
            client_id: request.client_id,
            artisan_id: request.artisan_id,
            rating,
            review: comment,
          });

        // Mettre à jour la note moyenne de l'artisan
        await this.updateArtisanRating(request.artisan_id);
      }

      return { data: { commission }, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async notifyNearbyArtisans(clientId: string, category: ServiceCategory, requestId: string, latitude?: number, longitude?: number): Promise<void> {
    try {
      // Récupérer les artisans disponibles
      const { data: artisans } = await artisanService.getAvailableArtisans(category, latitude, longitude);

      if (!artisans) return;

      // Créer des notifications pour chaque artisan
      const notifications = artisans
        .filter(a => a.id !== clientId)
        .map(artisan => ({
          user_id: artisan.id,
          title: 'Nouvelle demande disponible',
          message: `Une nouvelle demande de ${category} est disponible près de chez vous`,
          type: 'info' as const,
          link: `/missions/${requestId}`,
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Erreur lors de la notification des artisans:', error);
    }
  },

  async updateArtisanRating(artisanId: string): Promise<void> {
    try {
      // Calculer la nouvelle moyenne
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('artisan_id', artisanId);

      if (!reviews || reviews.length === 0) return;

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await supabase
        .from('profiles')
        .update({
          rating: Math.round(avgRating * 10) / 10,
          total_missions: reviews.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artisanId);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la note:', error);
    }
  },
};

// ================================
// MISSIONS SERVICE
// ================================

export const missionsService = {
  async getAvailable(category?: ServiceCategory, latitude?: number, longitude?: number): Promise<ApiResult<ServiceRequestDB[]>> {
    try {
      let query = supabase
        .from('service_requests')
        .select('*')
        .eq('status', 'en_attente')
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      // Calculer les distances si des coordonnées sont fournies
      let requests = data || [];
      if (latitude && longitude) {
        requests = requests.map(req => ({
          ...req,
          distance: req.latitude && req.longitude
            ? calculateDistance(latitude, longitude, req.latitude, req.longitude)
            : null,
        })).filter(req => req.distance === null || req.distance <= 50)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      return { data: requests, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async list(artisanId: string, status?: RequestStatus): Promise<ApiResult<ServiceRequestDB[]>> {
    try {
      let query = supabase
        .from('service_requests')
        .select('*')
        .eq('artisan_id', artisanId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async get(id: string): Promise<ApiResult<ServiceRequestDB>> {
    return requestsService.get(id);
  },

  async accept(requestId: string, artisanId: string, artisanName: string, artisanPhone: string): Promise<ApiResult<any>> {
    try {
      // Récupérer la demande
      const { data: request, error: requestError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        return { data: null, error: 'Demande non trouvée' };
      }

      if (request.status !== 'en_attente') {
        return { data: null, error: 'Cette demande n\'est plus disponible' };
      }

      // Récupérer le profil de l'artisan
      const { data: artisan, error: artisanError } = await supabase
        .from('profiles')
        .select('balance, balance_threshold')
        .eq('id', artisanId)
        .single();

      if (artisanError || !artisan) {
        return { data: null, error: 'Profil artisan non trouvé' };
      }

      // Calculer la provision (10% du montant estimé)
      const estimatedAmount = 10000; // Montant estimé par défaut
      const provision = Math.round(estimatedAmount * 0.1);

      // Vérifier le solde
      if (artisan.balance! < provision) {
        return {
          data: null,
          error: `Solde insuffisant. Provision requise: ${provision} FCFA. Solde actuel: ${artisan.balance} FCFA`,
        };
      }

      // Déduire la provision
      const newBalance = artisan.balance - provision;

      // Mettre à jour la demande
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({
          artisan_id: artisanId,
          artisan_name: artisanName,
          artisan_phone: artisanPhone,
          status: 'en_cours',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      // Mettre à jour le solde de l'artisan
      await supabase
        .from('profiles')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artisanId);

      // Enregistrer la transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: artisanId,
          type: 'commission',
          amount: -provision,
          balance_after: newBalance,
          description: `Provision pour la mission ${requestId}`,
        });

      // Notifier le client
      await supabase
        .from('notifications')
        .insert({
          user_id: request.client_id,
          title: 'Votre demande a été acceptée',
          message: `${artisanName} a accepté votre demande de ${request.category}`,
          type: 'success',
          link: `/requests/${requestId}`,
        });

      return {
        data: {
          mission: request,
          provision,
          newBalance,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async complete(id: string, amount: number): Promise<ApiResult<boolean>> {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'terminee',
          completed_at: new Date().toISOString(),
          artisan_amount: amount,
          artisan_validated: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// NOTIFICATIONS SERVICE
// ================================

export const notificationsService = {
  async list(userId: string): Promise<ApiResult<NotificationDB[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async markAsRead(notificationId: string): Promise<ApiResult<boolean>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async markAllAsRead(userId: string): Promise<ApiResult<boolean>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async add(notification: {
    userId: string;
    title: string;
    message: string;
    type: Database['Enums']['notification_type'];
    link?: string;
  }): Promise<ApiResult<NotificationDB>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
          read: false,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// ADMIN SERVICE
// ================================

export const adminService = {
  async getDashboard(): Promise<ApiResult<any>> {
    try {
      // Récupérer les statistiques
      const [artisansResult, clientsResult, requestsResult, completedResult] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'artisan'),
        supabase.from('profiles').select('id').eq('role', 'client'),
        supabase.from('service_requests').select('id'),
        supabase.from('service_requests').select('id').eq('status', 'terminee'),
      ]);

      const stats = {
        totalArtisans: artisansResult.data?.length || 0,
        totalClients: clientsResult.data?.length || 0,
        totalRequests: requestsResult.data?.length || 0,
        completedRequests: completedResult.data?.length || 0,
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getArtisans(params?: { status?: string; validated?: string; search?: string }): Promise<ApiResult<Profile[]>> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'artisan');

      if (params?.validated === 'true') {
        query = query.eq('is_validated', true);
      } else if (params?.validated === 'false') {
        query = query.eq('is_validated', false);
      }

      if (params?.search) {
        query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async validateArtisan(artisanId: string): Promise<ApiResult<boolean>> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_validated: true, updated_at: new Date().toISOString() })
        .eq('id', artisanId);

      if (error) {
        return { data: null, error: error.message };
      }

      // Notifier l'artisan
      await notificationsService.add({
        userId: artisanId,
        title: 'Compte validé',
        message: 'Votre compte artisan a été validé. Vous pouvez maintenant recevoir des demandes.',
        type: 'success',
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async blockArtisan(artisanId: string, blocked: boolean): Promise<ApiResult<boolean>> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: !blocked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artisanId);

      if (error) {
        return { data: null, error: error.message };
      }

      // Notifier l'artisan
      await notificationsService.add({
        userId: artisanId,
        title: blocked ? 'Compte bloqué' : 'Compte réactivé',
        message: blocked
          ? 'Votre compte a été bloqué. Contactez le support pour plus d\'informations.'
          : 'Votre compte a été réactivé.',
        type: blocked ? 'error' : 'success',
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getClients(search?: string): Promise<ApiResult<Profile[]>> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client');

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getRequests(params?: { status?: RequestStatus; categoryId?: string }): Promise<ApiResult<ServiceRequestDB[]>> {
    try {
      let query = supabase
        .from('service_requests')
        .select('*');

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      if (params?.categoryId) {
        query = query.eq('category', params.categoryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getWithdrawals(status?: Database['Enums']['withdrawal_status']): Promise<ApiResult<WithdrawalRequestDB[]>> {
    try {
      let query = supabase
        .from('withdrawal_requests')
        .select('*');

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('requested_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async processWithdrawal(
    withdrawalId: string,
    approved: boolean,
    data?: { rejectionReason?: string; paymentReference?: string }
  ): Promise<ApiResult<boolean>> {
    try {
      // Récupérer la demande
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .single();

      if (withdrawalError || !withdrawal) {
        return { data: null, error: 'Demande non trouvée' };
      }

      if (withdrawal.status !== 'pending') {
        return { data: null, error: 'Cette demande a déjà été traitée' };
      }

      if (approved) {
        // Approuver - déduire le solde
        const { data: artisan } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', withdrawal.artisan_id)
          .single();

        if (artisan) {
          const newBalance = (artisan.balance || 0) - withdrawal.amount;

          await supabase
            .from('profiles')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('id', withdrawal.artisan_id);

          await supabase
            .from('transactions')
            .insert({
              user_id: withdrawal.artisan_id,
              type: 'withdrawal',
              amount: -withdrawal.amount,
              balance_after: newBalance,
              reference: withdrawal.id,
              payment_method: 'transfer',
            });
        }
      }

      // Mettre à jour le statut
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          processed_at: new Date().toISOString(),
          rejection_reason: data?.rejectionReason,
          payment_reference: data?.paymentReference,
        })
        .eq('id', withdrawalId);

      if (error) {
        return { data: null, error: error.message };
      }

      // Notifier l'artisan
      await notificationsService.add({
        userId: withdrawal.artisan_id,
        title: approved ? 'Retrait approuvé' : 'Retrait rejeté',
        message: approved
          ? `Votre demande de retrait de ${withdrawal.amount} FCFA a été approuvée.`
          : `Votre demande de retrait a été rejetée. ${data?.rejectionReason || ''}`,
        type: approved ? 'success' : 'error',
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getFinances(period?: string): Promise<ApiResult<any>> {
    try {
      // Récupérer les transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Calculer les statistiques
      const totalRevenue = transactions?.reduce((sum, t) => {
        if (t.type === 'commission') return sum + Math.abs(t.amount);
        return sum;
      }, 0) || 0;

      const totalDeposits = transactions?.reduce((sum, t) => {
        if (t.type === 'deposit') return sum + t.amount;
        return sum;
      }, 0) || 0;

      const pendingWithdrawals = transactions?.reduce((sum, t) => {
        if (t.type === 'withdrawal' && t.amount < 0) return sum + Math.abs(t.amount);
        return sum;
      }, 0) || 0;

      return {
        data: {
          totalRevenue,
          totalDeposits,
          pendingWithdrawals,
          transactions: transactions || [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },

  async getArtisanLocations(): Promise<ApiResult<Profile[]>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, category, latitude, longitude, is_online')
        .eq('role', 'artisan')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Une erreur est survenue' };
    }
  },
};

// ================================
// HEALTH CHECK
// ================================

export const healthCheck = async (): Promise<ApiResult<{ status: string; database: string }>> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: { status: 'ok', database: 'connected' },
      error: null,
    };
  } catch (error) {
    return { data: null, error: 'Une erreur est survenue' };
  }
};

// ================================
// UTILITAIRES
// ================================

/**
 * Calculer la distance entre deux coordonnées GPS (en km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Export par défaut compatibilité avec l'ancien API
export default {
  auth: authService,
  categories: categoriesService,
  profiles: profilesService,
  client: clientService,
  artisan: artisanService,
  requests: requestsService,
  missions: missionsService,
  notifications: notificationsService,
  admin: adminService,
  healthCheck,
};

// Export supabase client
export { supabase };
