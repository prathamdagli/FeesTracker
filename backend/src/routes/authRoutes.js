const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Modular Auth Routes
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;
