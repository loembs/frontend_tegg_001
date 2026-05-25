import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Plus, ClipboardList, User, Bell, LogOut, 
  Zap, Snowflake, Wrench, Hammer, Paintbrush, 
  ChevronRight, AlertCircle, Clock, CheckCircle, XCircle, 
  MapPin, Star, Phone, MessageCircle, X, Search
} from 'lucide-react';
import { useSupabaseApp as useApp } from '../../context/SupabaseAppContext';
import { Button } from '../../components/ui/Button';
import { TextArea, Select } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ServiceCategory, ServiceRequest, RequestStatus } from '../../types';
import { subCategories } from '../../data/mockData';

interface ClientDashboardProps {
  onLogout: () => void;
  initialCategory?: ServiceCategory | null;
}

// Dakar addresses for autocomplete
const dakarAddresses = [
  { id: 1, address: "Sacré-Cœur 3, Villa 45", quartier: "Sacré-Cœur" },
  { id: 2, address: "Sacré-Cœur 1, Près de la pharmacie", quartier: "Sacré-Cœur" },
  { id: 3, address: "Sacré-Cœur 2, Résidence Keur Gorgui", quartier: "Sacré-Cœur" },
  { id: 4, address: "Almadies, Zone B, Villa 12", quartier: "Almadies" },
  { id: 5, address: "Almadies, Route des Almadies", quartier: "Almadies" },
  { id: 6, address: "Plateau, Rue Félix Faure, Immeuble Kebe", quartier: "Plateau" },
  { id: 7, address: "Plateau, Avenue Léopold Sédar Senghor", quartier: "Plateau" },
  { id: 8, address: "Point E, Rue 10, Villa 25", quartier: "Point E" },
  { id: 9, address: "Point E, Près de l'Université", quartier: "Point E" },
  { id: 10, address: "Mermoz, Pyrotechnie, Lot 5", quartier: "Mermoz" },
  { id: 11, address: "Mermoz, Sacré-Cœur Extension", quartier: "Mermoz" },
  { id: 12, address: "Fann Hock, Rue 27", quartier: "Fann" },
  { id: 13, address: "Fann Résidence, Avenue Cheikh Anta Diop", quartier: "Fann" },
  { id: 14, address: "Ouakam, Cité Avion", quartier: "Ouakam" },
  { id: 15, address: "Ouakam, Village traditionnel", quartier: "Ouakam" },
  { id: 16, address: "Yoff, Cité COMICO", quartier: "Yoff" },
  { id: 17, address: "Yoff, Virage", quartier: "Yoff" },
  { id: 18, address: "Ngor, Près de l'embarcadère", quartier: "Ngor" },
  { id: 19, address: "Parcelles Assainies, Unité 17", quartier: "Parcelles Assainies" },
  { id: 20, address: "Parcelles Assainies, Unité 25", quartier: "Parcelles Assainies" },
  { id: 21, address: "Grand Yoff, Cité Millionnaire", quartier: "Grand Yoff" },
  { id: 22, address: "HLM Grand Yoff, Bloc 5", quartier: "Grand Yoff" },
  { id: 23, address: "Sicap Liberté 1, Villa 120", quartier: "Sicap Liberté" },
  { id: 24, address: "Sicap Liberté 6, Près du marché", quartier: "Sicap Liberté" },
  { id: 25, address: "Pikine, Cité Djily Mbaye", quartier: "Pikine" },
  { id: 26, address: "Pikine, Guinaw Rails", quartier: "Pikine" },
  { id: 27, address: "Guédiawaye, Sam Notaire", quartier: "Guédiawaye" },
  { id: 28, address: "Guédiawaye, Golf Sud", quartier: "Guédiawaye" },
  { id: 29, address: "Rufisque, Cité Serigne Mansour", quartier: "Rufisque" },
  { id: 30, address: "Keur Massar, Cité SHS", quartier: "Keur Massar" },
  { id: 31, address: "Médina, Rue 12", quartier: "Médina" },
  { id: 32, address: "Médina, Gueule Tapée", quartier: "Médina" },
  { id: 33, address: "Liberté 5, Extension", quartier: "Liberté" },
  { id: 34, address: "Liberté 6, Près de l'école", quartier: "Liberté" },
  { id: 35, address: "Diamaguène, SICAP Mbao", quartier: "Diamaguène" },
];

