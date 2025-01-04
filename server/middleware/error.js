const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  res.status(500).json({ error: 'Something went wrong!' });
};

module.exports = errorHandler; 