/**
 * Validation Utilities
 * 
 * This file contains validation functions used throughout the application
 * for data validation, input sanitization, and business rule enforcement.
 */

const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {String} id - ID to validate
 * @returns {Boolean} - Whether the ID is valid
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Express middleware to check validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Object|void} - Error response or continues to next middleware
 */
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Get common validation rules for user creation/update
 * @param {Boolean} isUpdate - Whether this is for an update operation
 * @returns {Array} - Array of validation rules
 */
const userValidationRules = (isUpdate = false) => {
  const rules = [
    body('name')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Name is required')
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Email is required')
      .trim()
      .normalizeEmail()
      .isEmail().withMessage('Must be a valid email address'),
    
    body('phone')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Phone number is required')
      .trim()
      .matches(/^\+?[0-9]{10,15}$/).withMessage('Must be a valid phone number (10-15 digits)'),
    
    body('role')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Role is required')
      .isIn(['donor', 'hospital', 'admin', 'coordinator']).withMessage('Invalid role')
  ];
  
  // Add password validation for new users only
  if (!isUpdate) {
    rules.push(
      body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/\d/).withMessage('Password must contain a number')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    );
  } else {
    // For updates, password is optional but must meet criteria if provided
    rules.push(
      body('password')
        .optional()
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/\d/).withMessage('Password must contain a number')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    );
  }
  
  // Location validation
  rules.push(
    body('location.coordinates')
      .if((value, { req }) => !isUpdate || value)
      .isArray().withMessage('Coordinates must be an array [longitude, latitude]')
      .custom((value) => {
        if (value.length !== 2) {
          throw new Error('Coordinates must contain exactly 2 values');
        }
        if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
          throw new Error('Coordinates must be numbers');
        }
        if (value[0] < -180 || value[0] > 180) {
          throw new Error('Longitude must be between -180 and 180');
        }
        if (value[1] < -90 || value[1] > 90) {
          throw new Error('Latitude must be between -90 and 90');
        }
        return true;
      }),
    
    body('location.address.street').optional().trim(),
    body('location.address.city').optional().trim(),
    body('location.address.state').optional().trim(),
    body('location.address.zipCode').optional().trim(),
    body('location.address.country').optional().trim()
  );
  
  return rules;
};

/**
 * Get common validation rules for donor profile creation/update
 * @param {Boolean} isUpdate - Whether this is for an update operation
 * @returns {Array} - Array of validation rules
 */
const donorValidationRules = (isUpdate = false) => {
  const rules = [
    body('bloodType')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Blood type is required')
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
    
    // Organ donation validation
    body('organDonatable')
      .optional()
      .isArray().withMessage('Organ donatable must be an array'),
    
    body('organDonatable.*.organType')
      .if(body('organDonatable').exists())
      .notEmpty().withMessage('Organ type is required')
      .isIn(['kidney', 'liver', 'heart', 'lung', 'pancreas', 'intestine', 'cornea', 'bone', 'skin', 'heart_valve'])
      .withMessage('Invalid organ type'),
    
    body('organDonatable.*.isAvailable')
      .if(body('organDonatable').exists())
      .isBoolean().withMessage('Available status must be a boolean'),
    
    // Medical history validation
    body('medicalHistory.chronicConditions')
      .optional()
      .isArray().withMessage('Chronic conditions must be an array'),
    
    body('medicalHistory.allergies')
      .optional()
      .isArray().withMessage('Allergies must be an array'),
    
    body('medicalHistory.medications')
      .optional()
      .isArray().withMessage('Medications must be an array'),
    
    body('medicalHistory.pastSurgeries')
      .optional()
      .isArray().withMessage('Past surgeries must be an array'),
    
    body('medicalHistory.smokingStatus')
      .optional()
      .isIn(['never', 'former', 'current']).withMessage('Invalid smoking status'),
    
    body('medicalHistory.alcoholConsumption')
      .optional()
      .isIn(['none', 'light', 'moderate', 'heavy']).withMessage('Invalid alcohol consumption value'),
    
    // Physical details validation
    body('physicalDetails.height')
      .optional()
      .isFloat({ min: 50, max: 250 }).withMessage('Height must be between 50 and 250 cm'),
    
    body('physicalDetails.weight')
      .optional()
      .isFloat({ min: 20, max: 300 }).withMessage('Weight must be between 20 and 300 kg'),
    
    body('physicalDetails.bmi')
      .optional()
      .isFloat({ min: 10, max: 50 }).withMessage('BMI must be between 10 and 50'),
    
    body('physicalDetails.age')
      .optional()
      .isInt({ min: 16, max: 100 }).withMessage('Age must be between 16 and 100'),
    
    body('physicalDetails.gender')
      .optional()
      .isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender value'),
    
    // Availability validation
    body('isAvailable')
      .optional()
      .isBoolean().withMessage('Available status must be a boolean'),
    
    // Contact preferences validation
    body('contactPreferences.method')
      .optional()
      .isIn(['email', 'phone', 'sms']).withMessage('Invalid contact method'),
    
    body('contactPreferences.emergencyContact.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Emergency contact name must be between 2 and 100 characters'),
    
    body('contactPreferences.emergencyContact.phone')
      .optional()
      .trim()
      .matches(/^\+?[0-9]{10,15}$/).withMessage('Must be a valid phone number (10-15 digits)'),
    
    body('contactPreferences.emergencyContact.relationship')
      .optional()
      .trim()
  ];
  
  return rules;
};

