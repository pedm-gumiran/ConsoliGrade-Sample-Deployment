const express = require('express');
const { getAudits, deleteAudits } = require('../controllers/auditController');

const router = express.Router();

// Get all audits
router.get('/', getAudits);

// Delete audits
router.delete('/:id', deleteAudits);

module.exports = router;
