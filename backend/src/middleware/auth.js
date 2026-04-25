/**
 * Middleware d'authentification JWT
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tegg_secret_key_change_in_production';

/**
 * Vérifie le token JWT
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Récupérer l'utilisateur
    const result = await db.query(
      'SELECT id, phone, user_type, status FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }
    
    const user = result.rows[0];
    
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Compte bloqué' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    console.error('Erreur auth:', error);
    res.status(500).json({ error: 'Erreur d\'authentification' });
  }
};

/**
 * Vérifie que l'utilisateur est un client
 */
const isClient = (req, res, next) => {
  if (req.user.user_type !== 'client') {
    return res.status(403).json({ error: 'Accès réservé aux clients' });
  }
  next();
};

/**
 * Vérifie que l'utilisateur est un artisan
 */
const isArtisan = (req, res, next) => {
  if (req.user.user_type !== 'artisan') {
    return res.status(403).json({ error: 'Accès réservé aux artisans' });
  }
  next();
};

/**
 * Vérifie que l'utilisateur est un admin
 */
const isAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

/**
 * Génère un token JWT
 */
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = {
  authenticate,
  isClient,
  isArtisan,
  isAdmin,
  generateToken
};
