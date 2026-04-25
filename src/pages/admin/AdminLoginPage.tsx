import React, { useState } from 'react';
import { Shield, Lock, Phone, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';

interface AdminLoginPageProps {
  onLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLogin }) => {
  const { login } = useApp();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const success = login(phone, password, 'admin');
      if (success) {
        onLogin();
      } else {
        setError('Identifiants incorrects');
      }
    } catch {
      setError('Une erreur est survenue');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Tëgg Admin
            </h1>
            <p className="text-white/60">
              Dashboard d'administration
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="tel"
                  placeholder="+221 33 800 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                />
              </div>
            </div>

            <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-xl text-sm text-purple-200">
              <p className="font-medium mb-1">🔐 Accès sécurisé</p>
              <p className="text-purple-300/80">Mode démo: +221 33 800 00 00 / admin</p>
            </div>

            <Button
              onClick={handleLogin}
              loading={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Accéder au Dashboard
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-sm text-white/40">
              © 2024 Tëgg - Plateforme de services
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-sm">
          <Lock className="w-4 h-4" />
          <span>Connexion sécurisée SSL</span>
        </div>
      </div>
    </div>
  );
};
