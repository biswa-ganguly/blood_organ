// controllers/requestController.js
const Request = require('../models/Request');
const Hospital = require('../models/Hospital');
const { validationResult } = require('express-validator');

/**
 * @desc    Create donation request
 * @route   POST /api/requests
 */
exports.createRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    let hospitalId;
    
    // If request is from hospital, use their hospital ID
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital) {
        return res.status(404).json({ msg: 'Hospital profile not found' });
      }
      hospitalId = hospital._id;
    } else {
      // Admin or coordinator must provide hospital ID
      hospitalId = req.body.hospital;
      if (!hospitalId) {
        return res.status(400).json({ msg: 'Hospital ID is required' });
      }
    }

    const {
      requestType,
      bloodType,
      bloodQuantity,
      bloodComponent,
      organType,
      recipientDetails,
      requiredBy,
      notes,
      matchCriteria
    } = req.body;

    // Create request object
    const requestFields = {
      hospital: hospitalId,
      requestType,
      recipientDetails,
      requiredBy,
      createdBy: req.user.id,
      status: 'pending'
    };

    // Add type-specific fields
    if (requestType === 'blood') {
      requestFields.bloodType = bloodType;
      requestFields.bloodQuantity = bloodQuantity;
      requestFields.bloodComponent = bloodComponent;
    } else if (requestType === 'organ') {
      requestFields.organType = organType;
    }

    // Add optional fields
    if (notes) requestFields.notes = notes;
    if (matchCriteria) requestFields.matchCriteria = matchCriteria;

    // Create and save request
    const request = new Request(requestFields);
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get all requests with filtering options
 * @route   GET /api/requests
 */
exports.getRequests = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build filter object
    let filter = {};
    
    // If user is a hospital, only show their requests
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital) {
        return res.status(404).json({ msg: 'Hospital profile not found' });
      }
      filter.hospital = hospital._id;
    }
    
    // Filter by request type
    if (req.query.requestType) {
      filter.requestType = req.query.requestType;
    }
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by blood type
    if (req.query.bloodType) {
      filter.bloodType = req.query.bloodType;
    }
    
    // Filter by organ type
    if (req.query.organType) {
      filter.organType = req.query.organType;
    }
    
    // Filter by urgency level
    if (req.query.urgencyLevel) {
      filter['recipientDetails.urgencyLevel'] = req.query.urgencyLevel;
    }

    // Execute query with pagination
    const requests = await Request.find(filter)
      .populate('hospital', 'name location')
      .populate('createdBy', 'name')
      .skip(startIndex)
      .limit(limit)
      .sort({ requiredBy: 1 });

    // Get total count for pagination
    const total = await Request.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };

    res.json({ requests, pagination });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get request by ID
 * @route   GET /api/requests/:id
 */
exports.getRequestById = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('hospital', 'name location contact')
      .populate('createdBy', 'name email')
      .populate('matches');

    if (!request) {
      return res.status(404).json({ msg: 'Request not found' });
    }

    // Check if user has permission to view this request
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital || hospital._id.toString() !== request.hospital._id.toString()) {
        return res.status(403).json({ msg: 'Not authorized to view this request' });
      }
    }

    res.json(request);
  } catch (err) {
    console.error('Get request by ID error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Request not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update request status
 * @route   PATCH /api/requests/:id/status
 */
exports.updateRequestStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found' });
    }

    // Check permission if hospital user
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital || hospital._id.toString() !== request.hospital.toString()) {
        return res.status(403).json({ msg: 'Not authorized to update this request' });
      }
    }

    // Update status and add status history
    request.status = req.body.status;
    request.statusHistory.push({
      status: req.body.status,
      updatedBy: req.user.id,
      notes: req.body.notes || ''
    });

    // Save request
    await request.save();
    res.json(request);
  } catch (err) {
    console.error('Update request status error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Request not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update request details
 * @route   PUT /api/requests/:id
 */
exports.updateRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found' });
    }

    // Check permission if hospital user
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital || hospital._id.toString() !== request.hospital.toString()) {
        return res.status(403).json({ msg: 'Not authorized to update this request' });
      }
    }

    // Don't allow updates if request is already fulfilled or cancelled
    if (['fulfilled', 'cancelled'].includes(request.status)) {
      return res.status(400).json({ msg: 'Cannot update request that is already fulfilled or cancelled' });
    }

    const {
      recipientDetails,
      requiredBy,
      notes,
      matchCriteria,
      bloodQuantity,
      bloodComponent,
      urgencyLevel
    } = req.body;

    // Update fields
    if (recipientDetails) request.recipientDetails = recipientDetails;
    if (requiredBy) request.requiredBy = requiredBy;
    if (notes) request.notes = notes;
    if (matchCriteria) request.matchCriteria = matchCriteria;

    // Update type-specific fields
    if (request.requestType === 'blood') {
      if (bloodQuantity) request.bloodQuantity = bloodQuantity;
      if (bloodComponent) request.bloodComponent = bloodComponent;
    }

    // Update urgency level if provided
    if (urgencyLevel) {
      request.recipientDetails.urgencyLevel = urgencyLevel;
    }

    // Save updated request
    await request.save();
    res.json(request);
  } catch (err) {
    console.error('Update request error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Request not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Delete request
 * @route   DELETE /api/requests/:id
 */
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ msg: 'Request not found' });
    }

    // Check permission if hospital user
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital || hospital._id.toString() !== request.hospital.toString()) {
        return res.status(403).json({ msg: 'Not authorized to delete this request' });
      }
    }

    // Don't allow deletion if request has matches
    const hasMatches = request.matches && request.matches.length > 0;
    if (hasMatches) {
      return res.status(400).json({ msg: 'Cannot delete request with existing matches' });
    }

    await request.remove();
    res.json({ msg: 'Request removed' });
  } catch (err) {
    console.error('Delete request error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Request not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get dashboard statistics for requests
 * @route   GET /api/requests/stats
 */
exports.getRequestStats = async (req, res) => {
  try {
    let filter = {};
    
    // If user is a hospital, only show their stats
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ user: req.user.id });
      if (!hospital) {
        return res.status(404).json({ msg: 'Hospital profile not found' });
      }
      filter.hospital = hospital._id;
    }

    // Count requests by status
    const statusCounts = await Request.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Count requests by type
    const typeCounts = await Request.aggregate([
      { $match: filter },
      { $group: { _id: '$requestType', count: { $sum: 1 } } }
    ]);

    // Urgent requests count
    const urgentCount = await Request.countDocuments({
      ...filter,
      'recipientDetails.urgencyLevel': 'high',
      status: { $nin: ['fulfilled', 'cancelled'] }
    });

    // Requests expiring soon (within 24 hours)
    const expiringCount = await Request.countDocuments({
      ...filter,
      requiredBy: { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      status: { $nin: ['fulfilled', 'cancelled'] }
    });

    // Format the response
    const stats = {
      byStatus: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byType: typeCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      urgent: urgentCount,
      expiringSoon: expiringCount,
      total: await Request.countDocuments(filter)
    };

    res.json(stats);
  } catch (err) {
    console.error('Get request stats error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};