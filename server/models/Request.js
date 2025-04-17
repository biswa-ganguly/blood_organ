const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  requestType: {
    type: String,
    enum: ['blood', 'organ'],
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: function() {
      return this.requestType === 'blood';
    }
  },
  bloodQuantity: {
    type: Number,
    required: function() {
      return this.requestType === 'blood';
    },
    min: 1
  },
  bloodComponent: {
    type: String,
    enum: ['whole', 'plasma', 'platelets', 'red_cells'],
    required: function() {
      return this.requestType === 'blood';
    }
  },
  organType: {
    type: String,
    enum: ['kidney', 'liver', 'heart', 'lung', 'pancreas', 'intestine', 'cornea', 'bone', 'skin', 'heart_valve'],
    required: function() {
      return this.requestType === 'organ';
    }
  },
  recipientDetails: {
    age: Number,
    gender: String,
    bloodType: String,
    weight: Number,
    height: Number,
    diagnosis: String,
    hlaType: String,
    urgencyLevel: {
      type: String,
      enum: ['routine', 'urgent', 'emergency', 'critical'],
      required: true
    }
  },
  requiredBy: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'searching', 'matched', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchCriteria: {
    maxDistanceKm: {
      type: Number,
      default: 100
    },
    preferredAgeRange: {
      min: Number,
      max: Number
    },
    additionalRequirements: [String]
  }
}, {
  timestamps: true
});

// Create indexes for frequent queries
RequestSchema.index({ status: 1, requiredBy: 1 });
RequestSchema.index({ hospital: 1, status: 1 });
RequestSchema.index({ requestType: 1, status: 1 });

module.exports = mongoose.model('Request', RequestSchema);