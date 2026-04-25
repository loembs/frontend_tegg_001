/**
 * Routes d'administration
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');

// Toutes les routes admin nécessitent l'authentification
router.use(authenticate, isAdmin);

/**
 * GET /api/admin/dashboard
 * Statistiques du dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    // KPIs principaux
    const kpis = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM artisans) as total_artisans,
        (SELECT COUNT(*) FROM artisans WHERE is_validated = TRUE) as validated_artisans,
        (SELECT COUNT(*) FROM clients) as total_clients,
        (SELECT COUNT(*) FROM service_requests) as total_requests,
        (SELECT COUNT(*) FROM service_requests WHERE status = 'pending') as pending_requests,
        (SELECT COUNT(*) FROM service_requests WHERE status = 'completed') as completed_requests,
        (SELECT COUNT(*) FROM missions WHERE status = 'completed') as completed_missions,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM missions WHERE status = 'completed') as total_revenue
    `);
    
    // Alertes
    const alerts = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM artisans WHERE is_validated = FALSE AND user_id IN 
          (SELECT id FROM users WHERE status = 'pending')) as pending_validations,
        (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending') as pending_withdrawals,
        (SELECT COUNT(*) FROM disputes WHERE status = 'open') as open_disputes,
        (SELECT COUNT(*) FROM artisans WHERE rating < 3) as low_rating_artisans
    `);
    
    // Revenus par jour (7 derniers jours)
    const dailyRevenue = await db.query(`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as missions,
        COALESCE(SUM(commission_amount), 0) as revenue
      FROM missions
      WHERE status = 'completed' 
        AND completed_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(completed_at)
      ORDER BY date
    `);
    
    // Répartition par catégorie
    const categoryStats = await db.query(`
      SELECT 
        sc.name_fr as category,
        COUNT(sr.id) as count,
        sc.color
      FROM service_requests sr
      JOIN service_categories sc ON sr.category_id = sc.id
      WHERE sr.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY sc.id, sc.name_fr, sc.color
      ORDER BY count DESC
    `);
    
    // Top quartiers
    const topNeighborhoods = await db.query(`
      SELECT 
        neighborhood,
        COUNT(*) as count
      FROM service_requests
      WHERE neighborhood IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY neighborhood
      ORDER BY count DESC
      LIMIT 5
    `);
    
    res.json({
      kpis: kpis.rows[0],
      alerts: alerts.rows[0],
      dailyRevenue: dailyRevenue.rows,
      categoryStats: categoryStats.rows,
      topNeighborhoods: topNeighborhoods.rows
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/artisans
 * Liste des artisans
 */
