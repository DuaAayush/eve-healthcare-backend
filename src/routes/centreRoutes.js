const express = require('express');
const {
  createCentre,
  listCentres,
  getCentre,
  addTestToCentre,
  listTestsForCentre,
} = require('../controllers/centreController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCentreSchema, createTestSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * @openapi
 * /centres:
 *   post:
 *     tags: [Centres]
 *     summary: Register a diagnostic centre
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, location]
 *             properties:
 *               name: { type: string, example: "Apollo Diagnostics" }
 *               location: { type: string, example: "Koramangala, Bangalore" }
 *     responses:
 *       201: { description: Centre created }
 *   get:
 *     tags: [Centres]
 *     summary: List diagnostic centres (with their tests)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated list of centres }
 */
router.post('/', authenticate, validate(createCentreSchema), createCentre);
router.get('/', listCentres);

/**
 * @openapi
 * /centres/{id}:
 *   get:
 *     tags: [Centres]
 *     summary: Get a single diagnostic centre by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Centre found }
 *       404: { description: Centre not found }
 */
router.get('/:id', getCentre);

/**
 * @openapi
 * /centres/{id}/tests:
 *   post:
 *     tags: [Tests]
 *     summary: Add a diagnostic test to a centre
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name: { type: string, example: "Complete Blood Count (CBC)" }
 *               price: { type: number, example: 499 }
 *     responses:
 *       201: { description: Test added }
 *       404: { description: Centre not found }
 *   get:
 *     tags: [Tests]
 *     summary: List tests offered by a centre
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of tests }
 *       404: { description: Centre not found }
 */
router.post('/:id/tests', authenticate, validate(createTestSchema), addTestToCentre);
router.get('/:id/tests', listTestsForCentre);

module.exports = router;
