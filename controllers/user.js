const connection = require("../utils/database");

// Get Recent Users
exports.getRecentUsers = async (req, res) => {
  try {
    const query = `
      SELECT name, email 
      FROM users
      ORDER BY createdAt DESC 
      LIMIT 5;
    `;
    
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching recent users:', err);
        return res.status(500).json({ message: "Server error" });
      }
      res.json(results);
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get User Profile
exports.getUserProfile = (req, res) => {
  const name = req.user;
  const query = `
    SELECT name, email, lastname, mobile, gender, dob, isEmailVerified, isMobileVerified 
    FROM users 
    WHERE id = ?;
  `;

  connection.query(query, [name], (err, results) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(results[0]);
  });
};


// Edit User Profile
exports.editUserProfile = async (req, res) => {
  try {
    let { name, lastname, mobile, dob, gender, email } = req.body;

    const query = `
      UPDATE users 
      SET name = ?, lastname = ?, mobile = ?, dob = ?, gender = ?, email = ? 
      WHERE id = ?;
    `;
    
    connection.query(query, [name, lastname, mobile, dob, gender, email, req.user], (err, result) => {
      if (err) {
        console.error('Error updating user profile:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      res.status(200).json({ message: "Profile updated successfully" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// My Bookings
exports.myBookings = async (req, res) => {
  try {
    const userId = req.user;
    const query = `
      SELECT 
        u.id AS user_id, u.name AS user_name, u.email AS user_email,
        b.id AS booking_id, b.departure_date, b.arrival_date, b.status,
        t.name AS train_name, fs.name AS from_station, ts.name AS to_station,
        r.departure_time AS departure_time, r.arrival_time AS arrival_time
      FROM 
        users u
        JOIN Bookings b ON u.id = b.UserId
        JOIN Trains t ON b.TrainId = t.id
        JOIN Stations fs ON b.from_station_id = fs.id
        JOIN Stations ts ON b.to_station_id = ts.id
        JOIN Routes r ON t.id = r.StationId
      WHERE 
        u.id = ?;
    `;
    
    connection.query(query, [userId], (err, bookings) => {
      if (err) {
        console.error('Error fetching booking details:', err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(200).json({ bookings });
    });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add Traveller
exports.addTraveller = async (req, res) => {
  try {
    const { firstname, lastname, mobile, dob } = req.body;    
    const userId = req.user;

    if (!firstname || !lastname || !mobile || !userId) {
      return res.status(400).json({ message: "Please provide all required fields: firstname, lastname, mobile, userId" });
    }

    const query = `
      INSERT INTO travellers (firstname, lastname, mobile, dob, user_id) 
      VALUES (?, ?, ?, ?, ?);
    `;
    
    connection.query(query, [firstname, lastname, mobile, dob, userId], (err, results) => {
      if (err) {
        console.error('Error adding traveller:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
      }

      res.status(200).json({ message: 'Traveller added successfully' });
    });
  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get Travellers
exports.getTravelers = async (req, res) => {
  try {
    const userId = req.user;

    const query = `
      SELECT *
      FROM travellers 
      WHERE user_id = ?;
    `;

    connection.query(query, [userId], (err, travelers) => {
      if (err) {
        console.error('Error fetching travelers:', err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      res.status(200).json(travelers);
    });
  } catch (error) {
    console.error("Error fetching travelers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove Traveller
exports.removeTraveller = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;

    if (!id || !userId) {
      return res.status(400).json({ message: "Please provide a valid traveller id and user id" });
    }

    const query = `
      DELETE FROM travellers 
      WHERE id = ? AND user_id = ?;
    `;

    connection.query(query, [id, userId], (err, result) => {
      if (err) {
        console.error('Error removing traveler:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      res.status(200).json({ message: "Traveller removed successfully" });
    });
  } catch (error) {
    console.error("Error removing traveler:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};