/**
 * Get common validation rules for hospital profile creation/update
 * @param {Boolean} isUpdate - Whether this is for an update operation
 * @returns {Array} - Array of validation rules
 */
const hospitalValidationRules = (isUpdate = false) => {
  const rules = [
    body('name')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Hospital name is required')
      .trim()
      .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
    
    body('licenseNumber')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('License number is required')
      .trim()
      .isLength({ min: 5, max: 50 }).withMessage('License number must be between 5 and 50 characters'),
    
    // Contact info validation
    body('contactInfo.primaryContact.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Contact name must be between 2 and 100 characters'),
    
    body('contactInfo.primaryContact.position')
      .optional()
      .trim(),
    
    body('contactInfo.primaryContact.email')
      .optional()
      .trim()
      .normalizeEmail()
      .isEmail().withMessage('Must be a valid email address'),
    
    body('contactInfo.primaryContact.phone')
      .optional()
      .trim()
      .matches(/^\+?[0-9]{10,15}$/).withMessage('Must be a valid phone number (10-15 digits)'),
    
    body('contactInfo.emergencyContact.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Emergency contact name must be between 2 and 100 characters'),
    
    body('contactInfo.emergencyContact.position')
      .optional()
      .trim(),
    
    body('contactInfo.emergencyContact.email')
      .optional()
      .trim()
      .normalizeEmail()
      .isEmail().withMessage('Must be a valid email address'),
    
    body('contactInfo.emergencyContact.phone')
      .optional()
      .trim()
      .matches(/^\+?[0-9]{10,15}$/).withMessage('Must be a valid phone number (10-15 digits)'),
    
    body('contactInfo.website')
      .optional()
      .trim()
      .isURL().withMessage('Must be a valid URL'),
    
    // Facility type validation
    body('facilityType')
      .optional()
      .isIn(['general', 'specialized', 'research', 'community']).withMessage('Invalid facility type'),
    
    // Capacity validation
    body('capacity.totalBeds')
      .optional()
      .isInt({ min: 0 }).withMessage('Total beds must be a positive integer'),
    
    body('capacity.availableBeds')
      .optional()
      .isInt({ min: 0 }).withMessage('Available beds must be a positive integer')
      .custom((value, { req }) => {
        if (req.body.capacity && req.body.capacity.totalBeds !== undefined && value > req.body.capacity.totalBeds) {
          throw new Error('Available beds cannot exceed total beds');
        }
        return true;
      }),
    
    body('capacity.icuBeds.total')
      .optional()
      .isInt({ min: 0 }).withMessage('Total ICU beds must be a positive integer'),
    
    body('capacity.icuBeds.available')
      .optional()
      .isInt({ min: 0 }).withMessage('Available ICU beds must be a positive integer')
      .custom((value, { req }) => {
        if (req.body.capacity && req.body.capacity.icuBeds && 
            req.body.capacity.icuBeds.total !== undefined && 
            value > req.body.capacity.icuBeds.total) {
          throw new Error('Available ICU beds cannot exceed total ICU beds');
        }
        return true;
      }),
    
    // Services validation
    body('services')
      .optional()
      .isArray().withMessage('Services must be an array')
      .custom((value) => {
        const validServices = ['bloodBank', 'organTransplant', 'emergency', 'surgery', 'dialysis'];
        for (const service of value) {
          if (!validServices.includes(service)) {
            throw new Error(`Invalid service: ${service}`);
          }
        }
        return true;
      }),
    
    // Specialties validation
    body('specialties')
      .optional()
      .isArray().withMessage('Specialties must be an array'),
    
    // Certifications validation
    body('certifications')
      .optional()
      .isArray().withMessage('Certifications must be an array'),
    
    // Operating hours validation
    body('operatingHours.*.open')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Opening hours must be in format HH:MM (24-hour)'),
    
    body('operatingHours.*.close')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Closing hours must be in format HH:MM (24-hour)')
  ];
  
  return rules;
};

