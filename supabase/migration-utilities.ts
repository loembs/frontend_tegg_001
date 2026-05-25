/**
 * Utilitaires de migration vers Supabase
 * Fonctions pour migrer les données de l'ancien API vers Supabase
 */

import { supabase, Profile, ServiceRequestDB } from '../src/lib/supabaseClient';
import { User, Artisan, Client, ServiceRequest } from '../src/types';

// ============================================================================
// MIGRATION DES UTILISATEURS
// ============================================================================

/**
 * Migrer un utilisateur vers Supabase
 */
export async function migrateUser(user: User | Artisan | Client): Promise<{ success: boolean; error?: string; profileId?: string }> {
  try {
    // Créer l'utilisateur dans Auth Supabase
    // Note: Pour une vraie migration, utilisez la admin API côté serveur
    const tempPassword = 'TempPassword123!';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: tempPassword,
      phone: user.phone,
      options: {
        data: {
          phone: user.phone,
          first_name: user.firstName,
          last_name: user.lastName,
          role: user.role,
        },
      },
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Erreur création auth' };
    }

    // Créer le profil
    const profileData: Partial<Profile> = {
      id: authData.user.id,
      email: user.email,
      phone: user.phone,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      avatar_url: user.avatar,
      is_active: user.isActive,
      is_validated: user.isValidated,
    };

    // Champs spécifiques Artisan
    if (user.role === 'artisan') {
      const artisan = user as Artisan;
      profileData.category = artisan.category;
      profileData.sub_categories = artisan.subCategories;
      profileData.rating = artisan.rating;
      profileData.total_missions = artisan.totalMissions;
      profileData.balance = artisan.balance;
      profileData.balance_threshold = artisan.balanceThreshold;
      profileData.latitude = artisan.latitude;
      profileData.longitude = artisan.longitude;
      profileData.is_online = artisan.isOnline;
    }

    // Champs spécifiques Client
    if (user.role === 'client') {
      const client = user as Client;
      profileData.client_type = client.type;
      profileData.address = client.address;
      profileData.latitude = client.latitude;
      profileData.longitude = client.longitude;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    return { success: true, profileId: authData.user.id };
  } catch (error) {
    return { success: false, error: 'Erreur inconnue' };
  }
}

/**
 * Migrer plusieurs utilisateurs en lot
 */
export async function migrateUsers(users: (User | Artisan | Client)[]): Promise<{
  success: number;
  failed: number;
  errors: Array<{ user: User; error: string }>;
}> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ user: User; error: string }> = [];

  for (const user of users) {
    const result = await migrateUser(user);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push({ user, error: result.error || 'Erreur inconnue' });
    }

    // Délai pour éviter de saturer l'API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { success, failed, errors };
}

// ============================================================================
// MIGRATION DES DEMANDES DE SERVICE
// ============================================================================

/**
 * Migrer une demande de service vers Supabase
 */
export async function migrateServiceRequest(request: ServiceRequest): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const requestData: Partial<ServiceRequestDB> = {
      id: request.id, // Supabase acceptera l'UUID si valide
      client_id: request.clientId,
      client_name: request.clientName,
      client_phone: request.clientPhone,
      category: request.category,
      sub_category: request.subCategory,
      service_type: request.serviceType,
      element_count: request.elementCount,
      description: request.description,
      address: request.address,
      quartier: request.quartier,
      latitude: request.latitude,
      longitude: request.longitude,
      is_urgent: request.isUrgent,
      status: request.status,
      created_at: request.createdAt.toISOString(),
      artisan_id: request.artisanId,
      artisan_name: request.artisanName,
      artisan_phone: request.artisanPhone,
      accepted_at: request.acceptedAt?.toISOString(),
      completed_at: request.completedAt?.toISOString(),
      artisan_amount: request.artisanAmount,
      client_amount: request.clientAmount,
      commission: request.commission,
      client_validated: request.clientValidated,
      artisan_validated: request.artisanValidated,
      rating: request.rating,
    };

    const { error } = await supabase
      .from('service_requests')
      .insert(requestData);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requestId: request.id };
  } catch (error) {
    return { success: false, error: 'Erreur inconnue' };
  }
}

/**
 * Migrer plusieurs demandes en lot
 */
export async function migrateServiceRequests(requests: ServiceRequest[]): Promise<{
  success: number;
  failed: number;
  errors: Array<{ request: ServiceRequest; error: string }>;
}> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ request: ServiceRequest; error: string }> = [];

  for (const request of requests) {
    const result = await migrateServiceRequest(request);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push({ request, error: result.error || 'Erreur inconnue' });
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return { success, failed, errors };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Vérifier l'état de la migration
 */
export async function checkMigrationStatus(): Promise<{
  profilesCount: number;
  requestsCount: number;
  categoriesCount: number;
}> {
  const [profiles, requests, categories] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('service_requests').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
  ]);

  return {
    profilesCount: profiles.count || 0,
    requestsCount: requests.count || 0,
    categoriesCount: categories.count || 0,
  };
}

/**
 * Réinitialiser la base de données (ATTENTION: supprime toutes les données)
 */
export async function resetDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    // Supprimer toutes les données (dans l'ordre pour respecter les foreign keys)
    await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('withdrawal_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('service_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la réinitialisation' };
  }
}

// ============================================================================
// UTILS
// ============================================================================

/**
 * Générer un UUID valide pour Supabase
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Logger pour la migration
 */
export class MigrationLogger {
  private logs: string[] = [];

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage, data || '');
    this.logs.push(logMessage);
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage, error || '');
    this.logs.push(logMessage);
  }

  getLogs(): string[] {
    return this.logs;
  }

  exportLogs(): string {
    return this.logs.join('\n');
  }
}
