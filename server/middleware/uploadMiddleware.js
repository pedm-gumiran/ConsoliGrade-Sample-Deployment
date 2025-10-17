// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Upload folder
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter (optional)
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
