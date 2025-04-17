// controllers/donorController.js
const Donor = require('../models/Donor');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * @desc    Create donor profile
 * @route   POST /api/donors
 */
exports.createDonorProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if donor profile already exists
    const existingDonor = await Donor.findOne({ user: req.user.id });
    if (existingDonor) {
      return res.status(400).json({ msg: 'Donor profile already exists' });
    }

    // Extract donor data from request
    const {
      bloodType,
      organDonatable,
      medicalHistory,
      physicalDetails,
      availabilitySchedule,
      contactPreferences
    } = req.body;

    // Create donor profile
    const donor = new Donor({
      user: req.user.id,
      bloodType,
      organDonatable,
      medicalHistory,
      physicalDetails,
      availabilitySchedule,
      contactPreferences,
      isAvailable: true
    });

    await donor.save();

    res.status(201).json(donor);
  } catch (err) {
    console.error('Create donor profile error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get donors with filtering options
 * @route   GET /api/donors
 */
exports.getDonors = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    // Filter by blood type
    if (req.query.bloodType) {
      filter.bloodType = req.query.bloodType;
    }
    
    // Filter by organ type
    if (req.query.organType) {
      filter['organDonatable.organType'] = req.query.organType;
      filter['organDonatable.isAvailable'] = true;
    }
    
    // Filter by availability
    if (req.query.isAvailable) {
      filter.isAvailable = req.query.isAvailable === 'true';
    }

    // Execute query with pagination
    const donors = await Donor.find(filter)
      .populate('user', 'name email phone location')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Donor.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };

    res.json({ donors, pagination });
  } catch (err) {
    console.error('Get donors error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get donor by ID
 * @route   GET /api/donors/:id
 */
exports.getDonorById = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id)
      .populate('user', 'name email phone location')
      .populate('donationHistory.hospital', 'name location');

    if (!donor) {
      return res.status(404).json({ msg: 'Donor not found' });
    }

    // Check authorization (admin, coordinator, or the donor themselves)
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && 
        donor.user._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(donor);
  } catch (err) {
    console.error('Get donor by ID error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Donor not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update donor profile
 * @route   PUT /api/donors/:id
 */
exports.updateDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
      return res.status(404).json({ msg: 'Donor not found' });
    }

    // Check authorization (admin or the donor themselves)
    if (req.user.role !== 'admin' && donor.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Extract update fields
    const {
      bloodType,
      organDonatable,
      medicalHistory,
      physicalDetails,
      availabilitySchedule,
      contactPreferences
    } = req.body;

    // Update fields
    if (bloodType) donor.bloodType = bloodType;
    if (organDonatable) donor.organDonatable = organDonatable;
    if (medicalHistory) donor.medicalHistory = medicalHistory;
    if (physicalDetails) donor.physicalDetails = physicalDetails;
    if (availabilitySchedule) donor.availabilitySchedule = availabilitySchedule;
    if (contactPreferences) donor.contactPreferences = contactPreferences;

    await donor.save();

    res.json(donor);
  } catch (err) {
    console.error('Update donor error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Donor not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update donor availability
 * @route   PATCH /api/donors/:id/availability
 */
exports.updateAvailability = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
      return res.status(404).json({ msg: 'Donor not found' });
    }

    // Check authorization (admin or the donor themselves)
    if (req.user.role !== 'admin' && donor.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { isAvailable, availabilitySchedule } = req.body;

    // Update availability
    if (isAvailable !== undefined) donor.isAvailable = isAvailable;
    if (availabilitySchedule) donor.availabilitySchedule = availabilitySchedule;

    await donor.save();

    res.json(donor);
  } catch (err) {
    console.error('Update availability error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Donor not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get donor donation history
 * @route   GET /api/donors/:id/history
 */
exports.getDonationHistory = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id)
      .populate('donationHistory.hospital', 'name location contactInfo');

    if (!donor) {
      return res.status(404).json({ msg: 'Donor not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && 
        donor.user.toString() !== req.user.id && req.user.role !== 'hospital') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(donor.donationHistory);
  } catch (err) {
    console.error('Get donation history error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Donor not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Add donation record
 * @route   POST /api/donors/:id/donation
 */
exports.addDonationRecord = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
      return res.status(404).json({ msg: 'Donor not found' });
    }

    const { donationType, organType, date, hospital, notes } = req.body;

    const newDonation = {
      donationType,
      date,
      hospital,
      notes
    };

    if (organType) newDonation.organType = organType;

    // Add donation to history
    donor.donationHistory.unshift(newDonation);
    
    // Update last donation date
    donor.lastDonationDate = date;

    await donor.save();

    res.json(donor.donationHistory[0]);
  } catch (err) {
    console.error('Add donation record error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Donor not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};