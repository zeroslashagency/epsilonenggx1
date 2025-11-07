const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 SECURITY: Restrict CORS to your domain only
app.use((req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Serve static files from src directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// Root route - serve the final HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'pages', 'index-final.html'));
});

// Auth route removed - now handled by Next.js React routing at /auth

// Index-final route - serve the main application HTML file
app.get('/index-final.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'pages', 'index-final.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'src')}`);
});
