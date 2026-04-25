/**
 * Routes pour les catégories de services
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');

/**
 * GET /api/categories
 * Liste des catégories de services (public)
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM service_categories 
       WHERE is_active = TRUE 
       ORDER BY display_order, name_fr`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur categories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/categories/:id
 * Détails d'une catégorie avec sous-catégories et éléments
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Catégorie
    const categoryResult = await db.query(
      'SELECT * FROM service_categories WHERE id = $1',
      [id]
    );
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }
    
    const category = categoryResult.rows[0];
    
    // Sous-catégories
    const subcategoriesResult = await db.query(
      'SELECT * FROM service_subcategories WHERE category_id = $1 AND is_active = TRUE',
      [id]
    );
    
    // Éléments
    const itemsResult = await db.query(
      'SELECT * FROM service_items WHERE category_id = $1 AND is_active = TRUE',
      [id]
    );
    
    res.json({
      ...category,
      subcategories: subcategoriesResult.rows,
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Erreur category details:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/categories/:id/subcategories
 * Sous-catégories d'une catégorie
 */
router.get('/:id/subcategories', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM service_subcategories WHERE category_id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur subcategories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/categories/:id/items
 * Éléments d'une catégorie
 */
router.get('/:id/items', async (req, res) => {
  try {
    const { subcategoryId } = req.query;
    
    let query = 'SELECT * FROM service_items WHERE category_id = $1 AND is_active = TRUE';
    const params = [req.params.id];
    
    if (subcategoryId) {
      query += ' AND subcategory_id = $2';
      params.push(subcategoryId);
    }
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur items:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================
// ROUTES ADMIN
// ================================

/**
 * POST /api/categories
 * Créer une catégorie (Admin)
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, nameFr, icon, color, description } = req.body;
    
    const result = await db.query(
      `INSERT INTO service_categories (name, name_fr, icon, color, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, nameFr, icon, color, description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur create category:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/categories/:id
 * Modifier une catégorie (Admin)
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { nameFr, icon, color, description, isActive, displayOrder } = req.body;
    
    const result = await db.query(
      `UPDATE service_categories 
       SET name_fr = COALESCE($1, name_fr),
           icon = COALESCE($2, icon),
           color = COALESCE($3, color),
           description = COALESCE($4, description),
           is_active = COALESCE($5, is_active),
           display_order = COALESCE($6, display_order),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [nameFr, icon, color, description, isActive, displayOrder, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur update category:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/categories/:id
 * Supprimer une catégorie (Admin)
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // Soft delete - désactiver seulement
    await db.query(
      'UPDATE service_categories SET is_active = FALSE WHERE id = $1',
      [req.params.id]
    );
    
    res.json({ success: true, message: 'Catégorie désactivée' });
  } catch (error) {
    console.error('Erreur delete category:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
