// Types pour l'application Tëgg

export type UserRole = 'client' | 'artisan' | 'admin';

export type ServiceCategory = 'electricite' | 'froid' | 'plomberie' | 'menuiserie' | 'peinture';

export type ServiceType = 'installation' | 'reparation';

export type RequestStatus = 'en_attente' | 'en_cours' | 'terminee' | 'annulee';

export type SubCategory = {
  id: string;
  name: string;
  icon: string;
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  isActive: boolean;
  isValidated?: boolean;
}

export interface Artisan extends User {
  role: 'artisan';
  category: ServiceCategory;
  subCategories: string[];
  rating: number;
  totalMissions: number;
  balance: number;
  balanceThreshold: number;
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
  withdrawalRequests: WithdrawalRequest[];
}

export interface Client extends User {
  role: 'client';
  type: 'particulier' | 'entreprise';
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  category: ServiceCategory;
  subCategory: string;
  serviceType: ServiceType;
  elementCount: number;
  description: string;
  address: string;
  quartier: string;
  latitude: number;
  longitude: number;
  isUrgent: boolean;
  status: RequestStatus;
  createdAt: Date;
  artisanId?: string;
  artisanName?: string;
  artisanPhone?: string;
  acceptedAt?: Date;
  completedAt?: Date;
  artisanAmount?: number;
  clientAmount?: number;
  commission?: number;
  clientValidated?: boolean;
  artisanValidated?: boolean;
  rating?: number;
  review?: string;
  distance?: number;
}

export interface Mission {
  id: string;
  request: ServiceRequest;
  artisan: Artisan;
  startedAt: Date;
  completedAt?: Date;
  amount?: number;
  commission?: number;
  hasDispute?: boolean;
  disputeReason?: string;
}

export interface WithdrawalRequest {
  id: string;
  artisanId: string;
  artisanName: string;
  amount: number;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  processedAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  link?: string;
}

export interface FinanceStats {
  totalRevenue: number;
  totalCommissions: number;
  totalDeposits: number;
  pendingWithdrawals: number;
  dailyRevenue: { date: string; amount: number }[];
  weeklyRevenue: { week: string; amount: number }[];
  monthlyRevenue: { month: string; amount: number }[];
}

export interface DashboardStats {
  totalArtisans: number;
  activeArtisans: number;
  pendingValidation: number;
  totalClients: number;
  totalRequests: number;
  pendingRequests: number;
  activeRequests: number;
  completedRequests: number;
  totalRevenue: number;
  todayRevenue: number;
  disputes: number;
  lowRatingAlerts: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  revenue: number;
}

export interface QuartierStats {
  quartier: string;
  count: number;
}
