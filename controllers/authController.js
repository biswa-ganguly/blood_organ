// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { sendEmail } = require('../utils/mailer');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone, role, location } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create user instance
    user = new User({
      name,
      email,
      password,
      phone,
      role,
      location,
      verificationToken
    });

    // Save user to database
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
    await sendEmail({
      to: email,
      subject: 'Email Verification',
      html: `Please click the link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`
    });

    res.status(201).json({ msg: 'User registered. Please verify your email.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 */
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(400).json({ errors: [{ msg: 'Please verify your email before logging in' }] });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Verify user email
 * @route   GET /api/auth/verify/:token
 */
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    // Find user with verification token
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid verification token' });
    }

    // Update user
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ msg: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Send password reset email
 * @route   POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token expiration (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `Please click this link to reset your password: <a href="${resetUrl}">${resetUrl}</a>. This link is valid for 1 hour.`
    });

    res.json({ msg: 'Password reset email sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get current authenticated user
 * @route   GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 */
exports.updateProfile = async (req, res) => {
  const { name, phone, location } = req.body;

  // Build user update object
  const userFields = {};
  if (name) userFields.name = name;
  if (phone) userFields.phone = phone;
  if (location) userFields.location = location;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};