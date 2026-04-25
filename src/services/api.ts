/**
 * Service API pour Tëgg
 * Connexion au backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token storage
let authToken: string | null = localStorage.getItem('tegg_token');

/**
 * Configuration des headers
 */
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
};

/**
 * Requête API générique
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Une erreur est survenue');
    }
    
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Erreur de connexion au serveur');
    }
    throw error;
  }
}

/**
 * Définir le token d'authentification
 */
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('tegg_token', token);
  } else {
    localStorage.removeItem('tegg_token');
  }
};

/**
 * Récupérer le token actuel
 */
export const getAuthToken = () => authToken;

// ================================
// AUTH API
// ================================

export const authAPI = {
  /**
   * Envoyer un code OTP
   */
  sendOTP: (phone: string) =>
    apiRequest<{ success: boolean; code?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  
  /**
   * Vérifier un code OTP
   */
  verifyOTP: (phone: string, code: string) =>
    apiRequest<{ success: boolean }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
  
  /**
   * Inscription
   */
  register: (data: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: 'client' | 'artisan';
    categoryId?: string;
  }) =>
    apiRequest<{ success: boolean; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Connexion
   */
  login: (phone: string, password: string) =>
    apiRequest<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),
  
  /**
   * Profil utilisateur connecté
   */
  me: () => apiRequest<any>('/auth/me'),
  
  /**
   * Changer le mot de passe
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ================================
// CATEGORIES API
// ================================

export const categoriesAPI = {
  /**
   * Liste des catégories
   */
  list: () => apiRequest<any[]>('/categories'),
  
  /**
   * Détails d'une catégorie
   */
  get: (id: string) => apiRequest<any>(`/categories/${id}`),
  
  /**
   * Sous-catégories
   */
  getSubcategories: (id: string) =>
    apiRequest<any[]>(`/categories/${id}/subcategories`),
  
  /**
   * Éléments/Items
   */
  getItems: (id: string, subcategoryId?: string) =>
    apiRequest<any[]>(`/categories/${id}/items${subcategoryId ? `?subcategoryId=${subcategoryId}` : ''}`),
};

// ================================
// CLIENT API
// ================================

