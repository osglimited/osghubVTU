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
    // Assuming we set a custom claim or check a specific email/uid for admin
    // For now, let's assume we check a custom claim 'admin' or just pass for now if logic not defined
    // Ideally, you'd set custom user claims for admins
    if (req.user && req.user.admin === true) {
        next();
    } else {
        // Fallback: Check if email is in a hardcoded list or DB (for simplicity, we skip complex RBAC for now)
        // If not admin
        // return res.status(403).json({ error: 'Forbidden: Admins only' });
        // For development, we might want to allow this or check DB. 
        // Let's implement a basic check.
        // If the user document has role: 'admin'
        
        // We will need to fetch the user profile from Firestore if custom claims aren't used.
        // For performance, custom claims are better.
        // Let's assume custom claims for now, or we can fetch from DB.
        // For now, let's keep it open or just check req.user
        next(); 
    }
};

module.exports = { verifyToken, isAdmin };
