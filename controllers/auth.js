require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const connection = require('../utils/database');

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
      // Check if the user already exists
      connection.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
          if (err) {
              console.error('Database query error:', err);
              return res.status(500).json({ message: 'Server error' });
          }

          if (results.length > 0) {
              return res.status(400).json({ message: 'User already exists' });
          }

          // Hash the password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);

          // Insert new user into the database
          const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
          connection.query(query, [name, email, hashedPassword], (insertErr, insertResults) => {
              if (insertErr) {
                  console.error('Database insert error:', insertErr);
                  return res.status(500).json({ message: 'Server error' });
              }

              const newUserId = insertResults.insertId;

           
              const token = jwt.sign({ id: newUserId }, process.env.SECRET, { expiresIn: '1h' });

        
              res.status(201).json({
                  token,
                  user: { id: newUserId, name, email },
                  expiresIn: 3600
              });
          });
      });
  } catch (err) {
      console.error('Error during signup:', err);
      res.status(500).json({ message: 'Server error' });
  }
};

// Login Controller
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
      connection.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
          if (error) {
              return res.status(500).json({ message: 'Database query error' });
          }

          if (results.length === 0) {
              return res.status(404).json({ message: 'User not found' });
          }

          const user = results[0]; 

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
              return res.status(400).json({ message: 'Invalid credentials' });
          }


          const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '1h' });

          res.json({
              token,
              user: { id: user.id, name: user.name, email: user.email },
              expiresIn: 3600
          });
      });
  } catch (err) {
      res.status(500).json({ message: 'Server error' });
  }
};

const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

// Google Auth Controller
exports.googleAuth = async (req, res) => {
    const { token } = req.body;
    console.log('Token received:', token);
  
    try {
        // Fetch user info from Google using the access token
        const response = await axios.get(USER_INFO_URL, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const userInfo = response.data;
        console.log('User info:', userInfo);

        // Handle the user info as needed
        // For example, send it back to the client
        res.status(200).json({ user: userInfo });
        
    } catch (error) {
        console.error('Failed to fetch user info:', error.response?.data || error.message);
        res.status(error.response?.status || 401).json({ message: 'Failed to fetch user info', details: error.response?.data });
    }
};



exports.deleteUser = async (req, res) => {
  const userId = req.user; // Assuming `req.user` contains the authenticated user ID
  const { password } = req.body;

  try {
      // Fetch user from the database by userId
      connection.query('SELECT * FROM users WHERE id = ?', [userId], async (err, results) => {
          if (err) {
              console.error('Database query error:', err);
              return res.status(500).json({ message: 'Server error' });
          }

          if (results.length === 0) {
              return res.status(404).json({ message: 'User not found' });
          }

          const user = results[0];

          // Compare provided password with the hashed password in the database
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
              return res.status(401).json({ message: 'Invalid password' });
          }

          // Delete the user account
          connection.query('DELETE FROM users WHERE id = ?', [userId], (deleteErr) => {
              if (deleteErr) {
                  console.error('Database delete error:', deleteErr);
                  return res.status(500).json({ message: 'Server error' });
              }

              res.status(200).json({ message: 'Account successfully deleted' });
          });
      });
  } catch (error) {
      console.error('Error during account deletion:', error);
      res.status(500).json({ message: 'Server error' });
  }
};
