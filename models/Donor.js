const mongoose = require('mongoose');

const DonorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  organDonatable: [{
    organType: {
      type: String,
      enum: ['kidney', 'liver', 'heart', 'lung', 'pancreas', 'intestine', 'cornea', 'bone', 'skin', 'heart_valve'],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  medicalHistory: {
    chronicConditions: [String],
    allergies: [String],
    medications: [String],
    pastSurgeries: [String],
    smokingStatus: {
      type: String,
      enum: ['never', 'former', 'current'],
      default: 'never'
    },
    alcoholConsumption: {
      type: String,
      enum: ['none', 'light', 'moderate', 'heavy'],
      default: 'none'
    }
  },
  physicalDetails: {
    height: Number, // in cm
    weight: Number, // in kg
    bmi: Number,
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    }
  },
  donationHistory: [{
    donationType: {
      type: String,
      enum: ['blood', 'plasma', 'platelets', 'organ'],
      required: true
    },
    organType: String,
    date: {
      type: Date,
      required: true
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital'
    },
    notes: String
  }],
  lastDonationDate: Date,
  isAvailable: {
    type: Boolean,
    default: true
  },
  availabilitySchedule: {
    startDate: Date,
    endDate: Date,
    recurringDays: [String], // ['monday', 'wednesday', 'friday']
    timeSlots: [{
      start: String, // '09:00'
      end: String    // '17:00'
    }]
  },
  contactPreferences: {
    method: {
      type: String,
      enum: ['email', 'phone', 'sms'],
      default: 'email'
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Donor', DonorSchema);