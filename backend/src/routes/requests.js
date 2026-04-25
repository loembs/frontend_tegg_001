/**
 * Routes pour les demandes de service
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, isClient } = require('../middleware/auth');

/**
 * GET /api/requests
 * Liste des demandes du client connecté
 */
router.get('/', authenticate, isClient, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Récupérer l'ID client
    const clientResult = await db.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [req.user.id]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profil client non trouvé' });
    }
    
    const clientId = clientResult.rows[0].id;
    
    let query = `
      SELECT sr.*, 
             sc.name_fr as category_name, 
             sc.icon as category_icon,
             sc.color as category_color,
             ssc.name_fr as subcategory_name,
             si.name_fr as item_name,
             m.id as mission_id,
             m.status as mission_status,
             m.artisan_id,
             a.first_name as artisan_first_name,
             a.last_name as artisan_last_name,
             a.rating as artisan_rating,
             ua.phone as artisan_phone
      FROM service_requests sr
      JOIN service_categories sc ON sr.category_id = sc.id
      LEFT JOIN service_subcategories ssc ON sr.subcategory_id = ssc.id
      LEFT JOIN service_items si ON sr.item_id = si.id
      LEFT JOIN missions m ON sr.id = m.request_id
      LEFT JOIN artisans a ON m.artisan_id = a.id
      LEFT JOIN users ua ON a.user_id = ua.id
      WHERE sr.client_id = $1
    `;
    
    const params = [clientId];
    
    if (status) {
      query += ' AND sr.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY sr.created_at DESC';
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur requests list:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/requests/:id
 * Détails d'une demande
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sr.*, 
              sc.name_fr as category_name, 
              sc.icon as category_icon,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              uc.phone as client_phone,
              m.id as mission_id,
              m.status as mission_status,
              m.artisan_declared_amount,
              m.client_declared_amount,
              a.id as artisan_profile_id,
              a.first_name as artisan_first_name,
              a.last_name as artisan_last_name,
              a.rating as artisan_rating,
              ua.phone as artisan_phone
       FROM service_requests sr
       JOIN service_categories sc ON sr.category_id = sc.id
       JOIN clients c ON sr.client_id = c.id
       JOIN users uc ON c.user_id = uc.id
       LEFT JOIN missions m ON sr.id = m.request_id
       LEFT JOIN artisans a ON m.artisan_id = a.id
       LEFT JOIN users ua ON a.user_id = ua.id
       WHERE sr.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur request details:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/requests
 * Créer une nouvelle demande
 */
router.post('/', authenticate, isClient, [
  body('categoryId').isUUID().withMessage('Catégorie invalide'),
  body('serviceType').isIn(['installation', 'reparation']).withMessage('Type invalide'),
  body('address').notEmpty().withMessage('Adresse requise')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      categoryId,
      subcategoryId,
      itemId,
      serviceType,
      title,
      description,
      quantity,
      isUrgent,
      address,
      neighborhood,
      latitude,
      longitude
    } = req.body;
    
    // Récupérer l'ID client
    const clientResult = await db.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [req.user.id]
    );
    
    const clientId = clientResult.rows[0].id;
    
    // Générer la référence
    const refResult = await db.query("SELECT generate_reference('TEG') as ref");
    const reference = refResult.rows[0].ref;
    
    // Créer la demande
    const result = await db.query(
      `INSERT INTO service_requests (
        reference, client_id, category_id, subcategory_id, item_id,
        service_type, title, description, quantity, is_urgent,
        address, neighborhood, latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        reference, clientId, categoryId, subcategoryId, itemId,
        serviceType, title || `Demande ${serviceType}`, description, quantity || 1, isUrgent || false,
        address, neighborhood, latitude, longitude
      ]
    );
    
    const request = result.rows[0];
    
    // Notifier les artisans de cette catégorie (via Socket.IO)
    const io = req.app.get('io');
    if (io) {
      io.to(`category_${categoryId}`).emit('new_request', {
        id: request.id,
        reference: request.reference,
        title: request.title,
        serviceType: request.service_type,
        address: request.address,
        isUrgent: request.is_urgent,
        createdAt: request.created_at
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Demande créée avec succès',
      request
    });
  } catch (error) {
    console.error('Erreur create request:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

/**
 * PUT /api/requests/:id/cancel
 * Annuler une demande
 */
router.put('/:id/cancel', authenticate, isClient, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Vérifier que la demande appartient au client
    const clientResult = await db.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [req.user.id]
    );
    
    const checkResult = await db.query(
      `SELECT * FROM service_requests 
       WHERE id = $1 AND client_id = $2 AND status IN ('pending', 'in_progress')`,
      [req.params.id, clientResult.rows[0].id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée ou non annulable' });
    }
    
    // Annuler
    await db.query(
      `UPDATE service_requests 
       SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1
       WHERE id = $2`,
      [reason, req.params.id]
    );
    
    // Si une mission existe, la mettre à jour aussi
    await db.query(
      `UPDATE missions SET status = 'disputed' WHERE request_id = $1`,
      [req.params.id]
    );
    
    res.json({ success: true, message: 'Demande annulée' });
  } catch (error) {
    console.error('Erreur cancel request:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/requests/:id/confirm
 * Client confirme la fin de mission et déclare le montant payé
 */
router.put('/:id/confirm', authenticate, isClient, [
  body('amount').isNumeric().withMessage('Montant invalide')
], async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { amount, rating, comment } = req.body;
    
    await client.query('BEGIN');
    
    // Récupérer la mission
    const missionResult = await client.query(
      `SELECT m.*, sr.client_id, c.user_id as client_user_id
       FROM missions m
       JOIN service_requests sr ON m.request_id = sr.id
       JOIN clients c ON sr.client_id = c.id
       WHERE sr.id = $1 AND m.status = 'artisan_completed'`,
      [req.params.id]
    );
    
    if (missionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Mission non trouvée ou statut invalide' });
    }
    
    const mission = missionResult.rows[0];
    
    // Mettre à jour la mission
    await client.query(
      `UPDATE missions 
       SET client_declared_amount = $1, 
           client_confirmed_at = NOW(),
           status = 'client_confirmed'
       WHERE id = $2`,
      [amount, mission.id]
    );
    
    // Calculer la commission finale
    const artisanAmount = parseFloat(mission.artisan_declared_amount) || 0;
    const clientAmount = parseFloat(amount) || 0;
    const finalAmount = Math.min(artisanAmount, clientAmount); // Prendre le plus petit
    const commission = Math.max(finalAmount * 0.01, 500); // 1% minimum 500 FCFA
    const provision = parseFloat(mission.provision_amount) || 500;
    const additionalCommission = Math.max(0, commission - provision);
    
    // Prélever la commission additionnelle
    if (additionalCommission > 0) {
      await client.query(
        `UPDATE artisans 
         SET balance = balance - $1 
         WHERE id = $2`,
        [additionalCommission, mission.artisan_id]
      );
      
      // Log de commission
      await client.query(
        `INSERT INTO commission_logs (mission_id, artisan_id, type, amount, description)
         VALUES ($1, $2, 'adjustment', $3, 'Commission finale - ajustement')`,
        [mission.id, mission.artisan_id, additionalCommission]
      );
    }
    
    // Finaliser la mission
    await client.query(
      `UPDATE missions 
       SET final_amount = $1, 
           commission_amount = $2,
           status = 'completed',
           completed_at = NOW()
       WHERE id = $3`,
      [finalAmount, commission, mission.id]
    );
    
    // Mettre à jour la demande
    await client.query(
      `UPDATE service_requests SET status = 'completed' WHERE id = $1`,
      [req.params.id]
    );
    
    // Ajouter la review si rating fourni
    if (rating) {
      await client.query(
        `INSERT INTO reviews (mission_id, client_id, artisan_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)`,
        [mission.id, mission.client_id, mission.artisan_id, rating, comment]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Mission confirmée',
      commission: commission
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur confirm request:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

module.exports = router;
