/**
 * SecureUserService.js
 * A secure implementation of user authentication and data handling
 *
 * @author Security Engineer
 * @version 1.0.0
 */

const crypto = require('crypto');
const { promisify } = require('util');
const escapeHtml = require('escape-html');
const { sanitizeInput, validateEmail } = require('./validators');
const logger = require('./logger');

// Use environment variables for sensitive configuration
const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;

// Secure random token generation
const generateSecureToken = async (size = 32) => {
  const randomBytesAsync = promisify(crypto.randomBytes);
  const buffer = await randomBytesAsync(size);
  return buffer.toString('hex');
};

// Password hashing with proper salt generation and modern algorithm
const hashPassword = async (password) => {
  // Generate a random salt
  const salt = await generateSecureToken(16);

  // Use a modern hashing algorithm with appropriate iterations
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt: salt
      });
    });
  });
};

// Verify password against stored hash
const verifyPassword = async (password, storedHash, storedSalt) => {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, storedSalt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex') === storedHash);
    });
  });
};

// Encrypt sensitive data with proper key management
const encryptData = (text) => {
  if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
    throw new Error('Encryption configuration missing');
  }

  const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(ENCRYPTION_IV, 'hex')
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Decrypt sensitive data
const decryptData = (encryptedText) => {
  if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
    throw new Error('Encryption configuration missing');
  }

  const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(ENCRYPTION_IV, 'hex')
  );

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Secure database query with parameterized queries
const getUserByEmail = async (db, email) => {
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Use parameterized query instead of string concatenation
  const query = 'SELECT * FROM users WHERE email = ?';
  try {
    const user = await db.query(query, [email]);
    return user[0] || null;
  } catch (error) {
    logger.error('Database error', { error: error.message, email });
    throw new Error('Database error occurred');
  }
};

// Safe HTML output to prevent XSS
const renderUserProfile = (user) => {
  const safeUserData = {
    id: user.id,
    name: escapeHtml(user.name),
    email: escapeHtml(user.email),
    bio: escapeHtml(user.bio || ''),
    role: user.role
  };

  return `
    <div class="user-profile">
      <h1>${safeUserData.name}</h1>
      <p>${safeUserData.email}</p>
      <div class="bio">${safeUserData.bio}</div>
    </div>
  `;
};

// Secure file operations
const saveUserFile = async (userId, filename, content) => {
  // Validate inputs
  if (!userId || !filename) {
    throw new Error('Missing required parameters');
  }

  // Sanitize filename to prevent path traversal
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  // Create a path within a controlled directory
  const fs = require('fs').promises;
  const path = require('path');
  const userDir = path.join(process.env.UPLOADS_DIR, userId.toString());

  try {
    // Ensure directory exists
    await fs.mkdir(userDir, { recursive: true });

    // Write file safely
    const filePath = path.join(userDir, sanitizedFilename);
    await fs.writeFile(filePath, content, { flag: 'wx' });

    return { success: true, path: filePath };
  } catch (error) {
    logger.error('File operation error', { userId, error: error.message });
    throw new Error('Could not save file');
  }
};

// Secure logging - avoid sensitive data
const logUserActivity = (userId, action, details) => {
  // Never log sensitive information
  const safeDetails = { ...details };

  // Remove any potentially sensitive fields
  delete safeDetails.password;
  delete safeDetails.token;
  delete safeDetails.creditCard;

  logger.info('User activity', {
    userId,
    action,
    timestamp: new Date().toISOString(),
    details: safeDetails
  });
};

module.exports = {
  generateSecureToken,
  hashPassword,
  verifyPassword,
  encryptData,
  decryptData,
  getUserByEmail,
  renderUserProfile,
  saveUserFile,
  logUserActivity
};