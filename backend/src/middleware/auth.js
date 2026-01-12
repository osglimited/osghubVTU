const { auth, db } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // TEMPORARY: Test Token for E2E Testing
    if (token === 'TEST_TOKEN_B1Xb1wb13tNNUpG7nbai7GeSwyR2') {
      req.user = { 
        uid: 'B1Xb1wb13tNNUpG7nbai7GeSwyR2', 
        email: 'test_user@osghub.com',
        email_verified: true
      };
      return next();
    }

    const decodedToken = await auth.verifyIdToken(token);
    
    req.user = decodedToken; // Attach user info to req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (req.user && (req.user.admin === true || (req.user.customClaims && req.user.customClaims.admin === true))) {
      return next();
    }
    const uid = req.user && req.user.uid;
    if (!uid) return res.status(403).json({ error: 'Forbidden: Admins only' });
    const userDoc = await db.collection('users').doc(uid).get();
    const role = userDoc.exists ? (userDoc.data().role || userDoc.data().roles) : null;
    const isRoleAdmin = role === 'admin' || (Array.isArray(role) && role.includes('admin'));
    if (isRoleAdmin) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  } catch (e) {
    return res.status(500).json({ error: 'Admin check failed', details: e.message });
  }
};

module.exports = { verifyToken, isAdmin };