/**
 * Get common validation rules for request creation/update
 * @param {Boolean} isUpdate - Whether this is for an update operation
 * @returns {Array} - Array of validation rules
 */
const requestValidationRules = (isUpdate = false) => {
  const rules = [
    body('hospital')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Hospital ID is required')
      .custom(isValidObjectId).withMessage('Invalid hospital ID format'),
    
    body('requestType')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Request type is required')
      .isIn(['blood', 'organ']).withMessage('Invalid request type'),
    
    // Blood request validation
    body('bloodType')
      .if((value, { req }) => (req.body.requestType === 'blood' && (!isUpdate || value)))
      .notEmpty().withMessage('Blood type is required for blood requests')
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
    
    body('bloodQuantity')
      .if((value, { req }) => (req.body.requestType === 'blood' && (!isUpdate || value)))
      .notEmpty().withMessage('Blood quantity is required for blood requests')
      .isInt({ min: 1 }).withMessage('Blood quantity must be a positive integer'),
    
    body('bloodComponent')
      .if((value, { req }) => (req.body.requestType === 'blood' && (!isUpdate || value)))
      .notEmpty().withMessage('Blood component is required for blood requests')
      .isIn(['whole', 'plasma', 'platelets', 'red_cells']).withMessage('Invalid blood component'),
    
    // Organ request validation
    body('organType')
      .if((value, { req }) => (req.body.requestType === 'organ' && (!isUpdate || value)))
      .notEmpty().withMessage('Organ type is required for organ requests')
      .isIn(['kidney', 'liver', 'heart', 'lung', 'pancreas', 'intestine', 'cornea', 'bone', 'skin', 'heart_valve'])
      .withMessage('Invalid organ type'),
    
    // Recipient details validation
    body('recipientDetails.urgencyLevel')
      .notEmpty().withMessage('Urgency level is required')
      .isIn(['routine', 'urgent', 'emergency', 'critical']).withMessage('Invalid urgency level'),
    
    body('recipientDetails.age')
      .optional()
      .isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
    
    body('recipientDetails.gender')
      .optional()
      .isString().withMessage('Gender must be a string'),
    
    body('recipientDetails.bloodType')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
    
    // Required by validation
    body('requiredBy')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Required by date is required')
      .isISO8601().withMessage('Required by must be a valid date')
      .custom((value) => {
        const requiredByDate = new Date(value);
        const now = new Date();
        if (requiredByDate <= now) {
          throw new Error('Required by date must be in the future');
        }
        return true;
      }),
    
    // Status validation
    body('status')
      .optional()
      .isIn(['pending', 'searching', 'matched', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
    
    // Notes validation
    body('notes')
      .optional()
      .isString().withMessage('Notes must be a string')
      .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
    
    // Match criteria validation
    body('matchCriteria.maxDistanceKm')
      .optional()
      .isInt({ min: 1, max: 1000 }).withMessage('Max distance must be between 1 and 1000 km'),
    
    body('matchCriteria.preferredAgeRange.min')
      .optional()
      .isInt({ min: 16, max: 100 }).withMessage('Minimum age must be between 16 and 100'),
    
    body('matchCriteria.preferredAgeRange.max')
      .optional()
      .isInt({ min: 16, max: 100 }).withMessage('Maximum age must be between 16 and 100')
      .custom((value, { req }) => {
        if (req.body.matchCriteria && 
            req.body.matchCriteria.preferredAgeRange && 
            req.body.matchCriteria.preferredAgeRange.min !== undefined && 
            value < req.body.matchCriteria.preferredAgeRange.min) {
          throw new Error('Maximum age cannot be less than minimum age');
        }
        return true;
      }),
    
    body('matchCriteria.additionalRequirements')
      .optional()
      .isArray().withMessage('Additional requirements must be an array')
  ];
  
  return rules;
};

/**
 * Get common validation rules for match creation/update
 * @param {Boolean} isUpdate - Whether this is for an update operation
 * @returns {Array} - Array of validation rules
 */
const matchValidationRules = (isUpdate = false) => {
  const rules = [
    body('request')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Request ID is required')
      .custom(isValidObjectId).withMessage('Invalid request ID format'),
    
    body('donor')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Donor ID is required')
      .custom(isValidObjectId).withMessage('Invalid donor ID format'),
    
    body('matchScore')
      .if((value, { req }) => !isUpdate || value)
      .notEmpty().withMessage('Match score is required')
      .isFloat({ min: 0, max: 100 }).withMessage('Match score must be between 0 and 100'),
    
    // Match factors validation
    body('matchFactors.bloodTypeCompatibility')
      .optional()
      .isBoolean().withMessage('Blood type compatibility must be a boolean'),
    
    body('matchFactors.distanceKm')
      .optional()
      .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
    
    body('matchFactors.ageDifference')
      .optional()
      .isInt({ min: 0 }).withMessage('Age difference must be a positive integer'),
    
    body('matchFactors.sizeMatch')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Size match must be between 0 and 100'),
    
    body('matchFactors.tissueTypeMatch')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Tissue type match must be between 0 and 100'),
    
    body('matchFactors.urgencyFactor')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Urgency factor must be between 0 and 100'),
    
    body('matchFactors.timeToTransport')
      .optional()
      .isInt({ min: 0 }).withMessage('Time to transport must be a positive integer'),
    
    // Status validation
    body('status')
      .optional()
      .isIn(['proposed', 'pending_confirmation', 'confirmed', 'rejected', 'in_transit', 'delivered', 'transplanted', 'failed'])
      .withMessage('Invalid status'),
    
    // Additional fields for update
    body('rejectionReason')
      .optional()
      .isString().withMessage('Rejection reason must be a string')
      .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),
    
    // Logistics validation
    body('logistics.transportMethod')
      .optional()
      .isIn(['ground', 'helicopter', 'airplane', 'drone']).withMessage('Invalid transport method'),
    
    body('logistics.estimatedArrival')
      .optional()
      .isISO8601().withMessage('Estimated arrival must be a valid date'),
    
    body('logistics.trackingInfo.vehicleId')
      .optional()
      .isString().withMessage('Vehicle ID must be a string'),
    
    body('logistics.trackingInfo.driverContact')
      .optional()
      .isString().withMessage('Driver contact must be a string'),
    
    body('logistics.trackingInfo.currentLocation.coordinates')
      .optional()
      .isArray().withMessage('Coordinates must be an array [longitude, latitude]')
      .custom((value) => {
        if (value.length !== 2) {
          throw new Error('Coordinates must contain exactly 2 values');
        }
        if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
          throw new Error('Coordinates must be numbers');
        }
        if (value[0] < -180 || value[0] > 180) {
          throw new Error('Longitude must be between -180 and 180');
        }
        if (value[1] < -90 || value[1] > 90) {
          throw new Error('Latitude must be between -90 and 90');
        }
        return true;
      }),
    
    body('logistics.specialInstructions')
      .optional()
      .isString().withMessage('Special instructions must be a string')
      .isLength({ max: 1000 }).withMessage('Special instructions cannot exceed 1000 characters'),
    
    // Outcome validation
    body('outcome.successful')
    .optional()
    .isBoolean().withMessage('Successful outcome must be a boolean'),
  
  body('outcome.notes')
    .optional()
    .isString().withMessage('Outcome notes must be a string')
    .isLength({ max: 1000 }).withMessage('Outcome notes cannot exceed 1000 characters'),
  
  body('outcome.complications')
    .optional()
    .isArray().withMessage('Complications must be an array'),
  
  body('outcome.followUpRequired')
    .optional()
    .isBoolean().withMessage('Follow-up required must be a boolean'),
  
  body('outcome.followUpDate')
    .optional()
    .isISO8601().withMessage('Follow-up date must be a valid date')
    .custom((value) => {
      const followUpDate = new Date(value);
      const now = new Date();
      if (followUpDate <= now) {
        throw new Error('Follow-up date must be in the future');
      }
      return true;
    })
];

return rules;
};

// Export all the validation utilities
module.exports = {
isValidObjectId,
checkValidationErrors,
userValidationRules,
donorValidationRules,
hospitalValidationRules,
requestValidationRules,
matchValidationRules
};