const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with id, email, and role
 * @returns {String} JWT token
 */
exports.generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Generate response with token
 * @param {Object} user - User object
 * @returns {Object} Response object with token and user data
 */
exports.generateAuthResponse = (user) => {
  // Create token
  const token = this.generateToken(user);

  // Remove sensitive data
  const userData = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    organization: user.organization
  };

  return {
    success: true,
    token,
    user: userData
  };
};
