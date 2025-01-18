const express = require('express');
const app = express();
require('dotenv').config();

// Middleware
app.use(express.json());

// Base route
app.get('/', (req, res) => {
  res.send('URL Shortener API is running!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
