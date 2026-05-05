const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Modular Student Routes
router.get('/', studentController.getAll);
router.post('/', studentController.create);
router.put('/:id', studentController.update);
router.delete('/:id', studentController.delete);
router.post('/normalize-schools', studentController.normalizeSchools);

module.exports = router;
