import React, { useState } from 'react';
import { 
  Home, ClipboardList, User, Bell, LogOut, Wallet,
  Zap, Snowflake, Wrench, Hammer, Paintbrush,
  ChevronRight, AlertCircle, Clock, CheckCircle,
  MapPin, Star, Phone, MessageCircle, Navigation, DollarSign,
  ArrowDownCircle, ArrowUpCircle, AlertTriangle
} from 'lucide-react';
import { useSupabaseApp as useApp } from '../../context/SupabaseAppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Artisan, ServiceRequest } from '../../types';

interface ArtisanDashboardProps {
  onLogout: () => void;
}

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

export const ArtisanDashboard: React.FC<ArtisanDashboardProps> = ({ onLogout }) => {
  const { 
    currentUser, requests, notifications, 
    acceptRequest, completeRequest, depositBalance, requestWithdrawal,
    logout, markNotificationRead 
  } = useApp();
  
  const artisan = currentUser as Artisan;
  const [activeTab, setActiveTab] = useState<'home' | 'missions' | 'wallet' | 'profile' | 'notifications'>('home');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [missionTab, setMissionTab] = useState<'pending' | 'active' | 'completed'>('pending');

  const unreadNotifications = notifications.filter(n => n.userId === artisan?.id && !n.read);

  // Get requests for this artisan's category
  const availableRequests = requests.filter(
    r => r.status === 'en_attente' && r.category === artisan?.category
  );
  const myActiveMissions = requests.filter(
    r => r.artisanId === artisan?.id && r.status === 'en_cours'
  );
  const myCompletedMissions = requests.filter(
    r => r.artisanId === artisan?.id && r.status === 'terminee'
  );

  const categories = [
    { id: 'electricite', name: 'Électricité', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', gradient: 'from-amber-400 to-orange-500' },
    { id: 'froid', name: 'Froid', icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-50', gradient: 'from-blue-400 to-cyan-500' },
    { id: 'plomberie', name: 'Plomberie', icon: Wrench, color: 'text-emerald-500', bg: 'bg-emerald-50', gradient: 'from-emerald-400 to-teal-500' },
    { id: 'menuiserie', name: 'Menuiserie', icon: Hammer, color: 'text-purple-500', bg: 'bg-purple-50', gradient: 'from-purple-400 to-violet-500' },
    { id: 'peinture', name: 'Peinture', icon: Paintbrush, color: 'text-pink-500', bg: 'bg-pink-50', gradient: 'from-pink-400 to-rose-500' },
  ];

  const artisanCategory = categories.find(c => c.id === artisan?.category);

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const handleAcceptRequest = () => {
    if (selectedRequest && artisan.balance >= 500) {
      acceptRequest(selectedRequest.id, artisan.id);
      setShowAcceptConfirm(false);
      setSelectedRequest(null);
    }
  };

  const handleCompleteMission = () => {
    if (selectedRequest && amount) {
      completeRequest(selectedRequest.id, parseInt(amount), true);
      setShowCompleteModal(false);
      setSelectedRequest(null);
      setAmount('');
    }
  };

  const handleDeposit = () => {
    if (amount) {
      depositBalance(artisan.id, parseInt(amount));
      setShowDepositModal(false);
      setAmount('');
    }
  };

  const handleWithdraw = () => {
    if (amount && parseInt(amount) <= artisan.balance) {
      requestWithdrawal(artisan.id, parseInt(amount));
      setShowWithdrawModal(false);
      setAmount('');
    }
  };

  const renderHome = () => (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/25">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Bonjour, {artisan?.firstName}! 👋</h2>
            <div className="flex items-center gap-2">
              {artisanCategory && (
                <Badge className="bg-white/20 text-white">
                  <artisanCategory.icon className="w-3 h-3 mr-1" />
                  {artisanCategory.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-emerald-100 text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-white">{artisan?.rating?.toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        {/* Balance */}
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-emerald-100 text-sm mb-1">Solde disponible</p>
          <p className="text-3xl font-bold">{artisan?.balance?.toLocaleString()} FCFA</p>
          {artisan?.balance < artisan?.balanceThreshold && (
            <div className="flex items-center gap-2 mt-2 text-amber-200 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Solde bas - Effectuez un dépôt</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-800">{availableRequests.length}</p>
          <p className="text-xs text-slate-500">En attente</p>
        </Card>
        <Card className="p-3 text-center">
          <AlertCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-800">{myActiveMissions.length}</p>
          <p className="text-xs text-slate-500">En cours</p>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-800">{artisan?.totalMissions || 0}</p>
          <p className="text-xs text-slate-500">Terminées</p>
        </Card>
      </div>

      {/* Pending Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Nouvelles demandes
            {availableRequests.length > 0 && (
              <Badge variant="primary" className="ml-2">{availableRequests.length}</Badge>
            )}
          </h3>
        </div>

        {availableRequests.length === 0 ? (
          <Card className="p-6 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune demande en attente</p>
            <p className="text-sm text-slate-400 mt-1">Les nouvelles demandes apparaîtront ici</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {availableRequests.map((req) => (
              <Card
                key={req.id}
                hover
                onClick={() => setSelectedRequest(req)}
                className={`overflow-hidden ${req.isUrgent ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800">{req.subCategory}</p>
                        {req.isUrgent && (
                          <Badge variant="danger" size="sm">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 capitalize">
                        {req.serviceType} • {req.elementCount} élément(s)
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p className="font-medium text-slate-600">{formatRelativeDate(req.createdAt)}</p>
                      <p>{formatTime(req.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{req.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{req.quartier}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Navigation className="w-4 h-4" />
                        <span>{req.distance} km</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Missions */}
      {myActiveMissions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Missions en cours</h3>
          <div className="space-y-3">
            {myActiveMissions.map((mission) => (
              <Card
                key={mission.id}
                hover
                onClick={() => setSelectedRequest(mission)}
                className="border-l-4 border-l-blue-500"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{mission.subCategory}</p>
                      <p className="text-sm text-slate-500">{mission.clientName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="info">En cours</Badge>
                      <p className="text-xs text-slate-400 mt-1">{formatRelativeDate(mission.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span>{mission.quartier}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderMissions = () => {
    const displayMissions = missionTab === 'pending' 
      ? availableRequests 
      : missionTab === 'active' 
        ? myActiveMissions 
        : myCompletedMissions;

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800">Missions</h2>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'pending', label: 'En attente', count: availableRequests.length },
            { id: 'active', label: 'En cours', count: myActiveMissions.length },
            { id: 'completed', label: 'Terminées', count: myCompletedMissions.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMissionTab(tab.id as typeof missionTab)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                missionTab === tab.id
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  missionTab === tab.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mission List */}
        <div className="space-y-3">
          {displayMissions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune mission</p>
            </div>
          ) : (
            displayMissions.map((req) => (
              <Card
                key={req.id}
                hover
                onClick={() => setSelectedRequest(req)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{req.subCategory}</p>
                      <p className="text-sm text-slate-500 capitalize">
                        {req.serviceType} • {req.elementCount} élément(s)
                      </p>
                    </div>
                    <div className="text-right">
                      {req.status === 'terminee' ? (
                        <Badge variant="success">Terminée</Badge>
                      ) : req.status === 'en_cours' ? (
                        <Badge variant="info">En cours</Badge>
                      ) : (
                        <Badge variant="warning">En attente</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{req.quartier}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeDate(req.createdAt)} à {formatTime(req.createdAt)}</span>
                    </div>
                  </div>
                  {req.status === 'terminee' && req.artisanAmount && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span className="font-semibold text-emerald-600">
                        {req.artisanAmount.toLocaleString()} FCFA
                      </span>
                      {req.rating && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-amber-600">{req.rating}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderWallet = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Portefeuille</h2>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
        <p className="text-emerald-100 text-sm mb-2">Solde disponible</p>
        <p className="text-4xl font-bold mb-4">{artisan?.balance?.toLocaleString()} FCFA</p>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30 border-0"
            onClick={() => setShowDepositModal(true)}
            icon={<ArrowDownCircle className="w-4 h-4" />}
          >
            Dépôt
          </Button>
          <Button
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30 border-0"
            onClick={() => setShowWithdrawModal(true)}
            icon={<ArrowUpCircle className="w-4 h-4" />}
          >
            Retirer
          </Button>
        </div>
      </div>

      {/* Balance Warning */}
      {artisan?.balance < artisan?.balanceThreshold && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Solde insuffisant</p>
            <p className="text-sm text-amber-600">
              Effectuez un dépôt pour continuer à recevoir des missions. 
              Seuil minimum: {artisan?.balanceThreshold?.toLocaleString()} FCFA
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{artisan?.totalMissions || 0}</p>
              <p className="text-xs text-slate-500">Missions</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{artisan?.rating?.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Note</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Commission Info */}
      <Card className="p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Fonctionnement des commissions</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">1</div>
            <p className="text-slate-600">Provision de <span className="font-semibold">500 FCFA</span> prélevée à l'acceptation</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">2</div>
            <p className="text-slate-600">Commission de <span className="font-semibold">1%</span> du montant final</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">3</div>
            <p className="text-slate-600">Régularisation à la clôture de la mission</p>
          </div>
        </div>
      </Card>

      {/* Vider le portefeuille Button */}
      <Button
        variant="outline"
        className="w-full border-red-300 text-red-600 hover:bg-red-50"
        onClick={() => {
          setAmount(artisan?.balance?.toString() || '');
          setShowWithdrawModal(true);
        }}
        icon={<Wallet className="w-4 h-4" />}
      >
        Vider mon portefeuille
      </Button>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl font-bold text-white">
            {artisan?.firstName?.charAt(0)}{artisan?.lastName?.charAt(0)}
          </span>
        </div>
        <h2 className="text-xl font-semibold text-slate-800">
          {artisan?.firstName} {artisan?.lastName}
        </h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          {artisanCategory && (
            <Badge className={`${artisanCategory.bg} ${artisanCategory.color}`}>
              <artisanCategory.icon className="w-3 h-3 mr-1" />
              {artisanCategory.name}
            </Badge>
          )}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-semibold text-slate-700">{artisan?.rating?.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <Card>
        <CardContent className="divide-y divide-slate-100">
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-800">{artisan?.email}</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-500">Téléphone</span>
            <span className="font-medium text-slate-800">{artisan?.phone}</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-500">Statut</span>
            {artisan?.isValidated ? (
              <Badge variant="success">Validé</Badge>
            ) : (
              <Badge variant="warning">En attente de validation</Badge>
            )}
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-500">Missions réalisées</span>
            <span className="font-medium text-slate-800">{artisan?.totalMissions || 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card className="p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Ma notation</h3>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-8 h-8 ${
                star <= Math.round(artisan?.rating || 0)
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-slate-200'
              }`}
            />
          ))}
          <span className="text-2xl font-bold text-slate-800 ml-2">
            {artisan?.rating?.toFixed(1)}
          </span>
        </div>
        {artisan?.rating < 3 && (
          <p className="text-sm text-red-500 mt-2">
            ⚠️ Attention: votre note est basse, cela affecte votre visibilité
          </p>
        )}
      </Card>

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
      {notifications.filter(n => n.userId === artisan?.id).length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications
            .filter(n => n.userId === artisan?.id)
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
            <Badge variant="primary" size="sm">Artisan</Badge>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2"
            >
              <Bell className="w-6 h-6 text-slate-600" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
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
      <div className="px-5 py-6">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'missions' && renderMissions()}
        {activeTab === 'wallet' && renderWallet()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'notifications' && renderNotifications()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around">
        {[
          { id: 'home', icon: Home, label: 'Accueil' },
          { id: 'missions', icon: ClipboardList, label: 'Missions' },
          { id: 'wallet', icon: Wallet, label: 'Solde' },
          { id: 'profile', icon: User, label: 'Profil' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex flex-col items-center gap-1 ${
              activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Request Detail Modal - Enhanced UX for accepting */}
      <Modal
        isOpen={!!selectedRequest && !showCompleteModal && !showAcceptConfirm}
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

            {/* Urgent Badge */}
            {selectedRequest.isUrgent && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-700">Demande urgente</span>
              </div>
            )}

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
              <div className="flex justify-between">
                <span className="text-slate-500">Distance</span>
                <span className="font-medium">{selectedRequest.distance} km</span>
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

            {/* Client Info (if accepted) */}
            {selectedRequest.status === 'en_cours' && (
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="font-medium text-emerald-800 mb-2">Client</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{selectedRequest.clientName}</p>
                    <div className="flex gap-2 mt-1">
                      <a href={`tel:${selectedRequest.clientPhone}`} className="p-2 bg-emerald-100 rounded-lg">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </a>
                      <a href={`https://wa.me/${selectedRequest.clientPhone?.replace(/\s/g, '')}`} className="p-2 bg-green-100 rounded-lg">
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
                  variant="success"
                  className="flex-1"
                  size="lg"
                  onClick={() => setShowAcceptConfirm(true)}
                  disabled={artisan.balance < 500}
                >
                  Accepter cette demande
                </Button>
              )}
              {selectedRequest.status === 'en_cours' && !selectedRequest.artisanValidated && (
                <Button
                  variant="success"
                  className="flex-1"
                  size="lg"
                  onClick={() => setShowCompleteModal(true)}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Mission terminée
                </Button>
              )}
              {selectedRequest.status === 'en_cours' && selectedRequest.artisanValidated && (
                <div className="w-full p-3 bg-amber-50 rounded-xl text-center">
                  <p className="text-amber-700">En attente de validation client</p>
                </div>
              )}
            </div>

            {/* Balance warning for pending requests */}
            {selectedRequest.status === 'en_attente' && artisan.balance < 500 && (
              <div className="p-3 bg-red-50 rounded-xl text-sm text-red-600">
                ⚠️ Solde insuffisant. Effectuez un dépôt pour accepter des missions.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Accept Confirmation Modal - Fluid UX */}
      <Modal
        isOpen={showAcceptConfirm && !!selectedRequest}
        onClose={() => setShowAcceptConfirm(false)}
        title="Confirmer l'acceptation"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Accepter cette mission ?
            </h3>
            <p className="text-slate-500 text-sm">
              Une provision de <span className="font-semibold">500 FCFA</span> sera prélevée sur votre solde.
            </p>
          </div>

          {selectedRequest && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="font-medium text-slate-800">{selectedRequest.subCategory}</p>
              <p className="text-sm text-slate-500 mt-1">{selectedRequest.quartier} • {selectedRequest.distance} km</p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
            <span className="text-sm text-slate-600">Votre solde actuel</span>
            <span className="font-semibold text-emerald-700">{artisan?.balance?.toLocaleString()} FCFA</span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowAcceptConfirm(false)}
            >
              Annuler
            </Button>
            <Button
              variant="success"
              className="flex-1"
              onClick={handleAcceptRequest}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setAmount('');
        }}
        title="Clôturer la mission"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-600">
              Veuillez saisir le montant perçu du client.
            </p>
          </div>
          
          <Input
            label="Montant perçu (FCFA)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex: 15000"
          />
          
          {amount && parseInt(amount) > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Commission (1%)</span>
                <span className="font-medium">{Math.max(parseInt(amount) * 0.01, 500).toLocaleString()} FCFA</span>
              </div>
              <div className="text-xs text-slate-400">
                Minimum 500 FCFA (provision déjà prélevée)
              </div>
            </div>
          )}

          <Button 
            onClick={handleCompleteMission} 
            className="w-full" 
            size="lg"
            disabled={!amount || parseInt(amount) <= 0}
          >
            Confirmer la clôture
          </Button>
        </div>
      </Modal>

      {/* Deposit Modal */}
      <Modal
        isOpen={showDepositModal}
        onClose={() => {
          setShowDepositModal(false);
          setAmount('');
        }}
        title="Effectuer un dépôt"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Effectuez un dépôt via Wave pour alimenter votre solde.
          </p>
          <Input
            label="Montant (FCFA)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex: 5000"
          />
          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            💡 Après le dépôt Wave, votre solde sera crédité automatiquement.
          </div>
          <Button onClick={handleDeposit} className="w-full" size="lg" disabled={!amount}>
            Confirmer le dépôt
          </Button>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          setAmount('');
        }}
        title="Vider mon portefeuille"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">Solde disponible</p>
            <p className="text-2xl font-bold text-slate-800">{artisan?.balance?.toLocaleString()} FCFA</p>
          </div>
          
          <Input
            label="Montant à retirer (FCFA)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex: 10000"
            max={artisan?.balance}
          />
          
          <Button 
            onClick={handleWithdraw} 
            className="w-full"
            size="lg"
            disabled={!amount || parseInt(amount) > artisan?.balance || parseInt(amount) <= 0}
          >
            Demander le retrait
          </Button>
          
          <p className="text-xs text-slate-400 text-center">
            Votre demande sera traitée sous 24h
          </p>
        </div>
      </Modal>
    </div>
  );
};
