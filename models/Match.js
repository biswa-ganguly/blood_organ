const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  matchFactors: {
    bloodTypeCompatibility: {
      type: Boolean,
      required: true
    },
    distanceKm: Number,
    ageDifference: Number,
    sizeMatch: Number,
    tissueTypeMatch: Number,
    urgencyFactor: Number,
    timeToTransport: Number
  },
  status: {
    type: String,
    enum: ['proposed', 'pending_confirmation', 'confirmed', 'rejected', 'in_transit', 'delivered', 'transplanted', 'failed'],
    default: 'proposed'
  },
  confirmedAt: Date,
  rejectionReason: String,
  logistics: {
    transportArrangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    estimatedArrival: Date,
    actualDepartureTime: Date,
    actualArrivalTime: Date,
    transportMethod: {
      type: String,
      enum: ['ground', 'helicopter', 'airplane', 'drone']
    },
    trackingInfo: {
      vehicleId: String,
      driverContact: String,
      currentLocation: {
        type: {
          type: String,
          default: 'Point'
        },
        coordinates: [Number] // [longitude, latitude]
      },
      lastUpdated: Date
    },
    specialInstructions: String
  },
  outcome: {
    successful: Boolean,
    notes: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: Date
  }
}, {
  timestamps: true
});

// Index for frequent queries
MatchSchema.index({ request: 1, status: 1 });
MatchSchema.index({ donor: 1, status: 1 });
MatchSchema.index({ matchScore: -1 }); // For sorting by match quality

module.exports = mongoose.model('Match', MatchSchema);