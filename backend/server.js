const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fetch = require('node-fetch');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
}));
app.use(helmet());
app.use(express.static(path.join(__dirname, '..', 'public')));

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mysql_database',
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.stack);
    process.exit(1);
  }
  console.log('✅ Database connected successfully.');
});

// Admin login verification endpoint
app.post('/verify-admin', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }
  if (password === ADMIN_SECRET) {
    return res.json({ success: true, message: 'Admin login successful' });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid admin password' });
  }
});

// Middleware to check admin authorization
function checkAdminAuth(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey) {
    return res.status(401).json({ error: 'Admin key is missing' });
  }
  if (adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized access: Invalid admin key' });
  }
  next();
}

// Admin fetch orders with authorization header
app.get('/api/orders', checkAdminAuth, (req, res) => {
  const query = 'SELECT * FROM orders ORDER BY created_at DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error fetching orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ orders: results });
  });
});

// Save new order endpoint
app.post('/api/save-order', (req, res) => {
  const { name, address, age, symptoms, medicine } = req.body;

  if (!name || !address || !age || !symptoms || !medicine) {
    return res.status(400).json({ error: 'All fields (name, address, age, symptoms, medicine) are required.' });
  }
  if (isNaN(Number(age))) {
    return res.status(400).json({ error: 'Age must be a valid number.' });
  }

  const query = 'INSERT INTO orders (name, address, age, symptoms, medicine) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [name, address, age, symptoms, medicine], (err, result) => {
    if (err) {
      console.error('❌ Error inserting order:', err);
      return res.status(500).json({ error: 'Failed to save order' });
    }
    res.status(201).json({ message: '✅ Order saved', id: result.insertId });
  });
});

// Get medicines by symptom (query param)
app.get('/api/medicines', (req, res) => {
  const symptom = req.query.symptoms || req.query.symptom;
  if (!symptom) {
    return res.status(400).json({ error: "Symptom query parameter is required" });
  }

  db.query(
    'SELECT medicine, home_remedy FROM medicines WHERE symptom LIKE ?',
    [`%${symptom}%`],
    (err, results) => {
      if (err) {
        console.error('❌ Error fetching medicines:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!results.length) {
        return res.status(404).json({ message: 'No medicines found for this symptom.' });
      }
      res.status(200).json(results);
    }
  );
});

// Get all medicines
app.get('/medicines', (req, res) => {
  db.query(
    'SELECT id, language, symptom, medicine AS name, home_remedy FROM medicines',
    (err, results) => {
      if (err) {
        console.error('❌ Error fetching medicines:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.status(200).json(results);
    }
  );
});

// Get medicines by symptom from path param
app.get('/medicines/:symptom', (req, res) => {
  const symptom = req.params.symptom;
  db.query(
    'SELECT medicine AS name, home_remedy FROM medicines WHERE symptom LIKE ?',
    [`%${symptom}%`],
    (err, results) => {
      if (err) {
        console.error('❌ Error fetching medicine by symptom:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!results.length) {
        return res.status(404).json({ message: 'No medicines found for this symptom.' });
      }
      res.status(200).json(results);
    }
  );
});

// Add a new medicine entry
app.post('/medicines', (req, res) => {
  const { language, symptom, medicine, home_remedy } = req.body;

  if (!language || !symptom || !medicine) {
    return res.status(400).json({ error: 'Language, symptom, and medicine are required.' });
  }

  db.query(
    'INSERT INTO medicines (language, symptom, medicine, home_remedy) VALUES (?, ?, ?, ?)',
    [language, symptom, medicine, home_remedy],
    (err, results) => {
      if (err) {
        console.error('❌ Error adding medicine:', err);
        return res.status(500).json({ error: 'Failed to add medicine.' });
      }
      res.status(201).json({ message: '✅ Medicine added', id: results.insertId });
    }
  );
});

// Reverse geocoding using OpenStreetMap Nominatim API
app.get('/api/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    const osmResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: { 'User-Agent': 'RuralHealthcareApp/1.0 (varshitha.bhairam@example.com)' }
      }
    );

    if (!osmResponse.ok) {
      throw new Error(`OpenStreetMap API error: ${osmResponse.status} ${osmResponse.statusText}`);
    }

    const data = await osmResponse.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('❌ Reverse geocode error:', err.message, err.stack);
    res.status(500).json({ error: 'Reverse geocoding failed', details: err.message });
  }
});

// Serve SPA frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
