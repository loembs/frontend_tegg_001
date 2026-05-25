/**
 * Version Supabase de App.tsx
 * Remplacez le contenu de App.tsx par ce fichier
 */

import { useState, useEffect } from 'react';
import { SupabaseAppProvider, useSupabaseApp } from './context/SupabaseAppContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ArtisanDashboard } from './pages/artisan/ArtisanDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { ServiceCategory, UserRole } from './types';

function AppContent() {
  const { isAuthenticated, userRole, loading } = useSupabaseApp();
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'dashboard' | 'admin-login'>('home');
  const [pendingUserType, setPendingUserType] = useState<UserRole>('client');
  const [pendingCategory, setPendingCategory] = useState<ServiceCategory | null>(null);

  // Check URL for admin access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminAccess = urlParams.get('admin') === 'true' || window.location.pathname === '/admin';

    if (isAdminAccess) {
      setCurrentPage('admin-login');
    }
  }, []);

  // Check if user is authenticated
  const isLoggedIn = isAuthenticated;

  const handleLogin = () => {
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentPage('home');
    setPendingCategory(null);
    // Clear admin URL parameter
    window.history.replaceState({}, document.title, window.location.pathname.replace('/admin', '/'));
  };

  // Handle navigation from home page
  const handleSearchArtisan = (category?: ServiceCategory) => {
    setPendingUserType('client');
    setPendingCategory(category || null);
    setCurrentPage('login');
  };

  const handleIAmArtisan = () => {
    setPendingUserType('artisan');
    setPendingCategory(null);
    setCurrentPage('login');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setPendingCategory(null);
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Admin Login Page (Web Dashboard)
  if (currentPage === 'admin-login') {
    if (isLoggedIn && userRole === 'admin') {
      return <AdminDashboard onLogout={handleLogout} />;
    }
    return <AdminLoginPage onLogin={handleLogin} />;
  }

  // Show home page first (Mobile)
  if (currentPage === 'home') {
    return (
      <HomePage
        onSearchArtisan={handleSearchArtisan}
        onIAmArtian={handleIAmArtisan}
      />
    );
  }

  // Show login page (Mobile)
  if (currentPage === 'login' || !isLoggedIn) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={handleBackToHome}
        initialRole={pendingUserType}
        pendingCategory={pendingCategory}
      />
    );
  }

  // Render appropriate dashboard based on user role
  switch (userRole) {
    case 'admin':
      return <AdminDashboard onLogout={handleLogout} />;
    case 'artisan':
      return <ArtisanDashboard onLogout={handleLogout} />;
    case 'client':
      return (
        <ClientDashboard
          onLogout={handleLogout}
          initialCategory={pendingCategory}
        />
      );
    default:
      return (
        <LoginPage
          onLogin={handleLogin}
          onBack={handleBackToHome}
          initialRole={pendingUserType}
          pendingCategory={pendingCategory}
        />
      );
  }
}

export function App() {
  return (
    <SupabaseAppProvider>
      <AppContent />
    </SupabaseAppProvider>
  );
}