export const clientAPI = {
  /**
   * Profil client
   */
  getProfile: () => apiRequest<any>('/clients/profile'),
  
  /**
   * Mettre à jour le profil
   */
  updateProfile: (data: any) =>
    apiRequest<any>('/clients/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * Statistiques
   */
  getStats: () => apiRequest<any>('/clients/stats'),
  
  /**
   * Notifications
   */
  getNotifications: () => apiRequest<any[]>('/clients/notifications'),
  
  /**
   * Marquer tout comme lu
   */
  markAllNotificationsRead: () =>
    apiRequest<{ success: boolean }>('/clients/notifications/read-all', {
      method: 'PUT',
    }),
  
  /**
   * Adresses enregistrées
   */
  getAddresses: () => apiRequest<any[]>('/clients/addresses'),
  
  /**
   * Ajouter une adresse
   */
  addAddress: (data: any) =>
    apiRequest<any>('/clients/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ================================
// REQUESTS API (Demandes)
// ================================

export const requestsAPI = {
  /**
   * Liste des demandes du client
   */
  list: (status?: string) =>
    apiRequest<any[]>(`/requests${status ? `?status=${status}` : ''}`),
  
  /**
   * Détails d'une demande
   */
  get: (id: string) => apiRequest<any>(`/requests/${id}`),
  
  /**
   * Créer une demande
   */
  create: (data: {
    categoryId: string;
    subcategoryId?: string;
    itemId?: string;
    serviceType: 'installation' | 'reparation';
    title?: string;
    description?: string;
    quantity?: number;
    isUrgent?: boolean;
    address: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    apiRequest<{ success: boolean; request: any }>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * Annuler une demande
   */
  cancel: (id: string, reason?: string) =>
    apiRequest<{ success: boolean }>(`/requests/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),
  
  /**
   * Confirmer la fin de mission (client)
   */
  confirm: (id: string, amount: number, rating?: number, comment?: string) =>
    apiRequest<{ success: boolean; commission: number }>(`/requests/${id}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({ amount, rating, comment }),
    }),
};

// ================================
// ARTISAN API
// ================================

export const artisanAPI = {
  /**
   * Profil artisan
   */
  getProfile: () => apiRequest<any>('/artisans/profile'),
  
  /**
   * Mettre à jour le profil
   */
  updateProfile: (data: any) =>
    apiRequest<any>('/artisans/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * Mettre à jour la position
   */
  updateLocation: (latitude: number, longitude: number) =>
    apiRequest<{ success: boolean }>('/artisans/location', {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    }),
  
  /**
   * Mettre à jour le statut en ligne
   */
  setOnline: (isOnline: boolean) =>
    apiRequest<{ success: boolean }>('/artisans/online', {
      method: 'PUT',
      body: JSON.stringify({ isOnline }),
    }),
  
  /**
   * Solde et finances
   */
  getBalance: () => apiRequest<any>('/artisans/balance'),
  
  /**
   * Faire un dépôt
   */
  deposit: (amount: number, paymentMethod?: string, paymentReference?: string) =>
    apiRequest<{ success: boolean; reference: string; newBalance: number }>('/artisans/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod, paymentReference }),
    }),
  
  /**
   * Demander un retrait
   */
  withdraw: () =>
    apiRequest<{ success: boolean; reference: string; amount: number }>('/artisans/withdraw', {
      method: 'POST',
    }),
  
  /**
   * Notifications
   */
  getNotifications: () => apiRequest<any[]>('/artisans/notifications'),
  
  /**
   * Marquer une notification comme lue
   */
  markNotificationRead: (id: string) =>
    apiRequest<{ success: boolean }>(`/artisans/notifications/${id}/read`, {
      method: 'PUT',
    }),
};

// ================================
// MISSIONS API
// ================================

export const missionsAPI = {
  /**
   * Demandes disponibles
   */
  getAvailable: () => apiRequest<any[]>('/missions/available'),
  
  /**
   * Liste des missions de l'artisan
   */
  list: (status?: string) =>
    apiRequest<any[]>(`/missions${status ? `?status=${status}` : ''}`),
  
  /**
   * Détails d'une mission
   */
  get: (id: string) => apiRequest<any>(`/missions/${id}`),
  
  /**
   * Accepter une demande
   */
  accept: (requestId: string) =>
    apiRequest<{ success: boolean; mission: any; provision: number; newBalance: number }>(
      `/missions/accept/${requestId}`,
      { method: 'POST' }
    ),
  
  /**
   * Marquer comme terminée
   */
  complete: (id: string, amount: number) =>
    apiRequest<{ success: boolean }>(`/missions/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    }),
};

// ================================
// ADMIN API
// ================================

export const adminAPI = {
  /**
   * Dashboard
   */
  getDashboard: () => apiRequest<any>('/admin/dashboard'),
  
  /**
   * Liste des artisans
   */
  getArtisans: (params?: { status?: string; validated?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<any[]>(`/admin/artisans${query ? `?${query}` : ''}`);
  },
  
  /**
   * Valider un artisan
   */
  validateArtisan: (id: string) =>
    apiRequest<{ success: boolean }>(`/admin/artisans/${id}/validate`, {
      method: 'PUT',
    }),
  
  /**
   * Bloquer/Débloquer un artisan
   */
  blockArtisan: (id: string, blocked: boolean) =>
    apiRequest<{ success: boolean }>(`/admin/artisans/${id}/block`, {
      method: 'PUT',
      body: JSON.stringify({ blocked }),
    }),
  
  /**
   * Liste des clients
   */
  getClients: (search?: string) =>
    apiRequest<any[]>(`/admin/clients${search ? `?search=${search}` : ''}`),
  
  /**
   * Liste des demandes
   */
  getRequests: (params?: { status?: string; categoryId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<any[]>(`/admin/requests${query ? `?${query}` : ''}`);
  },
  
  /**
   * Liste des retraits
   */
  getWithdrawals: (status?: string) =>
    apiRequest<any[]>(`/admin/withdrawals${status ? `?status=${status}` : ''}`),
  
  /**
   * Traiter un retrait
   */
  processWithdrawal: (id: string, approved: boolean, data?: { rejectionReason?: string; paymentReference?: string }) =>
    apiRequest<{ success: boolean }>(`/admin/withdrawals/${id}/process`, {
      method: 'PUT',
      body: JSON.stringify({ approved, ...data }),
    }),
  
  /**
   * Liste des litiges
   */
  getDisputes: (status?: string) =>
    apiRequest<{ disputes: any[]; lowRatingArtisans: any[] }>(`/admin/disputes${status ? `?status=${status}` : ''}`),
  
  /**
   * Données financières
   */
  getFinances: (period?: string) =>
    apiRequest<any>(`/admin/finances${period ? `?period=${period}` : ''}`),
  
  /**
   * Positions des artisans
   */
  getArtisanLocations: () => apiRequest<any[]>('/admin/artisans/locations'),
  
  /**
   * Notifications admin
   */
  getNotifications: () => apiRequest<any[]>('/admin/notifications'),
};

// ================================
// HEALTH CHECK
// ================================

export const healthCheck = () =>
  apiRequest<{ status: string; database: string }>('/health');

export default {
  auth: authAPI,
  categories: categoriesAPI,
  client: clientAPI,
  requests: requestsAPI,
  artisan: artisanAPI,
  missions: missionsAPI,
  admin: adminAPI,
  healthCheck,
  setAuthToken,
  getAuthToken,
};
