const express = require('express');
const { autoDocs } = require('../src/autoDocs');

const app = express();
const PORT = 3000;

// IMPORTANT: Body parsing middleware must come BEFORE autoDocs
// so that req.body and req.query are available when the middleware runs
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for query parameter parsing

// Create the autoDocs middleware instance
const docsMiddleware = autoDocs();

// Apply the middleware to track all requests
app.use(docsMiddleware);

// Register the /docs endpoint using the built-in handler
app.get(docsMiddleware.docsPath, docsMiddleware.docsHandler);

// Sample routes for demonstration
app.get('/users', (req, res) => {
  res.json({ message: 'Get all users', query: req.query });
});

app.post('/users', (req, res) => {
  res.json({ message: 'Create a user', data: req.body });
});

app.get('/users/:id', (req, res) => {
  res.json({ message: `Get user ${req.params.id}` });
});

app.put('/users/:id', (req, res) => {
  res.json({ message: `Update user ${req.params.id}`, data: req.body });
});

app.delete('/users/:id', (req, res) => {
  res.json({ message: `Delete user ${req.params.id}` });
});

app.get('/products', (req, res) => {
  res.json({ message: 'Get all products' });
});

app.post('/products', (req, res) => {
  res.json({ message: 'Create a product', data: req.body });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Docs available at http://localhost:${PORT}${docsMiddleware.docsPath}`);
  console.log('\nTry these commands to test:');
  console.log('  curl http://localhost:3000/users');
  console.log('  curl "http://localhost:3000/users?page=1&limit=10&sort=name"');
  console.log('  curl "http://localhost:3000/users?search=john&active=true"');
  console.log('  curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d \'{"name":"Manan","age":28,"skills":["Software engineering"]}\'');
  console.log('  curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d \'{"name":"John","email":"john@example.com","age":25}\'');
  console.log('  curl http://localhost:3000/users/123');
  console.log('  curl http://localhost:3000/docs');
});

module.exports = app;
