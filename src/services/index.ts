/**
 * Point d'entrée unique pour les services
 * Permet de basculer facilement entre l'API backend et Supabase
 */

// Feature flag pour choisir le backend
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true' || true;

// Conditionnellement exporter le bon service
if (USE_SUPABASE) {
  console.log('🟢 Using Supabase backend');
  module.exports = require('./supabase');
} else {
  console.log('🔵 Using legacy API backend');
  module.exports = require('./api');
}

// Pour les imports ES6
export { default as api } from './api';
export { default as supabaseService } from './supabase';

// Service actif
export const service = USE_SUPABASE ? supabaseService : api;
export default service;
