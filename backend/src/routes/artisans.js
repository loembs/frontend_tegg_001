/**
 * Routes pour les artisans
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, isArtisan } = require('../middleware/auth');

/**
 * GET /api/artisans/profile
 * Profil de l'artisan connecté
 */
router.get('/profile', authenticate, isArtisan, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, 
              ARRAY_AGG(DISTINCT jsonb_build_object(
                'id', sc.id,
                'name', sc.name_fr,
                'icon', sc.icon
              )) FILTER (WHERE sc.id IS NOT NULL) as categories
       FROM artisans a
       LEFT JOIN artisan_categories ac ON a.id = ac.artisan_id
       LEFT JOIN service_categories sc ON ac.category_id = sc.id
       WHERE a.user_id = $1
       GROUP BY a.id`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }
    
    const artisan = result.rows[0];
    
    // Statistiques
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'completed') as completed_missions,
         COUNT(*) FILTER (WHERE status IN ('accepted', 'in_progress', 'artisan_completed')) as active_missions,
         COALESCE(SUM(final_amount), 0) as total_earnings
       FROM missions
       WHERE artisan_id = $1`,
      [artisan.id]
    );
    
    res.json({
      ...artisan,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Erreur artisan profile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/artisans/profile
 * Mettre à jour le profil
 */
router.put('/profile', authenticate, isArtisan, async (req, res) => {
  try {
    const { firstName, lastName, email, bio, photoUrl } = req.body;
    
    const result = await db.query(
      `UPDATE artisans 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           bio = COALESCE($4, bio),
           photo_url = COALESCE($5, photo_url),
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [firstName, lastName, email, bio, photoUrl, req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur update profile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/artisans/location
 * Mettre à jour la position
 */
router.put('/location', authenticate, isArtisan, [
  body('latitude').isDecimal().withMessage('Latitude invalide'),
  body('longitude').isDecimal().withMessage('Longitude invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { latitude, longitude } = req.body;
    
    await db.query(
      `UPDATE artisans 
       SET current_latitude = $1, 
           current_longitude = $2,
           last_location_update = NOW()
       WHERE user_id = $3`,
      [latitude, longitude, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur update location:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/artisans/online
 * Mettre à jour le statut en ligne
 */
router.put('/online', authenticate, isArtisan, async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    await db.query(
      'UPDATE artisans SET is_online = $1 WHERE user_id = $2',
      [isOnline, req.user.id]
    );
    
    res.json({ success: true, isOnline });
  } catch (error) {
    console.error('Erreur update online:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/artisans/balance
 * Solde et historique financier
 */
router.get('/balance', authenticate, isArtisan, async (req, res) => {
  try {
    // Récupérer le solde
    const artisanResult = await db.query(
      'SELECT id, balance, balance_threshold, total_earnings FROM artisans WHERE user_id = $1',
      [req.user.id]
    );
    
    const artisan = artisanResult.rows[0];
    
    // Historique des dépôts
    const depositsResult = await db.query(
      `SELECT * FROM deposits 
       WHERE artisan_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [artisan.id]
    );
    
    // Historique des commissions
    const commissionsResult = await db.query(
      `SELECT cl.*, m.reference as mission_reference
       FROM commission_logs cl
       JOIN missions m ON cl.mission_id = m.id
       WHERE cl.artisan_id = $1
       ORDER BY cl.created_at DESC
       LIMIT 10`,
      [artisan.id]
    );
    
    // Demandes de retrait
    const withdrawalsResult = await db.query(
      `SELECT * FROM withdrawal_requests 
       WHERE artisan_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [artisan.id]
    );
    
    res.json({
      balance: parseFloat(artisan.balance) || 0,
      threshold: parseFloat(artisan.balance_threshold) || 1000,
      totalEarnings: parseFloat(artisan.total_earnings) || 0,
      deposits: depositsResult.rows,
      commissions: commissionsResult.rows,
      withdrawals: withdrawalsResult.rows
    });
  } catch (error) {
    console.error('Erreur balance:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/artisans/deposit
 * Faire un dépôt
 */
router.post('/deposit', authenticate, isArtisan, [
  body('amount').isNumeric().custom(v => v >= 500).withMessage('Montant minimum: 500 FCFA'),
  body('paymentReference').optional().isString()
], async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { amount, paymentMethod, paymentReference } = req.body;
    
    await client.query('BEGIN');
    
    // Récupérer l'artisan
    const artisanResult = await client.query(
      'SELECT id, balance FROM artisans WHERE user_id = $1',
      [req.user.id]
    );
    
    const artisan = artisanResult.rows[0];
    
    // Générer la référence
    const refResult = await client.query("SELECT generate_reference('DEP') as ref");
    const reference = refResult.rows[0].ref;
    
    // Créer le dépôt
    await client.query(
      `INSERT INTO deposits (reference, artisan_id, amount, payment_method, payment_reference, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, 'completed', NOW())`,
      [reference, artisan.id, amount, paymentMethod || 'wave', paymentReference]
    );
    
    // Mettre à jour le solde
    await client.query(
      'UPDATE artisans SET balance = balance + $1 WHERE id = $2',
      [amount, artisan.id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Dépôt effectué',
      reference,
      newBalance: parseFloat(artisan.balance) + parseFloat(amount)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur deposit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/artisans/withdraw
 * Demander un retrait (vider son portefeuille)
 */
router.post('/withdraw', authenticate, isArtisan, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupérer l'artisan
    const artisanResult = await client.query(
      `SELECT a.*, u.phone
       FROM artisans a
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = $1`,
      [req.user.id]
    );
    
    const artisan = artisanResult.rows[0];
    const balance = parseFloat(artisan.balance) || 0;
    
    if (balance <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    
    // Vérifier qu'il n'y a pas de demande en cours
    const pendingResult = await client.query(
      `SELECT id FROM withdrawal_requests 
       WHERE artisan_id = $1 AND status = 'pending'`,
      [artisan.id]
    );
    
    if (pendingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Une demande de retrait est déjà en cours' });
    }
    
    // Générer la référence
    const refResult = await client.query("SELECT generate_reference('WIT') as ref");
    const reference = refResult.rows[0].ref;
    
    // Créer la demande de retrait
    await client.query(
      `INSERT INTO withdrawal_requests (reference, artisan_id, amount, phone_number, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [reference, artisan.id, balance, artisan.phone]
    );
    
    await client.query('COMMIT');
    
    // Notifier les admins
    const adminUsers = await db.query(
      `SELECT u.id FROM users u
       JOIN admins a ON u.id = a.user_id`
    );
    
    for (const admin of adminUsers.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'system', 'Demande de retrait', 
                 $2, $3)`,
        [
          admin.id,
          `${artisan.first_name} ${artisan.last_name} demande un retrait de ${balance} FCFA`,
          JSON.stringify({ artisanId: artisan.id, amount: balance, reference })
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'Demande de retrait enregistrée',
      reference,
      amount: balance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur withdraw:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/artisans/notifications
 * Notifications de l'artisan
 */
router.get('/notifications', authenticate, isArtisan, async (req, res) => {
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
 * PUT /api/artisans/notifications/:id/read
 * Marquer une notification comme lue
 */
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mark read:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
