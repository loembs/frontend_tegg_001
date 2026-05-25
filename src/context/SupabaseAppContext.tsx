/**
 * AppContext avec Supabase pour Tëgg Platform
 * Remplacement du context utilisant l'API backend par Supabase
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Artisan, Client, ServiceRequest, Notification, UserRole, ServiceCategory } from '../types';
import {
  authService,
  profilesService,
  requestsService,
  missionsService,
  notificationsService,
  artisanService,
  clientService,
  adminService,
  supabase,
  Profile,
  ServiceRequestDB,
  NotificationDB,
} from '../services/supabase';

interface AppState {
  currentUser: User | Artisan | Client | null;
  userRole: UserRole | null;
  artisans: Artisan[];
  clients: Client[];
  requests: ServiceRequest[];
  notifications: Notification[];
  isAuthenticated: boolean;
}

interface AppContextType extends AppState {
  login: (phone: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: Partial<User | Artisan | Client>, role: UserRole) => Promise<boolean>;
  updateArtisan: (id: string, data: Partial<Artisan>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  createRequest: (request: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateRequest: (id: string, data: Partial<ServiceRequest>) => void;
  acceptRequest: (requestId: string, artisanId: string) => Promise<void>;
  completeRequest: (requestId: string, amount: number, isArtisan: boolean) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  rateArtisan: (requestId: string, rating: number, review: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  requestWithdrawal: (artisanId: string, amount: number) => Promise<void>;
  depositBalance: (artisanId: string, amount: number) => Promise<void>;
  validateArtisan: (artisanId: string, validated: boolean) => Promise<void>;
  blockArtisan: (artisanId: string, blocked: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const mapProfileToUser = (profile: Profile): User | Artisan | Client => {
  const baseUser: User = {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    role: profile.role as UserRole,
    avatar: profile.avatar_url,
    createdAt: new Date(profile.created_at),
    isActive: profile.is_active,
    isValidated: profile.is_validated,
  };

  if (profile.role === 'artisan') {
    return {
      ...baseUser,
      role: 'artisan',
      category: profile.category as ServiceCategory,
      subCategories: profile.sub_categories || [],
      rating: profile.rating || 0,
      totalMissions: profile.total_missions || 0,
      balance: profile.balance || 0,
      balanceThreshold: profile.balance_threshold || 5000,
      latitude: profile.latitude,
      longitude: profile.longitude,
      isOnline: profile.is_online || false,
      withdrawalRequests: [],
    };
  }

  if (profile.role === 'client') {
    return {
      ...baseUser,
      role: 'client',
      type: (profile.client_type as 'particulier' | 'entreprise') || 'particulier',
      address: profile.address,
      latitude: profile.latitude,
      longitude: profile.longitude,
    };
  }

  return baseUser;
};

const mapServiceRequest = (sr: ServiceRequestDB): ServiceRequest => ({
  id: sr.id,
  clientId: sr.client_id,
  clientName: sr.client_name,
  clientPhone: sr.client_phone,
  category: sr.category,
  subCategory: sr.sub_category || '',
  serviceType: sr.service_type,
  elementCount: sr.element_count,
  description: sr.description,
  address: sr.address,
  quartier: sr.quartier || '',
  latitude: sr.latitude,
  longitude: sr.longitude,
  isUrgent: sr.is_urgent,
  status: sr.status,
  createdAt: new Date(sr.created_at),
  artisanId: sr.artisan_id,
  artisanName: sr.artisan_name,
  artisanPhone: sr.artisan_phone,
  acceptedAt: sr.accepted_at ? new Date(sr.accepted_at) : undefined,
  completedAt: sr.completed_at ? new Date(sr.completed_at) : undefined,
  artisanAmount: sr.artisan_amount,
  clientAmount: sr.client_amount,
  commission: sr.commission,
  clientValidated: sr.client_validated,
  artisanValidated: sr.artisan_validated,
});

const mapNotification = (n: NotificationDB): Notification => ({
  id: n.id,
  userId: n.user_id,
  title: n.title,
  message: n.message,
  type: n.type,
  read: n.read,
  createdAt: new Date(n.created_at),
  link: n.link,
});

export const SupabaseAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    userRole: null,
    artisans: [],
    clients: [],
    requests: [],
    notifications: [],
    isAuthenticated: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier la session au chargement
  useEffect(() => {
    checkSession();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setState({
          currentUser: null,
          userRole: null,
          artisans: [],
          clients: [],
          requests: [],
          notifications: [],
          isAuthenticated: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadUserData(session.user.id);
      }
    } catch (err) {
      console.error('Erreur lors de la vérification de session:', err);
    }
  };

  const loadUserData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: profile } = await profilesService.getProfile(userId);

      if (profile) {
        const user = mapProfileToUser(profile);
        setState(prev => ({
          ...prev,
          currentUser: user,
          userRole: profile.role as UserRole,
          isAuthenticated: true,
        }));

        // Charger les données spécifiques au rôle
        if (profile.role === 'client') {
          await loadClientData(userId);
        } else if (profile.role === 'artisan') {
          await loadArtisanData(userId);
        } else if (profile.role === 'admin') {
          await loadAdminData();
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClientData = async (clientId: string) => {
    try {
      const [requestsResult, notificationsResult] = await Promise.all([
        requestsService.list(clientId),
        notificationsService.list(clientId),
      ]);

      setState(prev => ({
        ...prev,
        requests: (requestsResult.data || []).map(mapServiceRequest),
        notifications: (notificationsResult.data || []).map(mapNotification),
      }));
    } catch (err) {
      console.error('Erreur lors du chargement des données client:', err);
    }
  };

  const loadArtisanData = async (artisanId: string) => {
    try {
      const [missionsResult, notificationsResult, artisansResult] = await Promise.all([
        missionsService.list(artisanId),
        notificationsService.list(artisanId),
        artisanService.getAvailableArtisans(),
      ]);

      setState(prev => ({
        ...prev,
        requests: (missionsResult.data || []).map(mapServiceRequest),
        notifications: (notificationsResult.data || []).map(mapNotification),
        artisans: (artisansResult.data || []).map(p => mapProfileToUser(p) as Artisan),
      }));
    } catch (err) {
      console.error('Erreur lors du chargement des données artisan:', err);
    }
  };

  const loadAdminData = async () => {
    try {
      const [artisansResult, clientsResult, requestsResult] = await Promise.all([
        adminService.getArtisans(),
        adminService.getClients(),
        adminService.getRequests(),
      ]);

      setState(prev => ({
        ...prev,
        artisans: (artisansResult.data || []).map(p => mapProfileToUser(p) as Artisan),
        clients: (clientsResult.data || []).map(p => mapProfileToUser(p) as Client),
        requests: (requestsResult.data || []).map(mapServiceRequest),
      }));
    } catch (err) {
      console.error('Erreur lors du chargement des données admin:', err);
    }
  };

  const refreshData = async () => {
    if (state.currentUser) {
      await loadUserData(state.currentUser.id);
    }
  };

  const login = async (phone: string, password: string, role: UserRole): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(phone, password);

      if (response.success && response.user) {
        const user = mapProfileToUser(response.user);
        setState(prev => ({
          ...prev,
          currentUser: user,
          userRole: response.user!.role as UserRole,
          isAuthenticated: true,
        }));
        return true;
      }
      setError(response.error || 'Erreur de connexion');
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setState({
      currentUser: null,
      userRole: null,
      artisans: [],
      clients: [],
      requests: [],
      notifications: [],
      isAuthenticated: false,
    });
  };

  const register = async (userData: Partial<User | Artisan | Client>, role: UserRole): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register({
        phone: (userData as any).phone || '',
        password: (userData as any).password || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        userType: role,
        category: (userData as Partial<Artisan>).category,
        email: (userData as any).email,
      });

      if (response.success && response.user) {
        const user = mapProfileToUser(response.user);
        setState(prev => ({
          ...prev,
          currentUser: user,
          userRole: role,
          isAuthenticated: true,
        }));
        return true;
      }
      setError(response.error || 'Erreur d\'enregistrement');
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'enregistrement';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateArtisan = async (id: string, data: Partial<Artisan>) => {
    try {
      const profileData: Partial<Profile> = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        avatar_url: data.avatar,
        latitude: data.latitude,
        longitude: data.longitude,
        is_online: data.isOnline,
      };

      await profilesService.updateProfile(id, profileData);
      setState(prev => ({
        ...prev,
        artisans: prev.artisans.map(a => a.id === id ? { ...a, ...data } : a),
        currentUser: prev.currentUser?.id === id ? { ...prev.currentUser, ...data } : prev.currentUser,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour';
      setError(errorMessage);
    }
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    try {
      const profileData: Partial<Profile> = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        avatar_url: data.avatar,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
      };

      await profilesService.updateProfile(id, profileData);
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c.id === id ? { ...c, ...data } : c),
        currentUser: prev.currentUser?.id === id ? { ...prev.currentUser, ...data } : prev.currentUser,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour';
      setError(errorMessage);
    }
  };

  const createRequest = async (request: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>) => {
    try {
      const { data, error } = await requestsService.create({
        clientId: request.clientId,
        clientName: request.clientName,
        clientPhone: request.clientPhone,
        categoryId: request.category,
        subcategoryId: request.subCategory,
        serviceType: request.serviceType,
        description: request.description,
        quantity: request.elementCount,
        isUrgent: request.isUrgent,
        address: request.address,
        neighborhood: request.quartier,
        latitude: request.latitude,
        longitude: request.longitude,
      });

      if (error || !data) {
        throw new Error(error || 'Erreur lors de la création de la demande');
      }

      const newRequest: ServiceRequest = {
        ...request,
        id: data.request.id,
        status: 'en_attente',
        createdAt: new Date(),
      };

      setState(prev => ({
        ...prev,
        requests: [newRequest, ...prev.requests],
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de création de demande';
      setError(errorMessage);
      throw err;
    }
  };

  const updateRequest = (id: string, data: Partial<ServiceRequest>) => {
    setState(prev => ({
      ...prev,
      requests: prev.requests.map(r => r.id === id ? { ...r, ...data } : r),
    }));
  };

  const acceptRequest = async (requestId: string, artisanId: string) => {
    try {
      if (!state.currentUser) {
        throw new Error('Non connecté');
      }

      const artisanName = `${state.currentUser.firstName} ${state.currentUser.lastName}`;
      const artisanPhone = state.currentUser.phone;

      const { data, error } = await missionsService.accept(
        requestId,
        artisanId,
        artisanName,
        artisanPhone
      );

      if (error || !data) {
        throw new Error(error || 'Erreur lors de l\'acceptation');
      }

      // Mettre à jour le solde local
      setState(prev => ({
        ...prev,
        artisans: prev.artisans.map(a =>
          a.id === artisanId ? { ...a, balance: data.newBalance } : a
        ),
        requests: prev.requests.map(r =>
          r.id === requestId ? {
            ...r,
            status: 'en_cours',
            artisanId,
            artisanName,
            artisanPhone,
            acceptedAt: new Date(),
          } : r
        ),
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'acceptation';
      setError(errorMessage);
      throw err;
    }
  };

  const completeRequest = async (requestId: string, amount: number, isArtisan: boolean) => {
    try {
      if (isArtisan) {
        await missionsService.complete(requestId, amount);
      } else {
        await requestsService.confirm(requestId, amount);
      }

      updateRequest(requestId, {
        status: 'terminee',
        completedAt: new Date(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de complétion';
      setError(errorMessage);
      throw err;
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await requestsService.cancel(requestId);

      if (error) {
        throw new Error(error);
      }

      updateRequest(requestId, { status: 'annulee' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'annulation';
      setError(errorMessage);
      throw err;
    }
  };

  const rateArtisan = async (requestId: string, rating: number, review: string) => {
    try {
      const { error } = await requestsService.confirm(requestId, 0, rating, review);

      if (error) {
        throw new Error(error);
      }

      updateRequest(requestId, { rating, review });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de notation';
      setError(errorMessage);
      throw err;
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}`,
      createdAt: new Date(),
    };
    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications],
    }));
  };

  const markNotificationRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      }));
    } catch (err) {
      console.error('Erreur lors du marquage de la notification:', err);
    }
  };

  const requestWithdrawal = async (_artisanId: string, _amount: number) => {
    try {
      await artisanService.withdraw(_artisanId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de demande de retrait';
      setError(errorMessage);
      throw err;
    }
  };

  const depositBalance = async (artisanId: string, amount: number) => {
    try {
      const { data, error } = await artisanService.deposit(artisanId, amount);

      if (error || !data) {
        throw new Error(error || 'Erreur de dépôt');
      }

      setState(prev => ({
        ...prev,
        artisans: prev.artisans.map(a =>
          a.id === artisanId ? { ...a, balance: data.newBalance } : a
        ),
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de dépôt';
      setError(errorMessage);
      throw err;
    }
  };

  const validateArtisan = async (artisanId: string, validated: boolean) => {
    try {
      if (validated) {
        await adminService.validateArtisan(artisanId);
      }
      setState(prev => ({
        ...prev,
        artisans: prev.artisans.map(a => a.id === artisanId ? { ...a, isValidated: validated } : a),
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de validation';
      setError(errorMessage);
      throw err;
    }
  };

  const blockArtisan = async (artisanId: string, blocked: boolean) => {
    try {
      await adminService.blockArtisan(artisanId, blocked);
      setState(prev => ({
        ...prev,
        artisans: prev.artisans.map(a => a.id === artisanId ? { ...a, isActive: !blocked } : a),
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de blocage';
      setError(errorMessage);
      throw err;
    }
  };

  const contextValue: AppContextType = {
    ...state,
    login,
    logout,
    register,
    updateArtisan,
    updateClient,
    createRequest,
    updateRequest,
    acceptRequest,
    completeRequest,
    cancelRequest,
    rateArtisan,
    addNotification,
    markNotificationRead,
    requestWithdrawal,
    depositBalance,
    validateArtisan,
    blockArtisan,
    loading,
    error,
    refreshData,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useSupabaseApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useSupabaseApp must be used within SupabaseAppProvider');
  }
  return context;
};
