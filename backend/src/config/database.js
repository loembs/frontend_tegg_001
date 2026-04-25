/**
 * Configuration de la base de données PostgreSQL
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tegg_db',
  user: process.env.DB_USER || 'tegg_user',
  password: process.env.DB_PASSWORD || 'TeggSecure2024!',
  max: 20, // Nombre max de connexions
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test de connexion au démarrage
pool.on('connect', () => {
  console.log('📦 Connecté à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
