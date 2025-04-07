const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get the user ID from the token
    const userId = decoded._id || decoded.userId;
    
    if (!userId) {
      throw new Error('Invalid token: No user ID found');
    }
    
    // Set both userId and id for better compatibility with different code styles
    req.user = {
      userId: userId,
      id: userId,  // Add this for compatibility
      username: decoded.username,
      isAdmin: Boolean(decoded.isAdmin)  // Ensure boolean conversion
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth; 