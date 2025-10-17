const express = require('express');
const {
  uploadGrades,
  getUploaded_Grades,
  deleteGrades,
  deleteConsolidatedGrades,
} = require('../controllers/gradesController');

const router = express.Router();

// ---------- Upload Grades ----------
router.post('/upload', uploadGrades);

// ---------- Get Grades ----------
router.get('/', getUploaded_Grades);

// ---------- Delete Grades ----------
router.delete('/delete_grades', deleteGrades);

// ---------- Delete Consolidated Grades ----------
router.delete('/delete_consolidated_grades', deleteConsolidatedGrades);

module.exports = router;
 