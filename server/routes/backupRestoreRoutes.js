const express = require('express');
const {
  createBackup,
  restoreBackup,
  getBackups,
  deleteBackup,
} = require('../controllers/backupRestoreController');

const router = express.Router();

// Get all backups
router.get('/', getBackups);

// Create full database backup
router.post('/backup', createBackup);

// Restore full database
router.post('/restore', restoreBackup);

// Delete backup
router.delete('/:id', deleteBackup);

module.exports = router;
