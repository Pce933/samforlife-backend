const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AdminUser } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRE_HOURS = 24 * 7; // 7 days

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password, hashed) => {
  try {
    return await bcrypt.compare(password, hashed);
  } catch (err) {
    return false;
  }
};

const createToken = (email) => {
  const payload = { email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${JWT_EXPIRE_HOURS}h` });
};

const decodeToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
};

const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ detail: 'Missing bearer token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = decodeToken(token);
    const user = await AdminUser.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ detail: 'Admin not found' });
    }
    req.user = { email: user.email, name: user.name || 'Admin' };
    next();
  } catch (err) {
    return res.status(401).json({ detail: err.message });
  }
};

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  decodeToken,
  requireAdmin
};
