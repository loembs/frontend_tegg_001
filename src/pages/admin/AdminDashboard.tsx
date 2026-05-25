import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Wrench, ClipboardList, DollarSign, AlertTriangle, Settings, LogOut,
  Bell, Search, ChevronDown, TrendingUp, Eye, UserCheck, UserX, Trash2,
  MapPin, Star, Filter, CheckCircle, Clock, XCircle, AlertCircle,
  Zap, Snowflake, Hammer, Paintbrush, Menu, X
} from 'lucide-react';
import { useSupabaseApp as useApp } from '../../context/SupabaseAppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Artisan, Client, ServiceRequest, RequestStatus } from '../../types';
import { dashboardStats, financeStats, categoryStats, quartierStats } from '../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { 
    currentUser, artisans, clients, requests, notifications,
    validateArtisan, blockArtisan, logout, markNotificationRead
  } = useApp();

  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = notifications.filter(n => n.userId === 'admin' && !n.read);

  const categories = [
    { id: 'electricite', name: 'Électricité', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'froid', name: 'Froid', icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'plomberie', name: 'Plomberie', icon: Wrench, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'menuiserie', name: 'Menuiserie', icon: Hammer, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'peinture', name: 'Peinture', icon: Paintbrush, color: 'text-pink-500', bg: 'bg-pink-50' },
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'artisans', label: 'Artisans', icon: Wrench },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'requests', label: 'Demandes', icon: ClipboardList },
    { id: 'finances', label: 'Finances', icon: DollarSign },
    { id: 'disputes', label: 'Litiges', icon: AlertTriangle },
    { id: 'map', label: 'Carte', icon: MapPin },
    { id: 'settings', label: 'Paramètres', icon: Settings },
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

  const renderDashboard = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Artisans actifs', value: dashboardStats.activeArtisans, total: dashboardStats.totalArtisans, icon: Wrench, color: 'emerald', trend: '+12%' },
          { label: 'Clients', value: dashboardStats.totalClients, icon: Users, color: 'blue', trend: '+8%' },
          { label: 'Demandes en cours', value: dashboardStats.activeRequests, total: dashboardStats.totalRequests, icon: ClipboardList, color: 'amber', trend: '+23%' },
          { label: "Revenus aujourd'hui", value: `${(dashboardStats.todayRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'purple', trend: '+15%' },
        ].map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                {stat.total && (
                  <p className="text-sm text-slate-400">sur {stat.total}</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600 font-medium">{stat.trend}</span>
              <span className="text-slate-400">vs hier</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{dashboardStats.pendingValidation}</p>
              <p className="text-sm text-slate-500">Artisans en attente</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{dashboardStats.disputes}</p>
              <p className="text-sm text-slate-500">Litiges en cours</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{dashboardStats.lowRatingAlerts}</p>
              <p className="text-sm text-slate-500">Alertes notation</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800">Revenus hebdomadaires</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeStats.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" tickFormatter={(v) => `${v/1000}K`} />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toLocaleString()} FCFA`, 'Revenus']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="amount" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800">Répartition par métier</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="category"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {categoryStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Évolution mensuelle des revenus</h3>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financeStats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" tickFormatter={(v) => `${v/1000000}M`} />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} FCFA`, 'Revenus']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2 }}
                  name="Revenus"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Quartiers */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Top Quartiers</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quartierStats.slice(0, 5).map((q, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-slate-500 w-8">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-slate-700">{q.quartier}</span>
                    <span className="text-slate-500">{q.count} demandes</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(q.count / quartierStats[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderArtisans = () => {
    const filteredArtisans = artisans.filter(a => 
      a.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingArtisans = filteredArtisans.filter(a => !a.isValidated);
    const withdrawalRequests = artisans.flatMap(a => 
      a.withdrawalRequests.filter(w => w.status === 'pending')
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Artisans</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Pending Validations */}
        {pendingArtisans.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="bg-amber-50">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">
                  En attente de validation ({pendingArtisans.length})
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-amber-100">
                {pendingArtisans.map((artisan) => {
                  const cat = categories.find(c => c.id === artisan.category);
                  return (
                    <div key={artisan.id} className="p-4 flex items-center justify-between hover:bg-amber-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-amber-700">
                            {artisan.firstName.charAt(0)}{artisan.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{artisan.firstName} {artisan.lastName}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {cat && (
                              <Badge className={`${cat.bg} ${cat.color}`} size="sm">
                                <cat.icon className="w-3 h-3 mr-1" />
                                {cat.name}
                              </Badge>
                            )}
                            <span>{artisan.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => validateArtisan(artisan.id, true)}
                          icon={<CheckCircle className="w-4 h-4" />}
                        >
                          Valider
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => validateArtisan(artisan.id, false)}
                          icon={<XCircle className="w-4 h-4" />}
                        >
                          Refuser
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Requests */}
        {withdrawalRequests.length > 0 && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="bg-purple-50">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-800">
                  Demandes de retrait ({withdrawalRequests.length})
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-purple-100">
                {withdrawalRequests.map((wr) => (
                  <div key={wr.id} className="p-4 flex items-center justify-between hover:bg-purple-50/50">
                    <div>
                      <p className="font-medium text-slate-800">{wr.artisanName}</p>
                      <p className="text-sm text-slate-500">
                        Demande: {wr.amount.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="success" size="sm">Approuver</Button>
                      <Button variant="ghost" size="sm">Voir profil</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Artisans List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Tous les artisans ({filteredArtisans.length})</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={<Filter className="w-4 h-4" />}>
                  Filtres
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Artisan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Catégorie</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Note</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Missions</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Solde</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArtisans.map((artisan) => {
                    const cat = categories.find(c => c.id === artisan.category);
                    return (
                      <tr key={artisan.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                              <span className="font-semibold text-white text-sm">
                                {artisan.firstName.charAt(0)}{artisan.lastName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{artisan.firstName} {artisan.lastName}</p>
                              <p className="text-sm text-slate-500">{artisan.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {cat && (
                            <Badge className={`${cat.bg} ${cat.color}`}>
                              <cat.icon className="w-3 h-3 mr-1" />
                              {cat.name}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Star className={`w-4 h-4 ${artisan.rating < 3 ? 'text-red-500' : 'text-amber-500'} fill-current`} />
                            <span className={`font-medium ${artisan.rating < 3 ? 'text-red-600' : 'text-slate-700'}`}>
                              {artisan.rating.toFixed(1)}
                            </span>
                            {artisan.rating < 3 && (
                              <AlertTriangle className="w-4 h-4 text-red-500 ml-1" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700">{artisan.totalMissions}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${artisan.balance < artisan.balanceThreshold ? 'text-amber-600' : 'text-slate-700'}`}>
                            {artisan.balance.toLocaleString()} F
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {artisan.isValidated ? (
                              <Badge variant="success">Validé</Badge>
                            ) : (
                              <Badge variant="warning">En attente</Badge>
                            )}
                            {artisan.isOnline && (
                              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedArtisan(artisan)}
                              className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                              <Eye className="w-4 h-4 text-slate-500" />
                            </button>
                            <button
                              onClick={() => blockArtisan(artisan.id, artisan.isActive)}
                              className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                              {artisan.isActive ? (
                                <UserX className="w-4 h-4 text-red-500" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-emerald-500" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderClients = () => {
    const filteredClients = clients.filter(c => 
      c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Clients</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Client</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Téléphone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Demandes</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Inscription</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => {
                    const clientRequests = requests.filter(r => r.clientId === client.id);
                    return (
                      <tr key={client.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                              <span className="font-semibold text-white text-sm">
                                {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{client.firstName} {client.lastName}</p>
                              <p className="text-sm text-slate-500">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={client.type === 'entreprise' ? 'info' : 'default'}>
                            {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-600">{client.phone}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700">{clientRequests.length}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-500">
                            {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedClient(client)}
                              className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                              <Eye className="w-4 h-4 text-slate-500" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded-lg">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRequests = () => {
    const filteredRequests = statusFilter === 'all' 
      ? requests 
      : requests.filter(r => r.status === statusFilter);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Demandes</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Toutes', count: requests.length },
            { value: 'en_attente', label: 'En attente', count: requests.filter(r => r.status === 'en_attente').length },
            { value: 'en_cours', label: 'En cours', count: requests.filter(r => r.status === 'en_cours').length },
            { value: 'terminee', label: 'Terminées', count: requests.filter(r => r.status === 'terminee').length },
            { value: 'annulee', label: 'Annulées', count: requests.filter(r => r.status === 'annulee').length },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as RequestStatus | 'all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                statusFilter === filter.value ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        {/* Requests List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Service</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Client</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Artisan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Quartier</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const cat = categories.find(c => c.id === req.category);
                    return (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {cat && (
                              <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
                                <cat.icon className={`w-4 h-4 ${cat.color}`} />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-800">{req.subCategory}</p>
                              <p className="text-xs text-slate-500 capitalize">{req.serviceType}</p>
                            </div>
                            {req.isUrgent && (
                              <Badge variant="danger" size="sm">Urgent</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-700">{req.clientName}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-700">{req.artisanName || '-'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-600">{req.quartier}</span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-500 text-sm">
                            {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                          >
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFinances = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Finances & Commissions</h1>

      {/* Finance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenus totaux', value: financeStats.totalRevenue, color: 'emerald' },
          { label: 'Commissions', value: financeStats.totalCommissions, color: 'blue' },
          { label: 'Dépôts', value: financeStats.totalDeposits, color: 'purple' },
          { label: 'Retraits en attente', value: financeStats.pendingWithdrawals, color: 'amber' },
        ].map((stat, i) => (
          <Card key={i} className="p-5">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {stat.value.toLocaleString()} FCFA
            </p>
          </Card>
        ))}
      </div>

      {/* Revenue by Category */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Revenus par catégorie</h3>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#94A3B8" tickFormatter={(v) => `${v/1000}K`} />
                <YAxis dataKey="category" type="category" stroke="#94A3B8" width={80} />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} FCFA`, 'Revenus']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDisputes = () => {
    const disputeRequests = requests.filter(r => 
      r.status === 'terminee' && 
      r.artisanAmount && 
      r.clientAmount && 
      Math.abs(r.artisanAmount - r.clientAmount) > 1000
    );

    const lowRatingArtisans = artisans.filter(a => a.rating < 3);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Gestion des Litiges</h1>

        {/* Low Rating Alerts */}
        {lowRatingArtisans.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="bg-orange-50">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-800">
                  Alertes notation ({lowRatingArtisans.length})
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-orange-100">
                {lowRatingArtisans.map((artisan) => (
                  <div key={artisan.id} className="p-4 flex items-center justify-between hover:bg-orange-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-orange-700">
                          {artisan.firstName.charAt(0)}{artisan.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{artisan.firstName} {artisan.lastName}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-red-500 fill-red-500" />
                          <span className="text-red-600 font-medium">{artisan.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedArtisan(artisan)}>
                        Voir profil
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => blockArtisan(artisan.id, true)}>
                        Suspendre
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amount Disputes */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800">Écarts de montants déclarés</h3>
          </CardHeader>
          <CardContent className="p-0">
            {disputeRequests.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun litige en cours</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {disputeRequests.map((req) => (
                  <div key={req.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{req.subCategory}</p>
                      <p className="text-sm text-slate-500">
                        Artisan: {req.artisanAmount?.toLocaleString()} F | Client: {req.clientAmount?.toLocaleString()} F
                      </p>
                    </div>
                    <Badge variant="danger">
                      Écart: {Math.abs((req.artisanAmount || 0) - (req.clientAmount || 0)).toLocaleString()} F
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMap = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Carte des Artisans</h1>
      <Card className="h-[600px] overflow-hidden">
        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">Carte interactive OpenStreetMap</p>
            <p className="text-sm text-slate-400">
              {artisans.filter(a => a.isOnline).length} artisans en ligne
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-left">
              {artisans.filter(a => a.isOnline).slice(0, 4).map((artisan) => {
                const cat = categories.find(c => c.id === artisan.category);
                return (
                  <div key={artisan.id} className="p-3 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="font-medium text-slate-700">{artisan.firstName}</span>
                      {cat && <cat.icon className={`w-4 h-4 ${cat.color}`} />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {artisan.latitude?.toFixed(4)}, {artisan.longitude?.toFixed(4)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
      
      {/* Profile */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Profil Administrateur</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">AT</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{currentUser?.firstName} {currentUser?.lastName}</p>
              <p className="text-slate-500">{currentUser?.email}</p>
              <Badge variant="primary" className="mt-1">Super Admin</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" defaultValue={currentUser?.firstName} />
            <Input label="Nom" defaultValue={currentUser?.lastName} />
            <Input label="Email" defaultValue={currentUser?.email} />
            <Input label="Téléphone" defaultValue={currentUser?.phone} />
          </div>
          <Button>Sauvegarder</Button>
        </CardContent>
      </Card>

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Paramètres de Commission</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Commission (%)" type="number" defaultValue="10" />
            <Input label="Provision minimale (FCFA)" type="number" defaultValue="500" />
            <Input label="Seuil solde artisan (FCFA)" type="number" defaultValue="5000" />
          </div>
          <Button>Sauvegarder</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-100 flex flex-col transition-all duration-300 fixed h-full z-50`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-emerald-600 text-xl">Tëgg</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5 text-slate-400" /> : <Menu className="w-5 h-5 text-slate-400" />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    activeSection === item.id
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => {
              logout();
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">
              {menuItems.find(m => m.id === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-slate-100 rounded-xl"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.filter(n => n.userId === 'admin').slice(0, 5).map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`w-full p-4 text-left hover:bg-slate-50 border-b border-slate-50 ${
                          !notif.read ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <p className="font-medium text-slate-800 text-sm">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-800">{currentUser?.firstName}</p>
                <p className="text-xs text-slate-500">Admin</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'artisans' && renderArtisans()}
          {activeSection === 'clients' && renderClients()}
          {activeSection === 'requests' && renderRequests()}
          {activeSection === 'finances' && renderFinances()}
          {activeSection === 'disputes' && renderDisputes()}
          {activeSection === 'map' && renderMap()}
          {activeSection === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Artisan Detail Modal */}
      <Modal
        isOpen={!!selectedArtisan}
        onClose={() => setSelectedArtisan(null)}
        title="Détails de l'artisan"
        size="lg"
      >
        {selectedArtisan && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {selectedArtisan.firstName.charAt(0)}{selectedArtisan.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedArtisan.firstName} {selectedArtisan.lastName}</h3>
                <p className="text-slate-500">{selectedArtisan.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Téléphone</p>
                <p className="font-medium">{selectedArtisan.phone}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Note</p>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-medium">{selectedArtisan.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Missions</p>
                <p className="font-medium">{selectedArtisan.totalMissions}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Solde</p>
                <p className="font-medium">{selectedArtisan.balance.toLocaleString()} FCFA</p>
              </div>
            </div>
            <div className="flex gap-3">
              {selectedArtisan.isActive ? (
                <Button variant="danger" onClick={() => blockArtisan(selectedArtisan.id, true)}>
                  Bloquer
                </Button>
              ) : (
                <Button variant="success" onClick={() => blockArtisan(selectedArtisan.id, false)}>
                  Débloquer
                </Button>
              )}
              {!selectedArtisan.isValidated && (
                <Button onClick={() => validateArtisan(selectedArtisan.id, true)}>
                  Valider l'inscription
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Client Detail Modal */}
      <Modal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title="Détails du client"
        size="lg"
      >
        {selectedClient && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {selectedClient.firstName.charAt(0)}{selectedClient.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedClient.firstName} {selectedClient.lastName}</h3>
                <p className="text-slate-500">{selectedClient.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Téléphone</p>
                <p className="font-medium">{selectedClient.phone}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Type</p>
                <p className="font-medium capitalize">{selectedClient.type}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <p className="text-sm text-slate-500">Adresse</p>
                <p className="font-medium">{selectedClient.address || 'Non renseignée'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Détails de la demande"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {getStatusBadge(selectedRequest.status)}
              {selectedRequest.isUrgent && <Badge variant="danger">Urgent</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Service</p>
                <p className="font-medium">{selectedRequest.subCategory}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Type</p>
                <p className="font-medium capitalize">{selectedRequest.serviceType}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Client</p>
                <p className="font-medium">{selectedRequest.clientName}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Artisan</p>
                <p className="font-medium">{selectedRequest.artisanName || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <p className="text-sm text-slate-500">Description</p>
                <p className="font-medium">{selectedRequest.description}</p>
              </div>
              {selectedRequest.artisanAmount && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Montant artisan</p>
                    <p className="font-medium">{selectedRequest.artisanAmount.toLocaleString()} FCFA</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Montant client</p>
                    <p className="font-medium">{selectedRequest.clientAmount?.toLocaleString() || '-'} FCFA</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
