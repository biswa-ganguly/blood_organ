const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const requestController = require('../controllers/requestController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roles');

// @route   POST api/requests
// @desc    Create donation request
// @access  Private
router.post(
  '/',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR]),
    [
      check('requestType', 'Request type is required').isIn(['blood', 'organ']),
      check('recipientDetails', 'Recipient details are required').not().isEmpty(),
      check('requiredBy', 'Required by date is required').isISO8601()
    ]
  ],
  requestController.createRequest
);

// @route   GET api/requests
// @desc    Get all requests with filtering
// @access  Private
router.get('/', authenticate, requestController.getRequests);

// @route   GET api/requests/:id
// @desc    Get request by ID
// @access  Private
router.get('/:id', authenticate, requestController.getRequestById);

// @route   PATCH api/requests/:id/status
// @desc    Update request status
// @access  Private
router.patch(
  '/:id/status',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR]),
    check('status', 'Status is required').isIn(['pending', 'searching', 'matched', 'in_progress', 'completed', 'cancelled'])
  ],
  requestController.updateRequestStatus
);

// @route   PUT api/requests/:id
// @desc    Update request
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR])
  ],
  requestController.updateRequest
);

// @route   GET api/requests/urgent/:type
// @desc    Get urgent requests by type (blood/organ)
// @access  Private
router.get(
  '/urgent/:type',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR, ROLES.DONOR])
  ],
  requestController.getUrgentRequests
);

module.exports = router;