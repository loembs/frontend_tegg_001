import React from 'react';
import { 
  Wrench, Search, ChevronRight, Star, Shield, Users
} from 'lucide-react';
import { ServiceCategory } from '../types';

interface HomePageProps {
  onSearchArtisan: (category?: ServiceCategory) => void;
  onIAmArtisan: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSearchArtisan, onIAmArtisan }) => {
  const stats = [
    { icon: Users, value: '1,500+', label: 'Artisans certifiés' },
    { icon: Star, value: '4.8', label: 'Note moyenne' },
    { icon: Shield, value: '100%', label: 'Garantie service' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Header */}
      <header className="pt-safe">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-emerald-600 text-xl">Tëgg</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-5 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Services à domicile<br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              professionnels
            </span>
          </h1>
          <p className="text-slate-500 text-base max-w-xs mx-auto">
            Trouvez des artisans qualifiés près de chez vous en quelques clics
          </p>
        </div>

        {/* Main CTA Buttons */}
        <div className="space-y-4 max-w-md mx-auto">
          <button
            onClick={() => onSearchArtisan()}
            className="w-full p-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Search className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Je cherche un Artisan</h3>
                  <p className="text-sm text-emerald-100">Trouvez le bon professionnel</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={onIAmArtisan}
            className="w-full p-5 bg-white rounded-2xl border-2 border-slate-100 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-emerald-50 group-hover:to-teal-50 transition-colors">
                  <Wrench className="w-7 h-7 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-800">Je suis un artisan</h3>
                  <p className="text-sm text-slate-500">Rejoignez notre réseau</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-5 py-6">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <stat.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-emerald-600">Tëgg</span>
        </div>
        <p className="text-sm text-slate-400">
          Services à domicile professionnels
        </p>
        <p className="text-xs text-slate-300 mt-2">
          © 2024 Tëgg - Tous droits réservés
        </p>
      </footer>
    </div>
  );
};