// Helper function to format relative date
const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return new Date(date).toLocaleDateString('fr-FR');
};

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onLogout, initialCategory }) => {
  const { currentUser, requests, notifications, createRequest, cancelRequest, completeRequest, rateArtisan, logout, markNotificationRead } = useApp();
  const [activeTab, setActiveTab] = useState<'home' | 'new' | 'requests' | 'profile' | 'notifications'>('home');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(initialCategory || null);
  const [serviceType, setServiceType] = useState<'installation' | 'reparation'>('reparation');
  const [subCategory, setSubCategory] = useState('');
  const [elementCount, setElementCount] = useState(1);
  const [description, setDescription] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [selectedAddressData, setSelectedAddressData] = useState<{ address: string; quartier: string } | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [clientAmount, setClientAmount] = useState('');
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Auto-navigate to new request if category was selected from home
  useEffect(() => {
    if (initialCategory) {
      setActiveTab('new');
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Filter addresses based on search
  const filteredAddresses = addressSearch.length >= 2
    ? dakarAddresses.filter(a => 
        a.address.toLowerCase().includes(addressSearch.toLowerCase()) ||
        a.quartier.toLowerCase().includes(addressSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const myRequests = requests.filter(r => r.clientId === currentUser?.id);
  const unreadNotifications = notifications.filter(n => n.userId === currentUser?.id && !n.read);

  const categories = [
    { id: 'electricite', name: 'Électricité', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', gradient: 'from-amber-400 to-orange-500' },
    { id: 'froid', name: 'Froid', icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-50', gradient: 'from-blue-400 to-cyan-500' },
    { id: 'plomberie', name: 'Plomberie', icon: Wrench, color: 'text-emerald-500', bg: 'bg-emerald-50', gradient: 'from-emerald-400 to-teal-500' },
    { id: 'menuiserie', name: 'Menuiserie', icon: Hammer, color: 'text-purple-500', bg: 'bg-purple-50', gradient: 'from-purple-400 to-violet-500' },
    { id: 'peinture', name: 'Peinture', icon: Paintbrush, color: 'text-pink-500', bg: 'bg-pink-50', gradient: 'from-pink-400 to-rose-500' },
  ];

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig = {
      en_attente: { label: 'En attente', variant: 'warning' as const, icon: Clock },
      en_cours: { label: 'En cours', variant: 'info' as const, icon: AlertCircle },
      terminee: { label: 'Terminée', variant: 'success' as const, icon: CheckCircle },
      annulee: { label: 'Annulée', variant: 'danger' as const, icon: XCircle },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="gap-1">
        <config.icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const handleSelectAddress = (addressData: typeof dakarAddresses[0]) => {
    setAddressSearch(addressData.address);
    setSelectedAddressData({ address: addressData.address, quartier: addressData.quartier });
    setShowAddressSuggestions(false);
  };

  const handleCreateRequest = () => {
    if (!selectedCategory || !subCategory || !selectedAddressData || !description) return;

    createRequest({
      clientId: currentUser?.id || '',
      clientName: `${currentUser?.firstName} ${currentUser?.lastName}`,
      clientPhone: currentUser?.phone || '',
      category: selectedCategory,
      subCategory,
      serviceType,
      elementCount,
      description,
      address: selectedAddressData.address,
      quartier: selectedAddressData.quartier,
      latitude: 14.7167 + Math.random() * 0.1,
      longitude: -17.4677 + Math.random() * 0.1,
      isUrgent,
      distance: Math.round(Math.random() * 10 * 10) / 10,
    });

    // Reset form
    setSelectedCategory(null);
    setSubCategory('');
    setDescription('');
    setAddressSearch('');
    setSelectedAddressData(null);
    setIsUrgent(false);
    setElementCount(1);
    setActiveTab('requests');
  };

  const handleComplete = () => {
    if (selectedRequest && clientAmount) {
      completeRequest(selectedRequest.id, parseInt(clientAmount), false);
      setShowCompleteModal(false);
      setShowRatingModal(true);
    }
  };

  const handleRate = () => {
    if (selectedRequest) {
      rateArtisan(selectedRequest.id, rating, review);
      setShowRatingModal(false);
      setSelectedRequest(null);
      setRating(5);
      setReview('');
    }
  };

  const renderHome = () => (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/25">
        <h2 className="text-xl font-semibold mb-1">Bonjour, {currentUser?.firstName}! 👋</h2>
        <p className="text-emerald-100 text-sm">De quoi avez-vous besoin aujourd'hui?</p>
        <Button
          variant="secondary"
          className="mt-4 bg-white/20 text-white hover:bg-white/30 border-0"
          onClick={() => setActiveTab('new')}
          icon={<Plus className="w-4 h-4" />}
        >
          Nouvelle demande
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {myRequests.filter(r => r.status === 'en_attente' || r.status === 'en_cours').length}
              </p>
              <p className="text-xs text-slate-500">En cours</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {myRequests.filter(r => r.status === 'terminee').length}
              </p>
              <p className="text-xs text-slate-500">Terminées</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Services */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Nos services</h3>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id as ServiceCategory);
                setActiveTab('new');
              }}
              className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-105 transition-transform`}>
                <cat.icon className="w-6 h-6 text-white" />
              </div>
              <p className="font-medium text-slate-800 text-sm">{cat.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Requests */}
      {myRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Demandes récentes</h3>
            <button
              onClick={() => setActiveTab('requests')}
              className="text-sm text-emerald-600 font-medium"
            >
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {myRequests.slice(0, 3).map((req) => {
              const cat = categories.find(c => c.id === req.category);
              return (
                <Card
                  key={req.id}
                  hover
                  onClick={() => setSelectedRequest(req)}
                  className="p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cat?.bg} flex items-center justify-center`}>
                      {cat && <cat.icon className={`w-5 h-5 ${cat.color}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{req.subCategory}</p>
                      <p className="text-xs text-slate-500">{req.quartier}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderNewRequest = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Nouvelle demande</h2>

      {!selectedCategory ? (
        <div>
          <p className="text-slate-500 mb-4">Sélectionnez un service</p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as ServiceCategory)}
                className="p-5 bg-white rounded-2xl border-2 border-slate-100 hover:border-emerald-500 transition-all group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-3 shadow-lg mx-auto group-hover:scale-105 transition-transform`}>
                  <cat.icon className="w-7 h-7 text-white" />
                </div>
                <p className="font-medium text-slate-800">{cat.name}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Selected Category */}
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
            {(() => {
              const cat = categories.find(c => c.id === selectedCategory);
              return cat ? (
                <>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center`}>
                    <cat.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-emerald-800">{cat.name}</span>
                </>
              ) : null;
            })()}
            <button
              onClick={() => setSelectedCategory(null)}
              className="ml-auto text-emerald-600 hover:text-emerald-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Type de service</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setServiceType('reparation')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  serviceType === 'reparation'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <Wrench className={`w-6 h-6 mx-auto mb-2 ${serviceType === 'reparation' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${serviceType === 'reparation' ? 'text-emerald-700' : 'text-slate-600'}`}>
                  Réparation
                </span>
              </button>
              <button
                onClick={() => setServiceType('installation')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  serviceType === 'installation'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <Plus className={`w-6 h-6 mx-auto mb-2 ${serviceType === 'installation' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${serviceType === 'installation' ? 'text-emerald-700' : 'text-slate-600'}`}>
                  Installation
                </span>
              </button>
            </div>
          </div>

          {/* Sub Category */}
          <Select
            label="Élément concerné"
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            options={[
              { value: '', label: 'Sélectionner...' },
              ...subCategories[selectedCategory].map(s => ({ value: s, label: s })),
            ]}
          />

          {/* Element Count */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Nombre d'éléments</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setElementCount(Math.max(1, elementCount - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                -
              </button>
              <span className="text-xl font-semibold text-slate-800 w-8 text-center">{elementCount}</span>
              <button
                onClick={() => setElementCount(elementCount + 1)}
                className="w-10 h-10 rounded-xl bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Description */}
          <TextArea
            label="Description du problème"
            placeholder="Décrivez votre problème en détail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />

          {/* Address with Autocomplete */}
          <div className="space-y-1.5 relative">
            <label className="block text-sm font-medium text-slate-700">
              Adresse complète
            </label>
            {selectedAddressData ? (
              /* Display selected address */
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-800 truncate">{selectedAddressData.address}</p>
                  <p className="text-xs text-emerald-600">{selectedAddressData.quartier}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddressData(null);
                    setAddressSearch('');
                    setTimeout(() => addressInputRef.current?.focus(), 100);
                  }}
                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Search input */
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={addressInputRef}
                  type="text"
                  value={addressSearch}
                  onChange={(e) => {
                    setAddressSearch(e.target.value);
                    setShowAddressSuggestions(true);
                  }}
                  onFocus={() => setShowAddressSuggestions(true)}
                  placeholder="Recherchez votre adresse..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}
            
            {/* Address Suggestions Dropdown */}
            {showAddressSuggestions && filteredAddresses.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {filteredAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-start gap-3 border-b border-slate-100 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{addr.address}</p>
                      <p className="text-xs text-slate-500">{addr.quartier}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {addressSearch.length >= 2 && filteredAddresses.length === 0 && showAddressSuggestions && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center">
                <p className="text-sm text-slate-500">Aucune adresse trouvée</p>
                <button
                  onClick={() => {
                    setSelectedAddressData({ address: addressSearch, quartier: 'Dakar' });
                    setShowAddressSuggestions(false);
                  }}
                  className="mt-2 text-sm text-emerald-600 font-medium"
                >
                  Utiliser cette adresse
                </button>
              </div>
            )}
          </div>

          {/* Urgent Toggle */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800">Demande urgente</p>
                <p className="text-xs text-amber-600">Priorité aux artisans disponibles</p>
              </div>
            </div>
            <button
              onClick={() => setIsUrgent(!isUrgent)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isUrgent ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isUrgent ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <Button
            onClick={handleCreateRequest}
            className="w-full"
            size="lg"
            disabled={!subCategory || !selectedAddressData || !description}
          >
            Envoyer la demande
          </Button>
        </div>
      )}
    </div>
  );

  const renderRequests = () => {
    const filteredRequests = statusFilter === 'all'
      ? myRequests
      : myRequests.filter(r => r.status === statusFilter);

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800">Mes demandes</h2>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'en_attente', label: 'En attente' },
            { value: 'en_cours', label: 'En cours' },
            { value: 'terminee', label: 'Terminées' },
            { value: 'annulee', label: 'Annulées' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as RequestStatus | 'all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Request List */}
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune demande trouvée</p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const cat = categories.find(c => c.id === req.category);
              return (
                <Card
                  key={req.id}
                  hover
                  onClick={() => setSelectedRequest(req)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl ${cat?.bg} flex items-center justify-center flex-shrink-0`}>
                        {cat && <cat.icon className={`w-6 h-6 ${cat.color}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">{req.subCategory}</p>
                            <p className="text-sm text-slate-500 capitalize">{req.serviceType} • {req.elementCount} élément(s)</p>
                          </div>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <MapPin className="w-3 h-3" />
                            <span>{req.quartier}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeDate(req.createdAt)} à {formatTime(req.createdAt)}</span>
                          </div>
                        </div>
                        {req.isUrgent && (
                          <Badge variant="danger" size="sm" className="mt-2">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl font-bold text-white">
            {currentUser?.firstName?.charAt(0)}{currentUser?.lastName?.charAt(0)}
          </span>
        </div>
        <h2 className="text-xl font-semibold text-slate-800">
          {currentUser?.firstName} {currentUser?.lastName}
        </h2>
        <p className="text-slate-500">{currentUser?.phone}</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardContent className="divide-y divide-slate-100">
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-500">Téléphone</span>
            <span className="font-medium text-slate-800">{currentUser?.phone || 'Non renseigné'}</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-500">Type</span>
            <Badge variant="info">Particulier</Badge>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-500">Membre depuis</span>
            <span className="font-medium text-slate-800">
              {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('fr-FR') : '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{myRequests.length}</p>
          <p className="text-xs text-slate-500">Demandes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {myRequests.filter(r => r.status === 'terminee').length}
          </p>
          <p className="text-xs text-slate-500">Terminées</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">
            {myRequests.filter(r => r.status === 'en_cours').length}
          </p>
          <p className="text-xs text-slate-500">En cours</p>
        </Card>
      </div>

      <Button
        variant="danger"
        className="w-full"
        onClick={handleLogout}
        icon={<LogOut className="w-4 h-4" />}
      >
        Déconnexion
      </Button>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Notifications</h2>
      {notifications.filter(n => n.userId === currentUser?.id).length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications
            .filter(n => n.userId === currentUser?.id)
            .map((notif) => (
              <Card
                key={notif.id}
                hover
                onClick={() => markNotificationRead(notif.id)}
                className={!notif.read ? 'border-l-4 border-l-emerald-500' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      notif.type === 'success' ? 'bg-emerald-100' :
                      notif.type === 'warning' ? 'bg-amber-100' :
                      notif.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <Bell className={`w-5 h-5 ${
                        notif.type === 'success' ? 'text-emerald-600' :
                        notif.type === 'warning' ? 'text-amber-600' :
                        notif.type === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{notif.title}</p>
                      <p className="text-sm text-slate-500">{notif.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatRelativeDate(notif.createdAt)} à {formatTime(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-emerald-600">Tëgg</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Logout Icon - Clean & Professional */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6" onClick={() => setShowAddressSuggestions(false)}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'new' && renderNewRequest()}
        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'notifications' && renderNotifications()}
      </div>

      {/* Bottom Navigation - Simplified without "New" button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-8 py-3 flex justify-around">
        {[
          { id: 'home', icon: Home, label: 'Accueil' },
          { id: 'requests', icon: ClipboardList, label: 'Demandes' },
          { id: 'notifications', icon: Bell, label: 'Alertes' },
          { id: 'profile', icon: User, label: 'Profil' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex flex-col items-center gap-1 relative ${
              activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{tab.label}</span>
            {tab.id === 'notifications' && unreadNotifications.length > 0 && (
              <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadNotifications.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Request Detail Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Détails de la demande"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            {/* Date & Time */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Date de la demande</span>
              <span className="font-medium text-slate-700">
                {formatRelativeDate(selectedRequest.createdAt)} à {formatTime(selectedRequest.createdAt)}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              {getStatusBadge(selectedRequest.status)}
              {selectedRequest.isUrgent && (
                <Badge variant="danger">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Urgent
                </Badge>
              )}
            </div>

            {/* Service Info */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-medium">{selectedRequest.subCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium capitalize">{selectedRequest.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantité</span>
                <span className="font-medium">{selectedRequest.elementCount} élément(s)</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-slate-500 mb-1">Description</p>
              <p className="text-slate-800">{selectedRequest.description}</p>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-slate-800">{selectedRequest.address}</p>
                <p className="text-sm text-slate-500">{selectedRequest.quartier}</p>
              </div>
            </div>

            {/* Artisan Info (if accepted) */}
            {selectedRequest.artisanId && (
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="font-medium text-emerald-800 mb-2">Artisan assigné</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{selectedRequest.artisanName}</p>
                    <div className="flex gap-2 mt-1">
                      <a href={`tel:${selectedRequest.artisanPhone}`} className="p-2 bg-emerald-100 rounded-lg">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </a>
                      <a href={`https://wa.me/${selectedRequest.artisanPhone?.replace(/\s/g, '')}`} className="p-2 bg-green-100 rounded-lg">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {selectedRequest.status === 'en_attente' && (
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    cancelRequest(selectedRequest.id);
                    setSelectedRequest(null);
                  }}
                >
                  Annuler
                </Button>
              )}
              {selectedRequest.status === 'en_cours' && selectedRequest.artisanValidated && !selectedRequest.clientValidated && (
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={() => setShowCompleteModal(true)}
                >
                  Confirmer & Clôturer
                </Button>
              )}
              {selectedRequest.status === 'terminee' && !selectedRequest.rating && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowRatingModal(true)}
                  icon={<Star className="w-4 h-4" />}
                >
                  Noter l'artisan
                </Button>
              )}
            </div>

            {/* Rating Display */}
            {selectedRequest.rating && (
              <div className="p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= selectedRequest.rating! ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                {selectedRequest.review && (
                  <p className="text-sm text-slate-600">{selectedRequest.review}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Complete Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Confirmer la mission"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Veuillez saisir le montant payé à l'artisan pour bénéficier de la garantie.
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Montant payé (FCFA)</label>
            <input
              type="number"
              value={clientAmount}
              onChange={(e) => setClientAmount(e.target.value)}
              placeholder="Ex: 15000"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <Button onClick={handleComplete} className="w-full" disabled={!clientAmount}>
            Confirmer
          </Button>
        </div>
      </Modal>

      {/* Rating Modal */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Noter l'artisan"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 hover:text-amber-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <TextArea
            label="Votre avis (optionnel)"
            placeholder="Partagez votre expérience..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
          />
          <Button onClick={handleRate} className="w-full">
            Envoyer
          </Button>
        </div>
      </Modal>
    </div>
  );
};
