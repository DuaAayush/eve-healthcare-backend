const express = require('express');
const { signup, login } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Aayush" }
 *               email: { type: string, example: "aayush@example.com" }
 *               password: { type: string, example: "hunter22" }
 *     responses:
 *       201: { description: User created, JWT returned }
 *       409: { description: Email already registered }
 */
router.post('/signup', validate(signupSchema), signup);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, JWT returned }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate(loginSchema), login);

module.exports = router;
