/**
 * Routes pour les missions
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, isArtisan } = require('../middleware/auth');

/**
 * GET /api/missions/available
 * Liste des demandes disponibles pour un artisan
 */
router.get('/available', authenticate, isArtisan, async (req, res) => {
  try {
    // Récupérer le profil artisan et ses catégories
    const artisanResult = await db.query(
      `SELECT a.id, a.current_latitude, a.current_longitude,
              ARRAY_AGG(ac.category_id) as categories
       FROM artisans a
       LEFT JOIN artisan_categories ac ON a.id = ac.artisan_id
       WHERE a.user_id = $1
       GROUP BY a.id`,
      [req.user.id]
    );
    
    if (artisanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profil artisan non trouvé' });
    }
    
    const artisan = artisanResult.rows[0];
    const categories = artisan.categories.filter(c => c !== null);
    
    if (categories.length === 0) {
      return res.json([]);
    }
    
    // Récupérer les demandes en attente dans ses catégories
    const result = await db.query(
      `SELECT sr.*, 
              sc.name_fr as category_name,
              sc.icon as category_icon,
              sc.color as category_color,
              ssc.name_fr as subcategory_name,
              si.name_fr as item_name,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              CASE 
                WHEN sr.latitude IS NOT NULL AND $2::decimal IS NOT NULL THEN
                  calculate_distance(sr.latitude, sr.longitude, $2, $3)
                ELSE NULL
              END as distance_km
       FROM service_requests sr
       JOIN service_categories sc ON sr.category_id = sc.id
       LEFT JOIN service_subcategories ssc ON sr.subcategory_id = ssc.id
       LEFT JOIN service_items si ON sr.item_id = si.id
       JOIN clients c ON sr.client_id = c.id
       WHERE sr.category_id = ANY($1)
         AND sr.status = 'pending'
         AND NOT EXISTS (SELECT 1 FROM missions m WHERE m.request_id = sr.id)
       ORDER BY sr.is_urgent DESC, sr.created_at DESC`,
      [categories, artisan.current_latitude, artisan.current_longitude]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur available missions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/missions
 * Liste des missions de l'artisan
 */
router.get('/', authenticate, isArtisan, async (req, res) => {
  try {
    const { status } = req.query;
    
    const artisanResult = await db.query(
      'SELECT id FROM artisans WHERE user_id = $1',
      [req.user.id]
    );
    
    const artisanId = artisanResult.rows[0].id;
    
    let query = `
      SELECT m.*, 
             sr.title, sr.description, sr.address, sr.neighborhood,
             sr.service_type, sr.quantity, sr.is_urgent,
             sr.latitude, sr.longitude,
             sc.name_fr as category_name,
             sc.icon as category_icon,
             c.first_name as client_first_name,
             c.last_name as client_last_name,
             uc.phone as client_phone
      FROM missions m
      JOIN service_requests sr ON m.request_id = sr.id
      JOIN service_categories sc ON sr.category_id = sc.id
      JOIN clients c ON sr.client_id = c.id
      JOIN users uc ON c.user_id = uc.id
      WHERE m.artisan_id = $1
    `;
    
    const params = [artisanId];
    
    if (status) {
      query += ' AND m.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY m.created_at DESC';
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur missions list:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/missions/accept/:requestId
 * Accepter une demande (créer une mission)
 */
router.post('/accept/:requestId', authenticate, isArtisan, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupérer le profil artisan
    const artisanResult = await client.query(
      'SELECT * FROM artisans WHERE user_id = $1',
      [req.user.id]
    );
    
    if (artisanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Profil artisan non trouvé' });
    }
    
    const artisan = artisanResult.rows[0];
    
    // Vérifier que l'artisan est validé
    if (!artisan.is_validated) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Votre compte n\'est pas encore validé' });
    }
    
    // Vérifier le solde (minimum 500 FCFA pour la provision)
    const provision = 500;
    if (parseFloat(artisan.balance) < provision) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Solde insuffisant',
        message: `Vous devez avoir au moins ${provision} FCFA pour accepter une mission`,
        balance: artisan.balance
      });
    }
    
    // Vérifier que la demande est disponible
    const requestResult = await client.query(
      `SELECT sr.*, c.user_id as client_user_id
       FROM service_requests sr
       JOIN clients c ON sr.client_id = c.id
       WHERE sr.id = $1 AND sr.status = 'pending'`,
      [req.params.requestId]
    );
    
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande non disponible' });
    }
    
    const request = requestResult.rows[0];
    
    // Vérifier qu'aucune mission n'existe déjà
    const existingMission = await client.query(
      'SELECT id FROM missions WHERE request_id = $1',
      [req.params.requestId]
    );
    
    if (existingMission.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cette demande a déjà été acceptée' });
    }
    
    // Calculer la distance
    let distance = null;
    if (request.latitude && artisan.current_latitude) {
      const distResult = await client.query(
        'SELECT calculate_distance($1, $2, $3, $4) as distance',
        [request.latitude, request.longitude, artisan.current_latitude, artisan.current_longitude]
      );
      distance = distResult.rows[0].distance;
    }
    
    // Générer la référence
    const refResult = await client.query("SELECT generate_reference('MIS') as ref");
    const reference = refResult.rows[0].ref;
    
    // Créer la mission
    const missionResult = await client.query(
      `INSERT INTO missions (reference, request_id, artisan_id, provision_amount, distance_km, status)
       VALUES ($1, $2, $3, $4, $5, 'accepted')
       RETURNING *`,
      [reference, req.params.requestId, artisan.id, provision, distance]
    );
    
    const mission = missionResult.rows[0];
    
    // Déduire la provision du solde
    await client.query(
      'UPDATE artisans SET balance = balance - $1 WHERE id = $2',
      [provision, artisan.id]
    );
    
    // Log de commission
    await client.query(
      `INSERT INTO commission_logs (mission_id, artisan_id, type, amount, description, balance_before, balance_after)
       VALUES ($1, $2, 'provision', $3, 'Provision prélevée à l''acceptation', $4, $5)`,
      [mission.id, artisan.id, provision, artisan.balance, parseFloat(artisan.balance) - provision]
    );
    
    // Mettre à jour le statut de la demande
    await client.query(
      `UPDATE service_requests SET status = 'in_progress' WHERE id = $1`,
      [req.params.requestId]
    );
    
    await client.query('COMMIT');
    
    // Notifier le client
    const io = req.app.get('io');
    if (io && req.app.notifyUser) {
      req.app.notifyUser(request.client_user_id, 'request_accepted', {
        requestId: req.params.requestId,
        missionId: mission.id,
        artisan: {
          firstName: artisan.first_name,
          lastName: artisan.last_name,
          rating: artisan.rating
        }
      });
    }
    
    // Créer une notification en base
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'request_accepted', 'Demande acceptée', 
               $2, $3)`,
      [
        request.client_user_id,
        `${artisan.first_name} ${artisan.last_name} a accepté votre demande`,
        JSON.stringify({ requestId: req.params.requestId, missionId: mission.id })
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Demande acceptée',
      mission,
      provision,
      newBalance: parseFloat(artisan.balance) - provision
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur accept mission:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/missions/:id/complete
 * Artisan déclare la mission terminée avec le montant perçu
 */
router.put('/:id/complete', authenticate, isArtisan, [
  body('amount').isNumeric().withMessage('Montant requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { amount } = req.body;
    
    // Récupérer l'artisan
    const artisanResult = await db.query(
      'SELECT id FROM artisans WHERE user_id = $1',
      [req.user.id]
    );
    
    const artisanId = artisanResult.rows[0].id;
    
    // Vérifier que la mission appartient à l'artisan
    const missionResult = await db.query(
      `SELECT m.*, sr.client_id, c.user_id as client_user_id
       FROM missions m
       JOIN service_requests sr ON m.request_id = sr.id
       JOIN clients c ON sr.client_id = c.id
       WHERE m.id = $1 AND m.artisan_id = $2 AND m.status IN ('accepted', 'in_progress')`,
      [req.params.id, artisanId]
    );
    
    if (missionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }
    
    const mission = missionResult.rows[0];
    
    // Mettre à jour la mission
    await db.query(
      `UPDATE missions 
       SET artisan_declared_amount = $1, 
           artisan_completed_at = NOW(),
           status = 'artisan_completed'
       WHERE id = $2`,
      [amount, req.params.id]
    );
    
    // Notifier le client
    const io = req.app.get('io');
    if (io && req.app.notifyUser) {
      req.app.notifyUser(mission.client_user_id, 'mission_completed', {
        missionId: mission.id,
        requestId: mission.request_id,
        amount
      });
    }
    
    // Créer notification
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'mission_completed', 'Mission terminée', 
               'Votre artisan a terminé la mission. Veuillez confirmer pour recevoir votre garantie.',
               $2)`,
      [mission.client_user_id, JSON.stringify({ missionId: mission.id })]
    );
    
    res.json({
      success: true,
      message: 'Mission marquée comme terminée',
      awaitingClientConfirmation: true
    });
  } catch (error) {
    console.error('Erreur complete mission:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/missions/:id
 * Détails d'une mission
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*,
              sr.title, sr.description, sr.address, sr.neighborhood,
              sr.service_type, sr.quantity, sr.is_urgent,
              sr.latitude, sr.longitude,
              sc.name_fr as category_name,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              uc.phone as client_phone,
              a.first_name as artisan_first_name,
              a.last_name as artisan_last_name,
              a.rating as artisan_rating,
              ua.phone as artisan_phone
       FROM missions m
       JOIN service_requests sr ON m.request_id = sr.id
       JOIN service_categories sc ON sr.category_id = sc.id
       JOIN clients c ON sr.client_id = c.id
       JOIN users uc ON c.user_id = uc.id
       JOIN artisans a ON m.artisan_id = a.id
       JOIN users ua ON a.user_id = ua.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur mission details:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
