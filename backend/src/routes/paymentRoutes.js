const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Modular Payment Routes
router.get('/', paymentController.getAll);
router.post('/record', paymentController.record);
router.get('/student/:id', paymentController.getByStudent);
router.delete('/:id', paymentController.remove);

module.exports = router;
