const { auth } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    const decodedToken = await auth.verifyIdToken(token);
    
    req.user = decodedToken; // Attach user info to request
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

const isAdmin = async (req, res, next) => {
    if (req.user && req.user.admin === true) {
        next();
    } else {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
};

module.exports = { verifyToken, isAdmin };
