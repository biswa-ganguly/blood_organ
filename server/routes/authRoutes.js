const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('phone', 'Phone number is required').not().isEmpty(),
    check('role', 'Role is required').isIn(['donor', 'hospital', 'admin', 'coordinator'])
  ],
  authController.register
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

// @route   GET api/auth/verify/:token
// @desc    Verify email
// @access  Public
router.get('/verify/:token', authController.verifyEmail);

// @route   POST api/auth/forgot-password
// @desc    Forgot password - sends reset email
// @access  Public
router.post(
  '/forgot-password',
  [check('email', 'Please include a valid email').isEmail()],
  authController.forgotPassword
);

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
  '/reset-password/:token',
  [check('password', 'Password must be at least 6 characters').isLength({ min: 6 })],
  authController.resetPassword
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, authController.getCurrentUser);

// @route   PUT api/auth/me
// @desc    Update user profile
// @access  Private
router.put('/me', authenticate, authController.updateProfile);

module.exports = router;