const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const hospitalController = require('../controllers/hospitalController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roles');

// @route   POST api/hospitals
// @desc    Create hospital profile
// @access  Private
router.post(
  '/',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN]),
    [
      check('name', 'Hospital name is required').not().isEmpty(),
      check('licenseNumber', 'License number is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty(),
      check('contactInfo', 'Contact information is required').not().isEmpty()
    ]
  ],
  hospitalController.createHospitalProfile
);

// @route   GET api/hospitals
// @desc    Get all hospitals
// @access  Private
router.get('/', authenticate, hospitalController.getHospitals);

// @route   GET api/hospitals/:id
// @desc    Get hospital by ID
// @access  Private
router.get('/:id', authenticate, hospitalController.getHospitalById);

// @route   PUT api/hospitals/:id
// @desc    Update hospital profile
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN])
  ],
  hospitalController.updateHospitalProfile
);

// @route   PATCH api/hospitals/:id/capacity
// @desc    Update hospital capacity
// @access  Private
router.patch(
  '/:id/capacity',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN])
  ],
  hospitalController.updateCapacity
);

// @route   GET api/hospitals/nearby
// @desc    Find nearby hospitals
// @access  Private
router.get(
  '/search/nearby',
  [
    authenticate,
    check('lng', 'Longitude is required').isNumeric(),
    check('lat', 'Latitude is required').isNumeric(),
    check('maxDistance', 'Max distance must be a positive number').optional().isNumeric().toFloat().custom(value => value > 0)
  ],
  hospitalController.findNearbyHospitals
);

module.exports = router;