// controllers/hospitalController.js
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * @desc    Create hospital profile
 * @route   POST /api/hospitals
 */
exports.createHospitalProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if hospital profile already exists
    const existingHospital = await Hospital.findOne({ user: req.user.id });
    if (existingHospital) {
      return res.status(400).json({ msg: 'Hospital profile already exists' });
    }

    const {
      name,
      licenseNumber,
      location,
      contactInfo,
      facilityType,
      capacity,
      services,
      specialties,
      certifications,
      operatingHours
    } = req.body;

    // Create hospital profile
    const hospital = new Hospital({
      user: req.user.id,
      name,
      licenseNumber,
      location,
      contactInfo,
      facilityType,
      capacity,
      services,
      specialties,
      certifications,
      operatingHours,
      isActive: true
    });

    await hospital.save();

    res.status(201).json(hospital);
  } catch (err) {
    console.error('Create hospital profile error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get all hospitals with filtering options
 * @route   GET /api/hospitals
 */
exports.getHospitals = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    // Filter by service type
    if (req.query.service) {
      filter.services = req.query.service;
    }
    
    // Filter by specialties
    if (req.query.specialty) {
      filter.specialties = req.query.specialty;
    }
    
    // Filter by active status
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Execute query with pagination
    const hospitals = await Hospital.find(filter)
      .populate('user', 'name email phone')
      .skip(startIndex)
      .limit(limit)
      .sort({ name: 1 });

    // Get total count for pagination
    const total = await Hospital.countDocuments(filter);

    // Pagination result
    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };

    res.json({ hospitals, pagination });
  } catch (err) {
    console.error('Get hospitals error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Get hospital by ID
 * @route   GET /api/hospitals/:id
 */
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('user', 'name email phone');

    if (!hospital) {
      return res.status(404).json({ msg: 'Hospital not found' });
    }

    res.json(hospital);
  } catch (err) {
    console.error('Get hospital by ID error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Hospital not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update hospital profile
 * @route   PUT /api/hospitals/:id
 */
exports.updateHospitalProfile = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({ msg: 'Hospital not found' });
    }

    // Check authorization (admin or the hospital themselves)
    if (req.user.role !== 'admin' && hospital.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const {
      name,
      location,
      contactInfo,
      facilityType,
      services,
      specialties,
      certifications,
      operatingHours
    } = req.body;

    // Update fields
    if (name) hospital.name = name;
    if (location) hospital.location = location;
    if (contactInfo) hospital.contactInfo = contactInfo;
    if (facilityType) hospital.facilityType = facilityType;
    if (services) hospital.services = services;
    if (specialties) hospital.specialties = specialties;
    if (certifications) hospital.certifications = certifications;
    if (operatingHours) hospital.operatingHours = operatingHours;

    await hospital.save();

    res.json(hospital);
  } catch (err) {
    console.error('Update hospital error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Hospital not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Update hospital capacity
 * @route   PATCH /api/hospitals/:id/capacity
 */
exports.updateCapacity = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({ msg: 'Hospital not found' });
    }

    // Check authorization (admin or the hospital themselves)
    if (req.user.role !== 'admin' && hospital.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { capacity } = req.body;

    // Update capacity
    if (capacity) {
      hospital.capacity = {
        ...hospital.capacity,
        ...capacity
      };
    }

    await hospital.save();

    res.json(hospital);
  } catch (err) {
    console.error('Update capacity error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Hospital not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * @desc    Find nearby hospitals
 * @route   GET /api/hospitals/search/nearby
 */
exports.findNearbyHospitals = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { lng, lat, maxDistance = 10 } = req.query;

  try {
    // Find hospitals within the maxDistance (km)
    const hospitals = await Hospital.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      },
      isActive: true
    }).populate('user', 'name email phone');

    res.json(hospitals);
  } catch (err) {
    console.error('Find nearby hospitals error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};