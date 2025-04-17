const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const matchController = require('../controllers/matchController');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/roles');

// @route   GET api/matches
// @desc    Get all matches with filtering
// @access  Private
router.get('/', authenticate, matchController.getMatches);

// @route   GET api/matches/index
// @desc    Index route for matches API
// @access  Public
router.get('/index', (req, res) => {
  res.json({
    message: 'Welcome to the Matches API',
    endpoints: [
      { method: 'GET', path: '/api/matches', description: 'Get all matches with filtering' },
      { method: 'GET', path: '/api/matches/:id', description: 'Get match by ID' },
      { method: 'POST', path: '/api/matches/search', description: 'Find potential matches for a request' },
      { method: 'POST', path: '/api/matches/:requestId/confirm/:donorId', description: 'Confirm a match' },
      { method: 'PATCH', path: '/api/matches/:id/status', description: 'Update match status' },
      { method: 'PATCH', path: '/api/matches/:id/logistics', description: 'Update match logistics' },
      { method: 'POST', path: '/api/matches/:id/outcome', description: 'Report match outcome' }
    ]
  });
});

// @route   POST api/matches/search
// @desc    Find potential matches for a request
// @access  Private
router.post(
  '/search',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR]),
    check('requestId', 'Request ID is required').isMongoId()
  ],
  matchController.findPotentialMatches
);

// @route   POST api/matches/:requestId/confirm/:donorId
// @desc    Confirm a match
// @access  Private
router.post(
  '/:requestId/confirm/:donorId',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR])
  ],
  matchController.confirmMatch
);

// @route   GET api/matches/:id
// @desc    Get match by ID
// @access  Private
router.get('/:id', authenticate, matchController.getMatchById);

// @route   PATCH api/matches/:id/status
// @desc    Update match status
// @access  Private
router.patch(
  '/:id/status',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR]),
    check('status', 'Status is required').isIn(['proposed', 'pending_confirmation', 'confirmed', 'rejected', 'in_transit', 'delivered', 'transplanted', 'failed'])
  ],
  matchController.updateMatchStatus
);

// @route   PATCH api/matches/:id/logistics
// @desc    Update match logistics
// @access  Private
router.patch(
  '/:id/logistics',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR])
  ],
  matchController.updateLogistics
);

// @route   POST api/matches/:id/outcome
// @desc    Report match outcome
// @access  Private
router.post(
  '/:id/outcome',
  [
    authenticate,
    checkRole([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.COORDINATOR]),
    check('successful', 'Outcome status is required').isBoolean(),
    check('notes', 'Notes must be a string if provided').optional().isString()
  ],
  matchController.reportOutcome
);

module.exports = router;