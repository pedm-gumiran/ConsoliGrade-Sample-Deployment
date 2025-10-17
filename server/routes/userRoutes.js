const express = require('express');
const {
  getUsers,
  addUser,
  deleteUsers,
  editUserController,
  bulkEditUsersController,
} = require('../controllers/userController'); // make sure the path is correct

const router = express.Router();
// ------------Get all Users----------
router.get('/', getUsers);

// ---------- Create User ----------
router.post('/add_user', addUser);

// ---------- Delete Users ----------
router.delete('/delete_users', deleteUsers);

// ---------- Edit Single User ----------
router.put('/edit_user/:user_id', editUserController); // or PATCH if partial update

// ---------- Bulk Edit Users ----------
router.put('/bulk_edit_users', bulkEditUsersController);

module.exports = router;
