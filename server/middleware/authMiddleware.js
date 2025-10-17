const { supabaseAnon, supabaseAdmin } = require('../config/supabaseAdmin');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    // Verify token using anon client
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid token');
    }

    // Fetch user role from database
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('role, user_id, email, first_name, last_name')
      .eq('auth_user_id', user.id)
      .single();

    if (dbError || !userData) {
      throw new Error('User not found in database');
    }

    // Attach user info to req
    req.user = {
      user_id: userData.user_id,
      email: user.email,
      ...userData,
    };

    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
