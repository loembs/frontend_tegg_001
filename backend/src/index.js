/**
 * TËGG API - Point d'entrée principal
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const artisanRoutes = require('./routes/artisans');
const requestRoutes = require('./routes/requests');
const missionRoutes = require('./routes/missions');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');

const app = express();
const httpServer = createServer(app);

// Socket.IO pour les notifications temps réel
const io = new Server(httpServer, {
  cors: {
    origin: process.env.MOBILE_APP_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware de sécurité
app.use(helmet());

// CORS
app.use(cors({
  origin: [
    process.env.MOBILE_APP_URL || 'http://localhost:5173',
    process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api/', limiter);

// Parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rendre io accessible dans les routes
app.set('io', io);

// ================================
// ROUTES
// ================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);

// ================================
// SOCKET.IO - Notifications temps réel
// ================================

// Map des utilisateurs connectés
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('Nouvelle connexion Socket.IO:', socket.id);
  
  // Authentification du socket
  socket.on('authenticate', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`Utilisateur ${userId} connecté`);
  });
  
  // Rejoindre une room par catégorie (pour les artisans)
  socket.on('join_category', (categoryId) => {
    socket.join(`category_${categoryId}`);
    console.log(`Socket ${socket.id} a rejoint category_${categoryId}`);
  });
  
  // Déconnexion
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`Utilisateur ${socket.userId} déconnecté`);
    }
  });
});

// Fonction helper pour envoyer une notification
app.notifyUser = (userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

// Fonction helper pour notifier une catégorie
app.notifyCategory = (categoryId, event, data) => {
  io.to(`category_${categoryId}`).emit(event, data);
};

// ================================
// GESTION DES ERREURS
// ================================

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path
  });
});

// Erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ================================
// DÉMARRAGE DU SERVEUR
// ================================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║         🔧 TËGG API SERVER 🔧          ║
  ╠════════════════════════════════════════╣
  ║  Status:    Running                    ║
  ║  Port:      ${PORT}                        ║
  ║  Mode:      ${process.env.NODE_ENV || 'development'}               ║
  ║  API:       http://localhost:${PORT}/api   ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = { app, io };
