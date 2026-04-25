import React, { useState } from 'react';
import { Zap, Snowflake, Wrench, Hammer, Paintbrush, User, Lock, ChevronLeft, Phone, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole, ServiceCategory } from '../types';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
  initialRole?: UserRole;
  pendingCategory?: ServiceCategory | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack, initialRole = 'client', pendingCategory }) => {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [selectedRole] = useState<UserRole>(initialRole);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('electricite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = login(phone, password, selectedRole);
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

  const handleRegister = async () => {
    if (!phone || !firstName || !lastName) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    setError('');
    
    // Simulate OTP verification
    setMode('verify');
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 4) {
      setError('Veuillez entrer le code à 4 chiffres');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      register({
        phone,
        firstName,
        lastName,
        email: `${phone.replace(/\s/g, '')}@tegg.sn`,
        ...(selectedRole === 'artisan' && { category }),
      }, selectedRole);
      
      login(phone, password, selectedRole);
      onLogin();
    } catch {
      setError('Une erreur est survenue');
    }
    setLoading(false);
  };

  const categories = [
    { id: 'electricite', name: 'Électricité', icon: Zap, color: 'text-amber-500 bg-amber-50' },
    { id: 'froid', name: 'Froid', icon: Snowflake, color: 'text-blue-500 bg-blue-50' },
    { id: 'plomberie', name: 'Plomberie', icon: Wrench, color: 'text-emerald-500 bg-emerald-50' },
    { id: 'menuiserie', name: 'Menuiserie', icon: Hammer, color: 'text-purple-500 bg-purple-50' },
    { id: 'peinture', name: 'Peinture', icon: Paintbrush, color: 'text-pink-500 bg-pink-50' },
  ];

  const roleConfig = {
    client: {
      title: 'Client',
      subtitle: 'Trouvez des artisans qualifiés',
      icon: User,
      color: 'from-emerald-500 to-teal-600',
    },
    artisan: {
      title: 'Artisan',
      subtitle: 'Recevez des demandes de clients',
      icon: Wrench,
      color: 'from-blue-500 to-indigo-600',
    },
    admin: {
      title: 'Administrateur',
      subtitle: 'Gérez la plateforme',
      icon: User,
      color: 'from-purple-500 to-violet-600',
    },
  };

  const currentConfig = roleConfig[selectedRole];

  // Verification code screen
  if (mode === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex flex-col">
        <div className="pt-safe">
          <div className="px-5 py-4">
            <button
              onClick={() => setMode('register')}
              className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="w-5 h-5" />
              Retour
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-8">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Phone className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Vérification</h2>
              <p className="text-slate-500">
                Entrez le code envoyé au<br />
                <span className="font-medium text-slate-700">{phone}</span>
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* OTP Input */}
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={verificationCode[index] || ''}
                    onChange={(e) => {
                      const newCode = verificationCode.split('');
                      newCode[index] = e.target.value;
                      setVerificationCode(newCode.join(''));
                      if (e.target.value && index < 3) {
                        const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`) as HTMLInputElement;
                        nextInput?.focus();
                      }
                    }}
                    name={`otp-${index}`}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                ))}
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl text-sm text-emerald-700 text-center">
                💡 Mode démo: Entrez <span className="font-bold">1234</span> comme code
              </div>

              <Button
                onClick={handleVerifyCode}
                loading={loading}
                className="w-full"
                size="lg"
                disabled={verificationCode.length !== 4}
              >
                Vérifier
              </Button>

              <p className="text-center text-sm text-slate-500">
                Pas reçu le code ?{' '}
                <button className="text-emerald-600 font-medium hover:underline">
                  Renvoyer
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex flex-col">
      {/* Header */}
      <div className="pt-safe">
        <div className="px-5 py-4">
          <button
            onClick={mode === 'register' ? () => setMode('login') : onBack}
            className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8">
        <div className="max-w-md mx-auto">
          {/* Role indicator */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${currentConfig.color} flex items-center justify-center shadow-lg mb-4`}>
              <currentConfig.icon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {mode === 'login' ? 'Connexion' : 'Inscription'}
            </h2>
            <p className="text-slate-500 mt-1">
              Espace {currentConfig.title}
            </p>
            {pendingCategory && selectedRole === 'client' && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                {(() => {
                  const cat = categories.find(c => c.id === pendingCategory);
                  return cat && (
                    <>
                      <cat.icon className={`w-4 h-4 ${cat.color.split(' ')[0]}`} />
                      <span className="text-sm text-emerald-700 font-medium">{cat.name}</span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    placeholder="Votre prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                  />
                  <Input
                    label="Nom"
                    placeholder="Votre nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                {selectedRole === 'artisan' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Catégorie de métier
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id as ServiceCategory)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            category === cat.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center mx-auto mb-1`}>
                            <cat.icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-slate-700">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <Input
              label="Numéro de téléphone"
              type="tel"
              placeholder="+221 77 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-4 h-4" />}
            />

            {mode === 'login' && (
              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />
            )}

            <div className="p-4 bg-emerald-50 rounded-xl text-sm text-emerald-700">
              <p className="font-medium mb-1">Mode démo :</p>
              <p>Utilisez n'importe quel numéro pour tester</p>
            </div>

            <Button
              onClick={mode === 'login' ? handleLogin : handleRegister}
              loading={loading}
              className="w-full"
              size="lg"
              icon={mode === 'register' ? <UserPlus className="w-4 h-4" /> : undefined}
            >
              {mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              {mode === 'login' ? (
                <>
                  Pas encore de compte ?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-emerald-600 font-medium hover:underline"
                  >
                    S'inscrire
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-emerald-600 font-medium hover:underline"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-slate-400">
        <p>En continuant, vous acceptez nos conditions d'utilisation</p>
      </div>
    </div>
  );
};
