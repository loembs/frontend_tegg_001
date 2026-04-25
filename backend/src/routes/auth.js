/**
 * Routes d'authentification
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { generateToken, authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/send-otp
 * Envoyer un code OTP par SMS
 */
router.post('/send-otp', [
  body('phone').matches(/^\+221[0-9]{9}$/).withMessage('Numéro de téléphone invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { phone } = req.body;
    
    // Générer un code OTP à 4 chiffres
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Supprimer les anciens codes pour ce numéro
    await db.query(
      'DELETE FROM otp_codes WHERE phone = $1 AND used = FALSE',
      [phone]
    );
    
    // Insérer le nouveau code
    await db.query(
      'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAt]
    );
    
    // TODO: Intégrer avec Twilio/SMS API pour envoyer le code
    // En développement, on affiche le code dans la console
    console.log(`📱 OTP pour ${phone}: ${code}`);
    
    res.json({
      success: true,
      message: 'Code OTP envoyé',
      // En dev seulement
      ...(process.env.NODE_ENV === 'development' && { code })
    });
  } catch (error) {
    console.error('Erreur send-otp:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Vérifier un code OTP
 */
router.post('/verify-otp', [
  body('phone').matches(/^\+221[0-9]{9}$/).withMessage('Numéro invalide'),
  body('code').isLength({ min: 4, max: 4 }).withMessage('Code invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { phone, code } = req.body;
    
    // Vérifier le code (ou accepter "1234" en dev)
    const result = await db.query(
      `SELECT * FROM otp_codes 
       WHERE phone = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code]
    );
    
    // En dev, accepter "1234"
    const isValidCode = result.rows.length > 0 || 
      (process.env.NODE_ENV === 'development' && code === '1234');
    
    if (!isValidCode) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }
    
    // Marquer le code comme utilisé
    if (result.rows.length > 0) {
      await db.query(
        'UPDATE otp_codes SET used = TRUE WHERE id = $1',
        [result.rows[0].id]
      );
    }
    
    res.json({ success: true, message: 'Code vérifié' });
  } catch (error) {
    console.error('Erreur verify-otp:', error);
    res.status(500).json({ error: 'Erreur de vérification' });
  }
});

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', [
  body('phone').matches(/^\+221[0-9]{9}$/).withMessage('Numéro invalide'),
  body('password').isLength({ min: 4 }).withMessage('Mot de passe trop court'),
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis'),
  body('userType').isIn(['client', 'artisan']).withMessage('Type invalide')
], async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { phone, password, firstName, lastName, userType, categoryId } = req.body;
    
    // Vérifier si le numéro existe déjà
    const existing = await client.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ce numéro est déjà utilisé' });
    }
    
    await client.query('BEGIN');
    
    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Créer l'utilisateur
    const userResult = await client.query(
      `INSERT INTO users (phone, phone_verified, password_hash, user_type, status)
       VALUES ($1, TRUE, $2, $3, $4)
       RETURNING id`,
      [phone, passwordHash, userType, userType === 'client' ? 'active' : 'pending']
    );
    
    const userId = userResult.rows[0].id;
    
    let profile;
    
    if (userType === 'client') {
      // Créer le profil client
      const clientResult = await client.query(
        `INSERT INTO clients (user_id, first_name, last_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, firstName, lastName]
      );
      profile = clientResult.rows[0];
    } else {
      // Créer le profil artisan
      const artisanResult = await client.query(
        `INSERT INTO artisans (user_id, first_name, last_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, firstName, lastName]
      );
      profile = artisanResult.rows[0];
      
      // Ajouter la catégorie si fournie
      if (categoryId) {
        await client.query(
          `INSERT INTO artisan_categories (artisan_id, category_id, is_primary)
           VALUES ($1, $2, TRUE)`,
          [profile.id, categoryId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Générer le token
    const token = generateToken(userId, userType);
    
    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      user: {
        id: userId,
        phone,
        userType,
        firstName,
        lastName,
        profileId: profile.id,
        status: userType === 'client' ? 'active' : 'pending'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/login
 * Connexion
 */
router.post('/login', [
  body('phone').matches(/^\+221[0-9]{9}$/).withMessage('Numéro invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { phone, password } = req.body;
    
    // Récupérer l'utilisateur
    const result = await db.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const user = result.rows[0];
    
    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    // Vérifier le statut
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Compte bloqué. Contactez le support.' });
    }
    
    // Récupérer le profil selon le type
    let profile;
    
    if (user.user_type === 'client') {
      const clientResult = await db.query(
        'SELECT * FROM clients WHERE user_id = $1',
        [user.id]
      );
      profile = clientResult.rows[0];
    } else if (user.user_type === 'artisan') {
      const artisanResult = await db.query(
        `SELECT a.*, ARRAY_AGG(sc.name_fr) as categories
         FROM artisans a
         LEFT JOIN artisan_categories ac ON a.id = ac.artisan_id
         LEFT JOIN service_categories sc ON ac.category_id = sc.id
         WHERE a.user_id = $1
         GROUP BY a.id`,
        [user.id]
      );
      profile = artisanResult.rows[0];
    } else if (user.user_type === 'admin') {
      const adminResult = await db.query(
        'SELECT * FROM admins WHERE user_id = $1',
        [user.id]
      );
      profile = adminResult.rows[0];
    }
    
    // Mettre à jour last_login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Générer le token
    const token = generateToken(user.id, user.user_type);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        userType: user.user_type,
        status: user.status,
        ...profile && {
          profileId: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          ...(user.user_type === 'artisan' && {
            balance: parseFloat(profile.balance) || 0,
            rating: parseFloat(profile.rating) || 5,
            isValidated: profile.is_validated,
            categories: profile.categories
          })
        }
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

/**
 * GET /api/auth/me
 * Récupérer le profil de l'utilisateur connecté
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    let profile;
    
    if (req.user.user_type === 'client') {
      const result = await db.query(
        `SELECT c.*, 
         (SELECT COUNT(*) FROM service_requests WHERE client_id = c.id) as total_requests
         FROM clients c WHERE c.user_id = $1`,
        [req.user.id]
      );
      profile = result.rows[0];
    } else if (req.user.user_type === 'artisan') {
      const result = await db.query(
        `SELECT a.*, ARRAY_AGG(DISTINCT sc.name_fr) as categories
         FROM artisans a
         LEFT JOIN artisan_categories ac ON a.id = ac.artisan_id
         LEFT JOIN service_categories sc ON ac.category_id = sc.id
         WHERE a.user_id = $1
         GROUP BY a.id`,
        [req.user.id]
      );
      profile = result.rows[0];
    } else if (req.user.user_type === 'admin') {
      const result = await db.query(
        'SELECT * FROM admins WHERE user_id = $1',
        [req.user.id]
      );
      profile = result.rows[0];
    }
    
    res.json({
      id: req.user.id,
      phone: req.user.phone,
      userType: req.user.user_type,
      status: req.user.status,
      profile
    });
  } catch (error) {
    console.error('Erreur me:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/change-password
 * Changer le mot de passe
 */
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword').isLength({ min: 4 }).withMessage('Nouveau mot de passe trop court')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Récupérer le hash actuel
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    
    // Vérifier le mot de passe actuel
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    
    if (!valid) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }
    
    // Hasher le nouveau mot de passe
    const newHash = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, req.user.id]
    );
    
    res.json({ success: true, message: 'Mot de passe modifié' });
  } catch (error) {
    console.error('Erreur change-password:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
