const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');

// Modular Fee Routes
router.get('/', feeController.getAll);
router.post('/', feeController.create);
router.put('/:id', feeController.update);
router.delete('/:id', feeController.delete);
router.post('/re-apply', feeController.reApplyAll);

module.exports = router;
