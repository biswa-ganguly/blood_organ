const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  contactInfo: {
    primaryContact: {
      name: String,
      position: String,
      email: String,
      phone: String
    },
    emergencyContact: {
      name: String,
      position: String,
      email: String,
      phone: String
    },
    website: String
  },
  facilityType: {
    type: String,
    enum: ['general', 'specialized', 'research', 'community'],
    default: 'general'
  },
  capacity: {
    totalBeds: Number,
    availableBeds: Number,
    icuBeds: {
      total: Number,
      available: Number
    },
    ventilators: {
      total: Number,
      available: Number
    }
  },
  services: [{
    type: String,
    enum: ['bloodBank', 'organTransplant', 'emergency', 'surgery', 'dialysis']
  }],
  specialties: [String],
  certifications: [String],
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for geospatial queries
HospitalSchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model('Hospital', HospitalSchema);