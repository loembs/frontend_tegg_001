import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { User, Artisan, Client, ServiceRequest, Notification, UserRole } from '../types';
import { mockArtisans, mockClients, mockRequests, mockNotifications } from '../data/mockData';
import api, { setAuthToken, getAuthToken } from '../services/api';

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
  logout: () => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    userRole: null,
    artisans: mockArtisans,
    clients: mockClients,
    requests: mockRequests,
    notifications: mockNotifications,
    isAuthenticated: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Load current user data
      api.auth.me().then(user => {
        setState(prev => ({
          ...prev,
          currentUser: user,
          isAuthenticated: true,
          userRole: user.role as UserRole,
        }));
      }).catch(() => {
        setAuthToken(null);
      });
    }
  }, []);

  const login = async (phone: string, password: string, role: UserRole): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.auth.login(phone, password);
      
      if (response.success && response.token) {
        setAuthToken(response.token);
        setState(prev => ({
          ...prev,
          currentUser: response.user,
          userRole: role,
          isAuthenticated: true,
        }));
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setState(prev => ({
      ...prev,
      currentUser: null,
      userRole: null,
      isAuthenticated: false,
    }));
  };

  const register = async (userData: Partial<User | Artisan | Client>, role: UserRole): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const data = {
        phone: (userData as any).phone || '',
        password: (userData as any).password || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        userType: role,
        categoryId: (userData as Partial<Artisan>).category,
        ...userData,
      };
      
      const response = await api.auth.register(data);
      
      if (response.success && response.token) {
        setAuthToken(response.token);
        setState(prev => ({
          ...prev,
          currentUser: response.user,
          userRole: role,
          isAuthenticated: true,
        }));
        return true;
      }
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
      await api.artisan.updateProfile(data);
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
      await api.client.updateProfile(data);
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
      const response = await api.requests.create({
        categoryId: request.category,
        subcategoryId: request.subCategory,
        serviceType: request.serviceType,
        title: request.description,
        description: request.description,
        quantity: request.elementCount,
        isUrgent: request.isUrgent,
        address: request.address,
        neighborhood: request.quartier,
        latitude: request.latitude,
        longitude: request.longitude,
      });

      const newRequest: ServiceRequest = {
        ...request,
        id: response.request.id,
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
      const response = await api.missions.accept(requestId);
      
      const artisan = state.artisans.find(a => a.id === artisanId);
      if (artisan) {
        // Deduct provision
        setState(prev => ({
          ...prev,
          artisans: prev.artisans.map(a => 
            a.id === artisanId ? { ...a, balance: response.newBalance } : a
          ),
        }));
      }

      const request = state.requests.find(r => r.id === requestId);
      if (request) {
        setState(prev => ({
          ...prev,
          requests: prev.requests.map(r => r.id === requestId ? {
            ...r,
            status: 'en_cours',
            artisanId,
            acceptedAt: new Date(),
          } : r),
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'acceptation';
      setError(errorMessage);
      throw err;
    }
  };

  const completeRequest = async (requestId: string, amount: number, isArtisan: boolean) => {
    try {
      if (isArtisan) {
        await api.missions.complete(requestId, amount);
      } else {
        await api.requests.confirm(requestId, amount);
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
      await api.requests.cancel(requestId);
      updateRequest(requestId, { status: 'annulee' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'annulation';
      setError(errorMessage);
      throw err;
    }
  };

  const rateArtisan = async (requestId: string, rating: number, review: string) => {
    try {
      await api.requests.confirm(requestId, 0, rating, review);
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

  const markNotificationRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  };

  const requestWithdrawal = async (_artisanId: string, _amount: number) => {
    try {
      await api.artisan.withdraw();
      // Optionally update UI after successful withdrawal
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de demande de retrait';
      setError(errorMessage);
      throw err;
    }
  };

  const depositBalance = async (_artisanId: string, amount: number) => {
    try {
      await api.artisan.deposit(amount);
      // Optionally update UI after successful deposit
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de dépôt';
      setError(errorMessage);
      throw err;
    }
  };

  const validateArtisan = async (artisanId: string, validated: boolean) => {
    try {
      await api.admin.validateArtisan(artisanId);
      updateArtisan(artisanId, { isValidated: validated });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de validation';
      setError(errorMessage);
      throw err;
    }
  };

  const blockArtisan = async (artisanId: string, blocked: boolean) => {
    try {
      await api.admin.blockArtisan(artisanId, blocked);
      updateArtisan(artisanId, { isActive: !blocked });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de blocage';
      setError(errorMessage);
      throw err;
    }
  };

  const contextValue = useMemo(() => ({
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
  }), [state, loading, error]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
