const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const donorController = require('../controllers/donorController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roles');

// @route   POST api/donors
// @desc    Create donor profile
// @access  Private
router.post(
  '/',
  [
    authenticate,
    checkRole([ROLES.DONOR, ROLES.ADMIN]),
    [
      check('bloodType', 'Blood type is required').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      check('organDonatable', 'Organ donation preferences are required').isArray(),
      check('physicalDetails', 'Physical details are required').not().isEmpty()
    ]
  ],
  donorController.createDonorProfile
);

// @route   GET api/donors
// @desc    Get all donors with filtering
// @access  Private
router.get('/', 
  authenticate, 
  checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR]),
  donorController.getDonors
);

// @route   GET api/donors/:id
// @desc    Get donor by ID
// @access  Private
router.get('/:id', 
  authenticate, 
  donorController.getDonorById
);

// @route   PUT api/donors/:id
// @desc    Update donor profile
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    checkRole([ROLES.DONOR, ROLES.ADMIN])
  ],
  donorController.updateDonorProfile
);

// @route   PATCH api/donors/:id/availability
// @desc    Update donor availability
// @access  Private
router.patch(
  '/:id/availability',
  [
    authenticate,
    checkRole([ROLES.DONOR, ROLES.ADMIN])
  ],
  donorController.updateAvailability
);

// @route   GET api/donors/:id/history
// @desc    Get donor donation history
// @access  Private
router.get(
  '/:id/history',
  authenticate,
  donorController.getDonationHistory
);

// @route   POST api/donors/:id/donation
// @desc    Add donation record
// @access  Private
router.post(
  '/:id/donation',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR]),
    [
      check('donationType', 'Donation type is required').isIn(['blood', 'plasma', 'platelets', 'organ']),
      check('date', 'Date is required').isISO8601()
    ]
  ],
  donorController.addDonationRecord
);

module.exports = router;