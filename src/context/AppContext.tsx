import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Artisan, Client, ServiceRequest, Notification, UserRole } from '../types';
import { mockArtisans, mockClients, mockRequests, mockNotifications } from '../data/mockData';

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
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  register: (userData: Partial<User | Artisan | Client>, role: UserRole) => boolean;
  updateArtisan: (id: string, data: Partial<Artisan>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  createRequest: (request: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateRequest: (id: string, data: Partial<ServiceRequest>) => void;
  acceptRequest: (requestId: string, artisanId: string) => void;
  completeRequest: (requestId: string, amount: number, isArtisan: boolean) => void;
  cancelRequest: (requestId: string) => void;
  rateArtisan: (requestId: string, rating: number, review: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  requestWithdrawal: (artisanId: string, amount: number) => void;
  depositBalance: (artisanId: string, amount: number) => void;
  validateArtisan: (artisanId: string, validated: boolean) => void;
  blockArtisan: (artisanId: string, blocked: boolean) => void;
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

  const login = (phone: string, _password: string, role: UserRole): boolean => {
    // Admin login with phone
    if (role === 'admin' && (phone === '+221 33 800 00 00' || phone === 'admin@tegg.sn')) {
      setState(prev => ({
        ...prev,
        currentUser: {
          id: 'admin',
          email: 'admin@tegg.sn',
          firstName: 'Admin',
          lastName: 'Tëgg',
          phone: '+221 33 800 00 00',
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
        },
        userRole: 'admin',
        isAuthenticated: true,
      }));
      return true;
    }

    if (role === 'artisan') {
      const artisan = state.artisans.find(a => a.phone === phone || a.email === phone);
      if (artisan) {
        setState(prev => ({
          ...prev,
          currentUser: artisan,
          userRole: 'artisan',
          isAuthenticated: true,
        }));
        return true;
      }
    }

    if (role === 'client') {
      const client = state.clients.find(c => c.phone === phone || c.email === phone);
      if (client) {
        setState(prev => ({
          ...prev,
          currentUser: client,
          userRole: 'client',
          isAuthenticated: true,
        }));
        return true;
      }
    }

    // Demo mode - create temp user with phone
    const demoUser: User = {
      id: `demo_${Date.now()}`,
      email: `${phone.replace(/\s/g, '').replace('+', '')}@tegg.sn`,
      firstName: role === 'artisan' ? 'Artisan' : 'Client',
      lastName: 'Demo',
      phone: phone,
      role,
      isActive: true,
      createdAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      currentUser: role === 'artisan' ? {
        ...demoUser,
        category: 'electricite',
        subCategories: ['Prises', 'Éclairage'],
        rating: 4.5,
        totalMissions: 0,
        balance: 5000,
        balanceThreshold: 5000,
        isOnline: true,
        isValidated: true,
        withdrawalRequests: [],
      } as Artisan : {
        ...demoUser,
        type: 'particulier',
      } as Client,
      userRole: role,
      isAuthenticated: true,
    }));
    return true;
  };

  const logout = () => {
    setState(prev => ({
      ...prev,
      currentUser: null,
      userRole: null,
      isAuthenticated: false,
    }));
  };

  const register = (userData: Partial<User | Artisan | Client>, role: UserRole): boolean => {
    const newUser = {
      ...userData,
      id: `${role}_${Date.now()}`,
      role,
      isActive: true,
      createdAt: new Date(),
    };

    if (role === 'artisan') {
      const newArtisan: Artisan = {
        ...newUser,
        category: (userData as Partial<Artisan>).category || 'electricite',
        subCategories: [],
        rating: 5,
        totalMissions: 0,
        balance: 0,
        balanceThreshold: 5000,
        isOnline: false,
        isValidated: false,
        withdrawalRequests: [],
      } as Artisan;
      setState(prev => ({
        ...prev,
        artisans: [...prev.artisans, newArtisan],
      }));
    } else if (role === 'client') {
      const newClient: Client = {
        ...newUser,
        type: (userData as Partial<Client>).type || 'particulier',
      } as Client;
      setState(prev => ({
        ...prev,
        clients: [...prev.clients, newClient],
      }));
    }

    return true;
  };

  const updateArtisan = (id: string, data: Partial<Artisan>) => {
    setState(prev => ({
      ...prev,
      artisans: prev.artisans.map(a => a.id === id ? { ...a, ...data } : a),
      currentUser: prev.currentUser?.id === id ? { ...prev.currentUser, ...data } : prev.currentUser,
    }));
  };

  const updateClient = (id: string, data: Partial<Client>) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === id ? { ...c, ...data } : c),
      currentUser: prev.currentUser?.id === id ? { ...prev.currentUser, ...data } : prev.currentUser,
    }));
  };

  const createRequest = (request: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: ServiceRequest = {
      ...request,
      id: `req_${Date.now()}`,
      status: 'en_attente',
      createdAt: new Date(),
    };
    setState(prev => ({
      ...prev,
      requests: [newRequest, ...prev.requests],
    }));

    // Notify artisans of the category
    state.artisans
      .filter(a => a.category === request.category && a.isOnline && a.isValidated)
      .forEach(artisan => {
        addNotification({
          userId: artisan.id,
          title: 'Nouvelle demande',
          message: `Nouvelle demande de ${request.serviceType} - ${request.subCategory} à ${request.quartier}`,
          type: 'info',
          read: false,
        });
      });
  };

  const updateRequest = (id: string, data: Partial<ServiceRequest>) => {
    setState(prev => ({
      ...prev,
      requests: prev.requests.map(r => r.id === id ? { ...r, ...data } : r),
    }));
  };

  const acceptRequest = (requestId: string, artisanId: string) => {
    const artisan = state.artisans.find(a => a.id === artisanId);
    if (!artisan || artisan.balance < 500) return;

    // Deduct provision (500 FCFA)
    updateArtisan(artisanId, { balance: artisan.balance - 500 });

    const request = state.requests.find(r => r.id === requestId);
    setState(prev => ({
      ...prev,
      requests: prev.requests.map(r => r.id === requestId ? {
        ...r,
        status: 'en_cours',
        artisanId,
        artisanName: `${artisan.firstName} ${artisan.lastName}`,
        artisanPhone: artisan.phone,
        acceptedAt: new Date(),
      } : r),
    }));

    // Notify client
    if (request) {
      addNotification({
        userId: request.clientId,
        title: 'Demande acceptée',
        message: `${artisan.firstName} ${artisan.lastName} a accepté votre demande`,
        type: 'success',
        read: false,
      });
    }
  };

  const completeRequest = (requestId: string, amount: number, isArtisan: boolean) => {
    const request = state.requests.find(r => r.id === requestId);
    if (!request) return;

    if (isArtisan) {
      updateRequest(requestId, {
        artisanAmount: amount,
        artisanValidated: true,
      });
      
      // Notify client
      addNotification({
        userId: request.clientId,
        title: 'Mission terminée',
        message: 'Veuillez confirmer et saisir le montant payé pour recevoir la garantie',
        type: 'info',
        read: false,
      });
    } else {
      updateRequest(requestId, {
        clientAmount: amount,
        clientValidated: true,
      });
    }

    // Check if both validated
    const updatedRequest = {
      ...request,
      ...(isArtisan ? { artisanAmount: amount, artisanValidated: true } : { clientAmount: amount, clientValidated: true }),
    };

    if (updatedRequest.artisanValidated && updatedRequest.clientValidated) {
      // Calculate commission - 1% of final amount, minimum 500 FCFA
      const finalAmount = updatedRequest.artisanAmount || updatedRequest.clientAmount || 0;
      let commission = Math.max(finalAmount * 0.01, 500);
      
      // Already took 500 FCFA provision
      const remainingCommission = commission - 500;
      
      if (request.artisanId) {
        const artisan = state.artisans.find(a => a.id === request.artisanId);
        if (artisan && remainingCommission > 0) {
          updateArtisan(request.artisanId, { 
            balance: artisan.balance - remainingCommission,
            totalMissions: artisan.totalMissions + 1,
          });
        }
      }

      updateRequest(requestId, {
        status: 'terminee',
        completedAt: new Date(),
        commission,
      });
    }
  };

  const cancelRequest = (requestId: string) => {
    updateRequest(requestId, { status: 'annulee' });
  };

  const rateArtisan = (requestId: string, rating: number, review: string) => {
    const request = state.requests.find(r => r.id === requestId);
    if (!request || !request.artisanId) return;

    updateRequest(requestId, { rating, review });

    // Update artisan rating
    const artisan = state.artisans.find(a => a.id === request.artisanId);
    if (artisan) {
      const completedRequests = state.requests.filter(
        r => r.artisanId === artisan.id && r.status === 'terminee' && r.rating
      );
      const totalRatings = completedRequests.reduce((sum, r) => sum + (r.rating || 0), 0) + rating;
      const newRating = totalRatings / (completedRequests.length + 1);
      
      updateArtisan(artisan.id, { rating: Math.round(newRating * 10) / 10 });

      // Alert if rating < 3
      if (newRating < 3) {
        addNotification({
          userId: 'admin',
          title: 'Alerte notation',
          message: `${artisan.firstName} ${artisan.lastName} a une note de ${newRating.toFixed(1)} étoiles`,
          type: 'error',
          read: false,
        });
      }
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

  const requestWithdrawal = (artisanId: string, amount: number) => {
    const artisan = state.artisans.find(a => a.id === artisanId);
    if (!artisan || artisan.balance < amount) return;

    const withdrawal = {
      id: `wr_${Date.now()}`,
      artisanId,
      artisanName: `${artisan.firstName} ${artisan.lastName}`,
      amount,
      requestedAt: new Date(),
      status: 'pending' as const,
    };

    updateArtisan(artisanId, {
      withdrawalRequests: [...artisan.withdrawalRequests, withdrawal],
    });

    addNotification({
      userId: 'admin',
      title: 'Demande de retrait',
      message: `${artisan.firstName} ${artisan.lastName} demande un retrait de ${amount.toLocaleString()} FCFA`,
      type: 'warning',
      read: false,
    });
  };

  const depositBalance = (artisanId: string, amount: number) => {
    const artisan = state.artisans.find(a => a.id === artisanId);
    if (!artisan) return;

    updateArtisan(artisanId, { balance: artisan.balance + amount });
  };

  const validateArtisan = (artisanId: string, validated: boolean) => {
    updateArtisan(artisanId, { isValidated: validated });
  };

  const blockArtisan = (artisanId: string, blocked: boolean) => {
    updateArtisan(artisanId, { isActive: !blocked });
  };

  return (
    <AppContext.Provider value={{
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
    }}>
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
