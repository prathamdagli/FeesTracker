const express = require('express');
const router = express.Router();
const multer = require('multer');
const smartUpdateController = require('../controllers/smartUpdateController');

const upload = multer({ storage: multer.memoryStorage() });

// Debug: returns raw headers and first 3 rows from your Excel file
router.post('/debug', upload.single('file'), smartUpdateController.debug);

// Preview changes vs Firestore
router.post('/preview', upload.single('file'), smartUpdateController.preview);

// Commit to Firestore
router.post('/commit', smartUpdateController.commit);

module.exports = router;
