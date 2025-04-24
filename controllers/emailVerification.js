require('dotenv').config();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../utils/database'); // Assuming you have a DB connection setup
const { generateAccessToken, generateRefreshToken } = require('./genTokens');

const otpStorage = {}; // In-memory storage for OTPs

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP to user's email
exports.sendEmailOtp = (req, res) => {
  const { email } = req.body;
  console.log("Email from request =>", email);

  if (!email) return res.status(400).send("Email is required");

  // Generate a 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Set OTP expiration time
  const expirationTime = Date.now() + process.env.OTP_EXPIRATION_MINUTES * 60000;
  otpStorage[email] = { otp, expirationTime };

  // Mail options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in ${process.env.OTP_EXPIRATION_MINUTES} minutes.`,
  };

  transporter.sendMail(mailOptions, (mailErr, info) => {
    if (mailErr) {
      console.error("Error sending email:", mailErr);
      return res.status(500).send({ "error" : "Error sending email: " + mailErr.message });
    }
    res.status(200).send({ "success" : "OTP sent to your email"});
  });
};

exports.verifyEmailOtp = (req, res) => {
  
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).send("Email and OTP are required");
  const storedOtpData = otpStorage[email];

  if (!storedOtpData) {
    return res.status(400).send("OTP not found or expired");
  }

  // Check if OTP is expired
  if (Date.now() > storedOtpData.expirationTime) {
    delete otpStorage[email];
    return res.status(400).send("OTP expired");
  }

  // Check if OTP matches
  if (storedOtpData.otp !== otp) {
    return res.status(400).send("Invalid OTP");
  }

  // OTP is valid, remove it
  delete otpStorage[email];

  // Insert user into DB (or ignore if exists)
  const insertUserQuery = `
    INSERT INTO users (email, isEmailVerified)
    VALUES (?,  1)
    ON DUPLICATE KEY UPDATE isEmailVerified = 1
  `;

  db.query(insertUserQuery, [email], (err, result) => {
    if (err) {
      console.error("Error inserting user:", err);
      return res.status(500).send("Error processing user record");
    }

    // Get user ID
    db.query("SELECT user_id, email, firstName FROM users WHERE email = ?", [email], (err2, userResults) => {
      if (err2 || !userResults.length) {
        console.error("Error fetching user ID:", err2);
        return res.status(500).send("Error retrieving user");
      }

      console.log("User ID:", userResults[0].firstName);
      
      const user = { id: userResults[0].user_id, email : userResults[0].email, firstName : userResults[0].firstName };

      // Generate tokens
      const accessToken = generateAccessToken(user);
      // const refreshToken = generateRefreshToken(user);
      console.log("Access Token:", accessToken);
      console.log("user from 99 email, ", user);
      

      res.status(200).json({
        email,
        firstName: user.firstName,
        token: accessToken,
      });
      
      // Store refresh token in DB
      // db.query("UPDATE users SET refresh_token = ? WHERE user_id = ?", [refreshToken, user.id], (err3) => {
      //   if (err3) {
      //     console.error("Error saving refresh token:", err3);
      //     return res.status(500).send("Error saving refresh token");
      //   }

      //   // Respond with token
      //   res.status(200).json({
      //     user: email,
      //     token: accessToken,
      //   });
      // });
    });
  });
};


// exports.sendEmailOtp = (req, res) => {
//   const { email } = req.body;
//   console.log("email from 20 ==>", email);
  

//   if (!email) return res.status(400).send('Email is required');

//   // Check if the email is already verified
//   db.query('SELECT isEmailVerified FROM users WHERE email = ?', [email], (err, results) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).send('Error checking email verification');
//     }

//     const user = results[0];
//     if (user && user.isEmailVerified === 1) {
//       return res.status(400).send('This email is already verified.');
//     }

//     // Generate a 6-digit OTP
//     const otp = crypto.randomInt(100000, 999999).toString();

//     // Set OTP expiration time
//     const expirationTime = Date.now() + process.env.OTP_EXPIRATION_MINUTES * 60000;
//     otpStorage[email] = { otp, expirationTime };

//     // Mail options
//     const mailOptions = {
//       from: process.env.GMAIL_USER,
//       to: email,
//       subject: 'Your OTP Code',
//       text: `Your OTP code is ${otp}. It will expire in ${process.env.OTP_EXPIRATION_MINUTES} minutes.`,
//     };

//     transporter.sendMail(mailOptions, (mailErr, info) => {
//       if (mailErr) {
//         console.error(mailErr);
//         return res.status(500).send('Error sending email');
//       }
//       res.status(200).send('OTP sent to your email');
//     });
//   });
// };

// Verify OTP

// exports.verifyEmailOtp = (req, res) => {
//   const { email, otp } = req.body;

//   if (!email || !otp) return res.status(400).send('Email and OTP are required');

//   const storedOtpData = otpStorage[email];

//   if (!storedOtpData) {
//     return res.status(400).send('OTP not found or expired');
//   }

//   // Check if the OTP is expired
//   if (Date.now() > storedOtpData.expirationTime) {
//     delete otpStorage[email]; // Remove expired OTP
//     return res.status(400).send('OTP expired');
//   }

//   // Check if OTP matches
//   if (storedOtpData.otp === otp) {
//     // Clear OTP after successful verification
//     delete otpStorage[email];

//     // Update the isEmailVerified field to 1 in the database
//     db.query('UPDATE users SET isEmailVerified = 1 WHERE email = ?', [email], (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).send('Error updating email verification status');
//       }
//       res.status(200).send('OTP verified successfully and email is now verified');
//     });
//   } else {
//     res.status(400).send('Invalid OTP');
//   }
// };
