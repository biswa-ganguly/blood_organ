/**
 * WebSocket Validation Middleware
 * 
 * Validates incoming WebSocket messages to ensure they meet required formats
 * and contain valid data. This middleware works with socket.io events.
 */

const mongoose = require('mongoose');
const { isValidObjectId } = require('../utils/validation');

/**
 * Validates a message object's structure and content
 * @param {Object} message - The message to validate
 * @param {Object} schema - Schema definition for validation
 * @returns {Object} - Validation result with errors if any
 */
const validateMessage = (message, schema) => {
  const errors = [];
  
  // Check if required fields exist
  for (const field of schema.required || []) {
    if (message[field] === undefined) {
      errors.push(`${field} is required`);
    }
  }
  
  // Validate field types and values
  for (const [field, rules] of Object.entries(schema.fields || {})) {
    if (message[field] !== undefined) {
      // Type validation
      if (rules.type && typeof message[field] !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }
      
      // ObjectId validation
      if (rules.isObjectId && !isValidObjectId(message[field])) {
        errors.push(`${field} must be a valid ID`);
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(message[field])) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
      
      // Min/max for numbers
      if (typeof message[field] === 'number') {
        if (rules.min !== undefined && message[field] < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && message[field] > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }
      
      // Min/max length for strings
      if (typeof message[field] === 'string') {
        if (rules.minLength !== undefined && message[field].length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength !== undefined && message[field].length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
      }
      
      // Array validation
      if (Array.isArray(message[field]) && rules.arrayOf) {
        for (let i = 0; i < message[field].length; i++) {
          const itemErrors = validateMessage(message[field][i], rules.arrayOf);
          if (itemErrors.errors.length > 0) {
            errors.push(`${field}[${i}]: ${itemErrors.errors.join(', ')}`);
          }
        }
      }
      
      // Object validation (nested schema)
      if (rules.schema && typeof message[field] === 'object' && !Array.isArray(message[field])) {
        const nestedErrors = validateMessage(message[field], rules.schema);
        if (nestedErrors.errors.length > 0) {
          errors.push(`${field}: ${nestedErrors.errors.join(', ')}`);
        }
      }
      
      // Custom validation function
      if (rules.validate && typeof rules.validate === 'function') {
        const customError = rules.validate(message[field], message);
        if (customError) {
          errors.push(customError);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Message schemas for different socket events
const messageSchemas = {
  // Connection and authentication
  'authenticate': {
    required: ['token'],
    fields: {
      token: { type: 'string', minLength: 10 }
    }
  },
  
  // Request management
  'new-request': {
    required: ['hospitalId', 'requestType', 'recipientDetails', 'requiredBy'],
    fields: {
      hospitalId: { type: 'string', isObjectId: true },
      requestType: { type: 'string', enum: ['blood', 'organ'] },
      bloodType: { 
        type: 'string', 
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      },
      bloodQuantity: { type: 'number', min: 1 },
      bloodComponent: { 
        type: 'string', 
        enum: ['whole', 'plasma', 'platelets', 'red_cells'] 
      },
      organType: { 
        type: 'string', 
        enum: ['kidney', 'liver', 'heart', 'lung', 'pancreas', 'intestine', 'cornea', 'bone', 'skin', 'heart_valve'] 
      },
      recipientDetails: {
        type: 'object',
        schema: {
          required: ['urgencyLevel'],
          fields: {
            age: { type: 'number', min: 0, max: 120 },
            gender: { type: 'string' },
            bloodType: { 
              type: 'string', 
              enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] 
            },
            urgencyLevel: { 
              type: 'string', 
              enum: ['routine', 'urgent', 'emergency', 'critical'] 
            }
          }
        }
      },
      requiredBy: { 
        type: 'string', 
        validate: (value) => {
          const date = new Date(value);
          if (isNaN(date.getTime())) return 'Must be a valid date';
          if (date <= new Date()) return 'Must be a future date';
          return null;
        }
      },
      notes: { type: 'string', maxLength: 1000 },
      matchCriteria: {
        type: 'object',
        schema: {
          fields: {
            maxDistanceKm: { type: 'number', min: 1, max: 1000 },
            preferredAgeRange: {
              type: 'object',
              schema: {
                fields: {
                  min: { type: 'number', min: 16, max: 100 },
                  max: { type: 'number', min: 16, max: 100 }
                }
              }
            },
            additionalRequirements: { type: 'object' }
          }
        }
      }
    }
  },
  
  'update-request-status': {
    required: ['requestId', 'status'],
    fields: {
      requestId: { type: 'string', isObjectId: true },
      status: { 
        type: 'string', 
        enum: ['pending', 'searching', 'matched', 'in_progress', 'completed', 'cancelled'] 
      },
      notes: { type: 'string', maxLength: 1000 }
    }
  },
  
  // Match management
  'respond-to-match': {
    required: ['matchId', 'response'],
    fields: {
      matchId: { type: 'string', isObjectId: true },
      response: { type: 'string', enum: ['accept', 'reject'] },
      rejectionReason: { type: 'string', maxLength: 500 }
    }
  },
  
  'update-match-status': {
    required: ['matchId', 'status'],
    fields: {
      matchId: { type: 'string', isObjectId: true },
      status: { 
        type: 'string', 
        enum: ['proposed', 'pending_confirmation', 'confirmed', 'rejected', 'in_transit', 'delivered', 'transplanted', 'failed'] 
      }
    }
  },
  
  'update-match-logistics': {
    required: ['matchId'],
    fields: {
      matchId: { type: 'string', isObjectId: true },
      transportMethod: { 
        type: 'string', 
        enum: ['ground', 'helicopter', 'airplane', 'drone'] 
      },
      estimatedArrival: { type: 'string' }, // ISO date string
      trackingInfo: {
        type: 'object',
        schema: {
          fields: {
            vehicleId: { type: 'string' },
            driverContact: { type: 'string' },
            currentLocation: {
              type: 'object',
              schema: {
                required: ['coordinates'],
                fields: {
                  coordinates: { 
                    type: 'object',
                    validate: (value) => {
                      if (!Array.isArray(value) || value.length !== 2) {
                        return 'Coordinates must be an array with exactly 2 values';
                      }
                      const [lon, lat] = value;
                      if (typeof lon !== 'number' || typeof lat !== 'number') {
                        return 'Coordinates must be numbers';
                      }
                      if (lon < -180 || lon > 180) {
                        return 'Longitude must be between -180 and 180';
                      }
                      if (lat < -90 || lat > 90) {
                        return 'Latitude must be between -90 and 90';
                      }
                      return null;
                    }
                  }
                }
              }
            }
          }
        }
      },
      specialInstructions: { type: 'string', maxLength: 1000 }
    }
  },
  
  'report-match-outcome': {
    required: ['matchId', 'successful'],
    fields: {
      matchId: { type: 'string', isObjectId: true },
      successful: { type: 'boolean' },
      notes: { type: 'string', maxLength: 1000 },
      complications: { type: 'object' } // Array
    }
  },
  
  // Donor status update
  'update-donor-availability': {
    required: ['donorId', 'isAvailable'],
    fields: {
      donorId: { type: 'string', isObjectId: true },
      isAvailable: { type: 'boolean' },
      availabilitySchedule: {
        type: 'object',
        schema: {
          fields: {
            startDate: { type: 'string' }, // ISO date string
            endDate: { type: 'string' }, // ISO date string
            recurringDays: { type: 'object' }, // Array of strings
            timeSlots: { 
              type: 'object', // Array of objects
              arrayOf: {
                required: ['start', 'end'],
                fields: {
                  start: { type: 'string' }, // Time string
                  end: { type: 'string' } // Time string
                }
              }
            }
          }
        }
      }
    }
  },
  
  // Hospital status update
  'update-hospital-capacity': {
    required: ['hospitalId'],
    fields: {
      hospitalId: { type: 'string', isObjectId: true },
      totalBeds: { type: 'number', min: 0 },
      availableBeds: { type: 'number', min: 0 },
      icuBeds: {
        type: 'object',
        schema: {
          fields: {
            total: { type: 'number', min: 0 },
            available: { type: 'number', min: 0 }
          }
        }
      },
      ventilators: {
        type: 'object',
        schema: {
          fields: {
            total: { type: 'number', min: 0 },
            available: { type: 'number', min: 0 }
          }
        }
      }
    }
  },
  
  // Chat and notification
  'send-message': {
    required: ['recipient', 'content'],
    fields: {
      recipient: { type: 'string', isObjectId: true },
      content: { type: 'string', minLength: 1, maxLength: 5000 },
      attachments: { type: 'object' } // Array
    }
  },
  
  // Subscription management
  'subscribe': {
    required: ['channel'],
    fields: {
      channel: { 
        type: 'string', 
        enum: ['requests', 'matches', 'donors', 'hospitals', 'alerts']
      },
      filters: { type: 'object' }
    }
  },
  
  'unsubscribe': {
    required: ['channel'],
    fields: {
      channel: { 
        type: 'string', 
        enum: ['requests', 'matches', 'donors', 'hospitals', 'alerts']
      }
    }
  }
};

/**
 * Socket.io middleware for validating messages
 * @param {Object} socket - Socket.io socket object
 * @param {Function} next - Next function to call
 */
const validateSocketMessages = (socket) => {
  // Add validation middleware to each event
  const origOn = socket.on;
  
  // Override the 'on' method to add validation
  socket.on = function(event, callback) {
    if (messageSchemas[event]) {
      return origOn.call(this, event, (message, ack) => {
        const validation = validateMessage(message, messageSchemas[event]);
        
        if (!validation.isValid) {
          // If ack is a function, call it with validation errors
          if (typeof ack === 'function') {
            return ack({
              success: false,
              errors: validation.errors
            });
          }
          
          // Emit validation error event
          return socket.emit('validation_error', {
            event,
            errors: validation.errors
          });
        }
        
        // Validation passed, call the original callback
        return callback(message, ack);
      });
    }
    
    // For events without schemas, just pass through
    return origOn.call(this, event, callback);
  };
};

module.exports = {
  validateMessage,
  validateSocketMessages,
  messageSchemas
};