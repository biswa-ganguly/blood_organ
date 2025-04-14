// controllers/matchController.js
const Match = require('../models/Match');
const Request = require('../models/Request');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const mailer = require('../utils/mailer');

/**
 * @desc    Get all matches with filtering
 * @route   GET /api/matches
 */
exports.getMatches = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build filter object
    let filter = {};
    
    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by request type if provided
    if (req.query.requestType) {
      filter.requestType = req.query.requestType;
    }
    
    // If user is hospital, only show matches related to their requests
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital) {
        return res.status(404).json({ msg: 'Hospital profile not found' });
      }
      
      // Find requests from this hospital
      const hospitalRequests = await Request.find({ hospital: hospital._id });
      const requestIds = hospitalRequests.map(req => req._id);
      
      // Filter matches by these request IDs
      filter.request = { $in: requestIds };
    }
    
    // If user is donor, only show their matches
    if (req.user.role === 'donor') {
      const donor = await Donor.findOne({ user: req.user.id });
      if (!donor) {
        return res.status(404).json({ msg: 'Donor profile not found' });
      }
      filter.donor = donor._id;
    }

    // Execute query with pagination
    const matches = await Match.find(filter)
      .populate('request', 'requestType requiredBy status')
      .populate('donor', 'name bloodType')
      .populate({
        path: 'request',
        populate: { path: 'hospital', select: 'name location' }
      })
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Match.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };

    res.json({ matches, pagination });
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get match by ID
 * @route   GET /api/matches/:id
 */
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('request')
      .populate('donor')
      .populate({
        path: 'request',
        populate: { path: 'hospital', select: 'name location contactInfo' }
      });

    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }

    // Check if user has permission to view this match
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital) {
        return res.status(404).json({ msg: 'Hospital profile not found' });
      }
      
      // Check if this match is related to a request from this hospital
      const request = await Request.findById(match.request);
      if (!request || request.hospital.toString() !== hospital._id.toString()) {
        return res.status(403).json({ msg: 'Not authorized to view this match' });
      }
    } else if (req.user.role === 'donor') {
      const donor = await Donor.findOne({ user: req.user.id });
      if (!donor) {
        return res.status(404).json({ msg: 'Donor profile not found' });
      }
      
      // Check if this match involves this donor
      if (match.donor.toString() !== donor._id.toString()) {
        return res.status(403).json({ msg: 'Not authorized to view this match' });
      }
    }

    res.json(match);
  } catch (err) {
    console.error('Get match by ID error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Match not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Find potential matches for a request
 * @route   POST /api/matches/search
 */
exports.findPotentialMatches = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const request = await Request.findById(req.body.requestId);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found' });
    }

    // Check permission if hospital user
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital || hospital._id.toString() !== request.hospital.toString()) {
        return res.status(403).json({ msg: 'Not authorized to search matches for this request' });
      }
    }

    // Build match criteria based on request type
    let matchCriteria = {};
    
    if (request.requestType === 'blood') {
      // Match based on blood type compatibility
      const compatibleTypes = getCompatibleBloodTypes(request.bloodType);
      matchCriteria = {
        'donorProfile.bloodType': { $in: compatibleTypes },
        'donorProfile.availableForBloodDonation': true,
        'donorProfile.lastBloodDonationDate': { 
          $lt: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) // 56 days (8 weeks) since last donation
        }
      };
    } else if (request.requestType === 'organ') {
      // Match based on organ type and other criteria
      matchCriteria = {
        'donorProfile.organDonor': true,
        'donorProfile.organsForDonation': request.organType, 
        'donorProfile.bloodType': { $in: getCompatibleBloodTypes(request.bloodType) }
      };
      
      // Additional tissue matching criteria can be added here
    }

    // Find active donors matching the criteria
    const donors = await User.find({
      role: 'donor',
      status: 'active',
      ...matchCriteria
    }).populate('donorProfile');

    // Return potential matches
    res.json(donors.map(donor => ({
      donorId: donor._id,
      name: donor.name,
      bloodType: donor.donorProfile.bloodType,
      location: donor.donorProfile.location,
      matchScore: calculateMatchScore(request, donor.donorProfile) // Optional score calculation
    })));
  } catch (err) {
    console.error('Find potential matches error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Confirm a match
 * @route   POST /api/matches/:requestId/confirm/:donorId
 */
exports.confirmMatch = async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found' });
    }

    const donor = await Donor.findById(req.params.donorId);
    if (!donor) {
      return res.status(404).json({ msg: 'Donor not found' });
    }

    // Check permission if hospital user
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital || hospital._id.toString() !== request.hospital.toString()) {
        return res.status(403).json({ msg: 'Not authorized to confirm matches for this request' });
      }
    }

    // Check if a match already exists
    const existingMatch = await Match.findOne({
      request: request._id,
      donor: donor._id
    });

    if (existingMatch) {
      return res.status(400).json({ msg: 'Match already exists for this donor and request' });
    }

    // Create the match
    const match = new Match({
      request: request._id,
      donor: donor._id,
      status: 'proposed',
      proposedBy: req.user.id,
      matchType: request.requestType,
      urgencyLevel: request.recipientDetails.urgencyLevel
    });

    await match.save();

    // Update request status
    request.status = 'matched';
    request.matches = [...(request.matches || []), match._id];
    await request.save();

    // Send notification to donor
    try {
      await mailer.sendMatchNotificationEmail(donor, request);
    } catch (error) {
      console.error('Error sending match notification email:', error);
    }

    res.status(201).json(match);
  } catch (err) {
    console.error('Confirm match error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update match status
 * @route   PATCH /api/matches/:id/status
 */
exports.updateMatchStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }

    // Check permission based on user role
    let hasPermission = false;
    
    if (['admin', 'coordinator'].includes(req.user.role)) {
      hasPermission = true;
    } else if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      const request = await Request.findById(match.request);
      if (hospital && request && hospital._id.toString() === request.hospital.toString()) {
        hasPermission = true;
      }
    } else if (req.user.role === 'donor') {
      const donor = await Donor.findOne({ user: req.user.id });
      if (donor && donor._id.toString() === match.donor.toString()) {
        // Donors can only accept or reject
        if (!['pending_confirmation', 'confirmed', 'rejected'].includes(req.body.status)) {
          return res.status(403).json({ msg: 'Donors can only confirm or reject matches' });
        }
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ msg: 'Not authorized to update this match' });
    }

    // Update status
    match.status = req.body.status;
    match.statusHistory.push({
      status: req.body.status,
      updatedBy: req.user.id,
      notes: req.body.notes || ''
    });

    await match.save();

    // If match is rejected, update request status back to searching
    if (req.body.status === 'rejected') {
      await Request.findByIdAndUpdate(match.request, { status: 'searching' });
    }

    res.json(match);
  } catch (err) {
    console.error('Update match status error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Match not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update match logistics
 * @route   PATCH /api/matches/:id/logistics
 */
exports.updateLogistics = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }

    // Check permission if hospital user or donor
    let hasPermission = false;
    if (['admin', 'coordinator'].includes(req.user.role)) {
      hasPermission = true;
    } else if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      const request = await Request.findById(match.request);
      if (hospital && request && hospital._id.toString() === request.hospital.toString()) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ msg: 'Not authorized to update logistics for this match' });
    }

    // Update logistics fields
    const {
      scheduledDate,
      transportMethod,
      transportDetails,
      additionalInstructions
    } = req.body;

    const logistics = match.logistics || {};

    if (scheduledDate) logistics.scheduledDate = scheduledDate;
    if (transportMethod) logistics.transportMethod = transportMethod;
    if (transportDetails) logistics.transportDetails = transportDetails;
    if (additionalInstructions) logistics.additionalInstructions = additionalInstructions;

    match.logistics = logistics;
    match.lastUpdated = Date.now();

    await match.save();
    res.json(match);
  } catch (err) {
    console.error('Update logistics error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Match not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Report match outcome
 * @route   POST /api/matches/:id/outcome
 */
exports.reportOutcome = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ msg: 'Match not found' });
    }

    // Check permission
    let hasPermission = false;
    if (['admin', 'coordinator'].includes(req.user.role)) {
      hasPermission = true;
    } else if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      const request = await Request.findById(match.request);
      if (hospital && request && hospital._id.toString() === request.hospital.toString()) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ msg: 'Not authorized to report outcome for this match' });
    }

    // Update match with outcome
    match.outcome = {
      successful: req.body.successful,
      completedAt: Date.now(),
      reportedBy: req.user.id,
      notes: req.body.notes || ''
    };

    // Update match status based on outcome
    match.status = req.body.successful ? 'completed' : 'failed';
    match.statusHistory.push({
      status: match.status,
      updatedBy: req.user.id,
      notes: req.body.notes || ''
    });

    await match.save();

    // Update request status
    const request = await Request.findById(match.request);
    if (request) {
      request.status = req.body.successful ? 'fulfilled' : 'searching';
      await request.save();
    }

    res.json(match);
  } catch (err) {
    console.error('Report outcome error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Match not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Helper function to get compatible blood types
 * @param {String} requestedType 
 * @returns {Array} Array of compatible blood types
 */
function getCompatibleBloodTypes(requestedType) {
  const compatibility = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-']
  };
  
  return compatibility[requestedType] || [];
}

/**
 * Helper function to calculate match score
 * @param {Object} request 
 * @param {Object} donorProfile 
 * @returns {Number} Match score (0-100)
 */
function calculateMatchScore(request, donorProfile) {
  // Basic implementation - can be expanded with more sophisticated matching algorithms
  let score = 0;
  
  // Blood type compatibility
  if (request.bloodType && donorProfile.bloodType) {
    const compatibleTypes = getCompatibleBloodTypes(request.bloodType);
    if (compatibleTypes.includes(donorProfile.bloodType)) {
      score += 40;
    }
  }
  
  // Location proximity (if coordinates available)
  if (request.hospital && request.hospital.location && donorProfile.location) {
    const distance = calculateDistance(
      request.hospital.location.coordinates,
      donorProfile.location.coordinates
    );
    
    // Closer is better (within 50km is ideal)
    if (distance < 10) score += 30;
    else if (distance < 25) score += 20;
    else if (distance < 50) score += 10;
  }
  
  // Availability
  if (donorProfile.availability === 'immediate') {
    score += 30;
  } else if (donorProfile.availability === 'flexible') {
    score += 20;
  } else {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Helper function to calculate distance between two points
 * @param {Array} coord1 [longitude, latitude]
 * @param {Array} coord2 [longitude, latitude]
 * @returns {Number} Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}