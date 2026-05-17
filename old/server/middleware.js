// ============================================================
// server/middleware.js
// Custom middleware for json-server.
// Adds CORS headers so the HTML pages (opened via file:// or
// a local dev server) can talk to json-server on port 3000.
// ============================================================

module.exports = (req, res, next) => {
  // Allow requests from any origin (dev only)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};
