/**
 * Client Supabase pour Tëgg Platform
 * Project ID: bzgxtsepphljwqsbvtds
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bzgxtsepphljwqsbvtds.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce',
  },
});

/**
 * Types pour les tables Supabase
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      subcategories: {
        Row: SubCategory;
        Insert: SubCategoryInsert;
        Update: SubCategoryUpdate;
      };
      service_requests: {
        Row: ServiceRequestDB;
        Insert: ServiceRequestInsert;
        Update: ServiceRequestUpdate;
      };
      notifications: {
        Row: NotificationDB;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
      };
      withdrawal_requests: {
        Row: WithdrawalRequestDB;
        Insert: WithdrawalRequestInsert;
        Update: WithdrawalRequestUpdate;
      };
      reviews: {
        Row: Review;
        Insert: ReviewInsert;
        Update: ReviewUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'client' | 'artisan' | 'admin';
      service_category: 'electricite' | 'froid' | 'plomberie' | 'menuiserie' | 'peinture';
      service_type: 'installation' | 'reparation';
      request_status: 'en_attente' | 'en_cours' | 'terminee' | 'annulee';
      notification_type: 'info' | 'success' | 'warning' | 'error';
      transaction_type: 'deposit' | 'withdrawal' | 'earning' | 'commission' | 'refund';
      withdrawal_status: 'pending' | 'approved' | 'rejected';
    };
  };
}

// Profile Table
export interface Profile {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: Database['Enums']['user_role'];
  avatar_url?: string;
  is_active: boolean;
  is_validated?: boolean;
  created_at: string;
  updated_at: string;

  // Artisan fields
  category?: Database['Enums']['service_category'];
  sub_categories?: string[];
  rating?: number;
  total_missions?: number;
  balance?: number;
  balance_threshold?: number;
  latitude?: number;
  longitude?: number;
  is_online?: boolean;

  // Client fields
  client_type?: 'particulier' | 'entreprise';
  address?: string;
}

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<ProfileInsert>;

// Category Table
export interface Category {
  id: string;
  name: string;
  name_en: string;
  icon: string;
  color: string;
  order_index: number;
  is_active: boolean;
}

export type CategoryInsert = Omit<Category, 'id'>;
export type CategoryUpdate = Partial<CategoryInsert>;

// SubCategory Table
export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  name_en: string;
  icon: string;
  order_index: number;
  is_active: boolean;
}

export type SubCategoryInsert = Omit<SubCategory, 'id'>;
export type SubCategoryUpdate = Partial<SubCategoryInsert>;

// Service Request Table
export interface ServiceRequestDB {
  id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  category: Database['Enums']['service_category'];
  sub_category?: string;
  service_type: Database['Enums']['service_type'];
  element_count: number;
  description: string;
  address: string;
  quartier: string;
  latitude: number;
  longitude: number;
  is_urgent: boolean;
  status: Database['Enums']['request_status'];
  created_at: string;
  updated_at: string;

  artisan_id?: string;
  artisan_name?: string;
  artisan_phone?: string;
  accepted_at?: string;
  completed_at?: string;

  artisan_amount?: number;
  client_amount?: number;
  commission?: number;
  client_validated?: boolean;
  artisan_validated?: boolean;
}

export type ServiceRequestInsert = Omit<ServiceRequestDB, 'id' | 'created_at' | 'updated_at'>;
export type ServiceRequestUpdate = Partial<ServiceRequestInsert>;

// Notification Table
export interface NotificationDB {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: Database['Enums']['notification_type'];
  read: boolean;
  link?: string;
  created_at: string;
}

export type NotificationInsert = Omit<NotificationDB, 'id' | 'created_at'>;
export type NotificationUpdate = Partial<NotificationInsert>;

// Transaction Table
export interface Transaction {
  id: string;
  user_id: string;
  type: Database['Enums']['transaction_type'];
  amount: number;
  balance_after: number;
  reference?: string;
  payment_method?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>;
export type TransactionUpdate = Partial<TransactionInsert>;

// Withdrawal Request Table
export interface WithdrawalRequestDB {
  id: string;
  artisan_id: string;
  artisan_name: string;
  amount: number;
  status: Database['Enums']['withdrawal_status'];
  requested_at: string;
  processed_at?: string;
  rejection_reason?: string;
  payment_reference?: string;
}

export type WithdrawalRequestInsert = Omit<WithdrawalRequestDB, 'id'>;
export type WithdrawalRequestUpdate = Partial<WithdrawalRequestInsert>;

// Review Table
export interface Review {
  id: string;
  request_id: string;
  client_id: string;
  artisan_id: string;
  rating: number;
  review?: string;
  created_at: string;
}

export type ReviewInsert = Omit<Review, 'id' | 'created_at'>;
export type ReviewUpdate = Partial<ReviewInsert>;

export default supabase;
