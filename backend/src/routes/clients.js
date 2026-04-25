/**
 * Routes pour les clients (demandeurs)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, isClient } = require('../middleware/auth');

/**
 * GET /api/clients/profile
 * Profil du client connecté
 */
router.get('/profile', authenticate, isClient, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM service_requests WHERE client_id = c.id) as total_requests,
              (SELECT COUNT(*) FROM service_requests WHERE client_id = c.id AND status = 'completed') as completed_requests,
              (SELECT COUNT(*) FROM service_requests WHERE client_id = c.id AND status = 'pending') as pending_requests
       FROM clients c
       WHERE c.user_id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur client profile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/clients/profile
 * Mettre à jour le profil
 */
router.put('/profile', authenticate, isClient, async (req, res) => {
  try {
    const { firstName, lastName, email, photoUrl, clientType, companyName } = req.body;
    
    const result = await db.query(
      `UPDATE clients 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           photo_url = COALESCE($4, photo_url),
           client_type = COALESCE($5, client_type),
           company_name = COALESCE($6, company_name),
           updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [firstName, lastName, email, photoUrl, clientType, companyName, req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur update profile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/clients/addresses
 * Liste des adresses enregistrées
 */
router.get('/addresses', authenticate, isClient, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur addresses:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/clients/addresses
 * Ajouter une adresse
 */
router.post('/addresses', authenticate, isClient, async (req, res) => {
  try {
    const { label, fullAddress, neighborhood, city, latitude, longitude, isDefault } = req.body;
    
    // Si c'est l'adresse par défaut, désactiver les autres
    if (isDefault) {
      await db.query(
        'UPDATE addresses SET is_default = FALSE WHERE user_id = $1',
        [req.user.id]
      );
    }
    
    const result = await db.query(
      `INSERT INTO addresses (user_id, label, full_address, neighborhood, city, latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, label, fullAddress, neighborhood, city || 'Dakar', latitude, longitude, isDefault || false]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur add address:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/clients/addresses/:id
 * Supprimer une adresse
 */
router.delete('/addresses/:id', authenticate, isClient, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur delete address:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/clients/notifications
 * Notifications du client
 */
router.get('/notifications', authenticate, isClient, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/clients/notifications/read-all
 * Marquer toutes les notifications comme lues
 */
router.put('/notifications/read-all', authenticate, isClient, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mark all read:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/clients/stats
 * Statistiques du client
 */
router.get('/stats', authenticate, isClient, async (req, res) => {
  try {
    const clientResult = await db.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [req.user.id]
    );
    
    const clientId = clientResult.rows[0].id;
    
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) as total_requests,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM service_requests
       WHERE client_id = $1`,
      [clientId]
    );
    
    res.json(statsResult.rows[0]);
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
