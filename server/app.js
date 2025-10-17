const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/authMiddleware');
const userRoutes = require('./routes/userRoutes.js');
const backupRestoreRoutes = require('./routes/backupRestoreRoutes.js');
const auditRoutes = require('./routes/auditRoutes.js');
const gradesRoutes = require('./routes/gradesRoutes.js');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('dev'));

// Routes (protected)
app.use('/api/users', authenticate, userRoutes);
app.use('/api/backup_restore', authenticate, backupRestoreRoutes);
app.use('/api/audits', authenticate, auditRoutes);
app.use('/api/grades', authenticate, gradesRoutes);

app.get('/', (req, res) => res.send('Server is Ready!'));

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