router.get('/artisans', async (req, res) => {
  try {
    const { status, validated, search } = req.query;
    
    let query = `
      SELECT a.*, u.phone, u.status as user_status, u.last_login,
             ARRAY_AGG(DISTINCT sc.name_fr) FILTER (WHERE sc.id IS NOT NULL) as categories
      FROM artisans a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN artisan_categories ac ON a.id = ac.artisan_id
      LEFT JOIN service_categories sc ON ac.category_id = sc.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (validated !== undefined) {
      query += ` AND a.is_validated = $${paramIndex}`;
      params.push(validated === 'true');
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (a.first_name ILIKE $${paramIndex} OR a.last_name ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` GROUP BY a.id, u.phone, u.status, u.last_login ORDER BY a.created_at DESC`;
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur artisans list:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/artisans/:id/validate
 * Valider un artisan
 */
router.put('/artisans/:id/validate', async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupérer l'admin
    const adminResult = await client.query(
      'SELECT id FROM admins WHERE user_id = $1',
      [req.user.id]
    );
    
    const adminId = adminResult.rows[0].id;
    
    // Valider l'artisan
    await client.query(
      `UPDATE artisans 
       SET is_validated = TRUE, validated_at = NOW(), validated_by = $1
       WHERE id = $2`,
      [adminId, req.params.id]
    );
    
    // Mettre à jour le statut utilisateur
    await client.query(
      `UPDATE users 
       SET status = 'active'
       WHERE id = (SELECT user_id FROM artisans WHERE id = $1)`,
      [req.params.id]
    );
    
    // Notifier l'artisan
    const artisanResult = await client.query(
      'SELECT user_id FROM artisans WHERE id = $1',
      [req.params.id]
    );
    
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'system', 'Compte validé', 'Votre compte artisan a été validé. Vous pouvez maintenant recevoir des missions.')`,
      [artisanResult.rows[0].user_id]
    );
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Artisan validé' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur validate artisan:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/admin/artisans/:id/block
 * Bloquer/Débloquer un artisan
 */
router.put('/artisans/:id/block', async (req, res) => {
  try {
    const { blocked } = req.body;
    
    await db.query(
      `UPDATE users 
       SET status = $1
       WHERE id = (SELECT user_id FROM artisans WHERE id = $2)`,
      [blocked ? 'blocked' : 'active', req.params.id]
    );
    
    res.json({ success: true, message: blocked ? 'Artisan bloqué' : 'Artisan débloqué' });
  } catch (error) {
    console.error('Erreur block artisan:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/clients
 * Liste des clients
 */
router.get('/clients', async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = `
      SELECT c.*, u.phone, u.status as user_status, u.last_login,
             (SELECT COUNT(*) FROM service_requests WHERE client_id = c.id) as total_requests
      FROM clients c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR u.phone ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY c.created_at DESC`;
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur clients list:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/requests
 * Liste des demandes
 */
router.get('/requests', async (req, res) => {
  try {
    const { status, categoryId, startDate, endDate } = req.query;
    
    let query = `
      SELECT sr.*, 
             sc.name_fr as category_name,
             c.first_name as client_first_name,
             c.last_name as client_last_name,
             uc.phone as client_phone,
             m.id as mission_id,
             m.status as mission_status,
             a.first_name as artisan_first_name,
             a.last_name as artisan_last_name
      FROM service_requests sr
      JOIN service_categories sc ON sr.category_id = sc.id
      JOIN clients c ON sr.client_id = c.id
      JOIN users uc ON c.user_id = uc.id
      LEFT JOIN missions m ON sr.id = m.request_id
      LEFT JOIN artisans a ON m.artisan_id = a.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND sr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (categoryId) {
      query += ` AND sr.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND sr.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND sr.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += ` ORDER BY sr.created_at DESC LIMIT 100`;
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur requests list:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/withdrawals
 * Liste des demandes de retrait
 */
router.get('/withdrawals', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT wr.*, 
             a.first_name, a.last_name, a.balance, a.rating,
             u.phone
      FROM withdrawal_requests wr
      JOIN artisans a ON wr.artisan_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND wr.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY wr.created_at DESC';
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur withdrawals:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/withdrawals/:id/process
 * Traiter une demande de retrait
 */
router.put('/withdrawals/:id/process', async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { approved, rejectionReason, paymentReference } = req.body;
    
    await client.query('BEGIN');
    
    // Récupérer la demande
    const withdrawalResult = await client.query(
      `SELECT wr.*, a.user_id as artisan_user_id, a.balance
       FROM withdrawal_requests wr
       JOIN artisans a ON wr.artisan_id = a.id
       WHERE wr.id = $1 AND wr.status = 'pending'`,
      [req.params.id]
    );
    
    if (withdrawalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const withdrawal = withdrawalResult.rows[0];
    
    // Récupérer l'admin
    const adminResult = await client.query(
      'SELECT id FROM admins WHERE user_id = $1',
      [req.user.id]
    );
    
    const adminId = adminResult.rows[0].id;
    
    if (approved) {
      // Approuver et vider le solde
      await client.query(
        `UPDATE withdrawal_requests 
         SET status = 'completed', processed_by = $1, processed_at = NOW(), payment_reference = $2
         WHERE id = $3`,
        [adminId, paymentReference, req.params.id]
      );
      
      await client.query(
        `UPDATE artisans SET balance = 0 WHERE id = $1`,
        [withdrawal.artisan_id]
      );
      
      // Notifier l'artisan
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'withdrawal_approved', 'Retrait effectué', 
                 'Votre demande de retrait de ' || $2 || ' FCFA a été traitée.')`,
        [withdrawal.artisan_user_id, withdrawal.amount]
      );
    } else {
      // Rejeter
      await client.query(
        `UPDATE withdrawal_requests 
         SET status = 'rejected', processed_by = $1, processed_at = NOW(), rejection_reason = $2
         WHERE id = $3`,
        [adminId, rejectionReason, req.params.id]
      );
      
      // Notifier l'artisan
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'system', 'Retrait refusé', $2)`,
        [withdrawal.artisan_user_id, `Votre demande de retrait a été refusée: ${rejectionReason}`]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: approved ? 'Retrait approuvé' : 'Retrait refusé' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur process withdrawal:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/disputes
 * Liste des litiges
 */
router.get('/disputes', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT d.*, 
             m.reference as mission_reference,
             m.artisan_declared_amount,
             m.client_declared_amount,
             sr.title as request_title,
             a.first_name as artisan_first_name,
             a.last_name as artisan_last_name,
             a.rating as artisan_rating,
             c.first_name as client_first_name,
             c.last_name as client_last_name
      FROM disputes d
      JOIN missions m ON d.mission_id = m.id
      JOIN service_requests sr ON m.request_id = sr.id
      JOIN artisans a ON m.artisan_id = a.id
      JOIN clients c ON sr.client_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND d.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const result = await db.query(query, params);
    
    // Ajouter aussi les artisans avec note basse
    const lowRatingResult = await db.query(`
      SELECT a.id, a.first_name, a.last_name, a.rating, u.phone,
             (SELECT COUNT(*) FROM reviews WHERE artisan_id = a.id AND rating < 3) as bad_reviews
      FROM artisans a
      JOIN users u ON a.user_id = u.id
      WHERE a.rating < 3
      ORDER BY a.rating ASC
    `);
    
    res.json({
      disputes: result.rows,
      lowRatingArtisans: lowRatingResult.rows
    });
  } catch (error) {
    console.error('Erreur disputes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/finances
 * Données financières
 */
router.get('/finances', async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year
    
    let interval;
    switch (period) {
      case 'day': interval = '1 day'; break;
      case 'week': interval = '7 days'; break;
      case 'month': interval = '30 days'; break;
      case 'year': interval = '365 days'; break;
      default: interval = '30 days';
    }
    
    // Revenus totaux
    const revenueResult = await db.query(`
      SELECT 
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(final_amount), 0) as total_transactions,
        COUNT(*) as total_missions
      FROM missions
      WHERE status = 'completed'
        AND completed_at >= NOW() - INTERVAL '${interval}'
    `);
    
    // Dépôts
    const depositsResult = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_deposits,
        COUNT(*) as deposit_count
      FROM deposits
      WHERE status = 'completed'
        AND completed_at >= NOW() - INTERVAL '${interval}'
    `);
    
    // Retraits
    const withdrawalsResult = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_withdrawals,
        COUNT(*) as withdrawal_count
      FROM withdrawal_requests
      WHERE status = 'completed'
        AND processed_at >= NOW() - INTERVAL '${interval}'
    `);
    
    // Évolution par jour
    const dailyResult = await db.query(`
      SELECT 
        DATE(completed_at) as date,
        COALESCE(SUM(commission_amount), 0) as commission,
        COUNT(*) as missions
      FROM missions
      WHERE status = 'completed'
        AND completed_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(completed_at)
      ORDER BY date
    `);
    
    res.json({
      summary: {
        ...revenueResult.rows[0],
        ...depositsResult.rows[0],
        ...withdrawalsResult.rows[0]
      },
      daily: dailyResult.rows
    });
  } catch (error) {
    console.error('Erreur finances:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/artisans/locations
 * Positions des artisans en ligne
 */
router.get('/artisans/locations', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.id, a.first_name, a.last_name, 
             a.current_latitude as lat, a.current_longitude as lng,
             a.rating, a.is_online,
             ARRAY_AGG(DISTINCT sc.name_fr) as categories
      FROM artisans a
      LEFT JOIN artisan_categories ac ON a.id = ac.artisan_id
      LEFT JOIN service_categories sc ON ac.category_id = sc.id
      WHERE a.current_latitude IS NOT NULL 
        AND a.current_longitude IS NOT NULL
        AND a.is_online = TRUE
      GROUP BY a.id
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur locations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/notifications
 * Notifications admin
 */
router.get('/notifications', async (req, res) => {
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

module.exports = router;
