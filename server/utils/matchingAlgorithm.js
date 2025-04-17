/**
 * Matching Algorithm Utility
 * 
 * This file contains functions to match donors with requests based on various factors:
 * - Blood type compatibility
 * - Geographic proximity
 * - Medical criteria matching
 * - Availability
 * - Urgency level
 */

const Donor = require('../models/Donor');
const Request = require('../models/Request');
const Hospital = require('../models/Hospital');
const Match = require('../models/Match');

// Blood type compatibility matrix
const BLOOD_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']
};

/**
 * Calculate distance between two geographic coordinates
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {Number} - Distance in kilometers
 */
const calculateDistance = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Find potential blood donors for a request
 * @param {Object} request - Request object
 * @returns {Promise<Array>} - Array of potential donors with match scores
 */
const findBloodDonorMatches = async (request) => {
  try {
    const hospital = await Hospital.findById(request.hospital);
    if (!hospital || !hospital.location.coordinates) {
      throw new Error('Hospital location not found');
    }
    
    // Find donors with compatible blood type
    const compatibleDonors = await Donor.find({
      bloodType: { $in: BLOOD_COMPATIBILITY[request.bloodType] || [] },
      isAvailable: true,
      'donationHistory.donationType': { $ne: 'blood' } // Filter out donors who haven't donated blood recently
    }).populate('user');
    
    // Calculate match scores for each donor
    const potentialMatches = await Promise.all(compatibleDonors.map(async donor => {
      const user = donor.user;
      if (!user || !user.location || !user.location.coordinates) {
        return null;
      }
      
      const distance = calculateDistance(
        hospital.location.coordinates, 
        user.location.coordinates
      );
      
      // Skip if beyond max distance criteria
      if (distance > request.matchCriteria.maxDistanceKm) {
        return null;
      }
      
      // Calculate days since last donation
      const daysSinceLastDonation = donor.lastDonationDate 
        ? Math.floor((new Date() - donor.lastDonationDate) / (1000 * 60 * 60 * 24))
        : 365; // If never donated, set to a large number
      
      // Minimum 56 days (8 weeks) between whole blood donations
      if (request.bloodComponent === 'whole' && daysSinceLastDonation < 56) {
        return null;
      }
      
      // Calculate match score (0-100)
      let matchScore = 0;
      
      // Exact blood type match scores higher
      matchScore += donor.bloodType === request.bloodType ? 30 : 15;
      
      // Distance factor (closer is better)
      matchScore += Math.max(0, 30 - (distance / 5)); // Up to 30 points for proximity
      
      // Availability factor
      matchScore += 20;
      
      // Donor health factors
      if (donor.medicalHistory.smokingStatus === 'never') matchScore += 5;
      if (donor.medicalHistory.alcoholConsumption === 'none' || donor.medicalHistory.alcoholConsumption === 'light') matchScore += 5;
      if (donor.physicalDetails.bmi >= 18 && donor.physicalDetails.bmi <= 30) matchScore += 5;
      
      // Time since last donation (more time = better)
      matchScore += Math.min(10, daysSinceLastDonation / 30); // Up to 10 points
      
      return {
        donor: donor._id,
        matchScore: Math.min(100, Math.round(matchScore)),
        matchFactors: {
          bloodTypeCompatibility: true,
          distanceKm: Math.round(distance * 10) / 10,
          timeToTransport: Math.round(distance / 50 * 60), // Rough estimate of minutes to transport
          ageDifference: Math.abs((donor.physicalDetails.age || 0) - (request.recipientDetails.age || 0))
        }
      };
    }));
    
    // Filter out null matches and sort by match score (highest first)
    return potentialMatches
      .filter(match => match !== null)
      .sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('Error finding blood donor matches:', error);
    throw error;
  }
};

/**
 * Find potential organ donors for a request
 * @param {Object} request - Request object
 * @returns {Promise<Array>} - Array of potential donors with match scores
 */
const findOrganDonorMatches = async (request) => {
  try {
    const hospital = await Hospital.findById(request.hospital);
    if (!hospital || !hospital.location.coordinates) {
      throw new Error('Hospital location not found');
    }
    
    // Find compatible donors
    const organType = request.organType;
    const recipientBloodType = request.recipientDetails.bloodType;
    
    // Find donors with the right organ type available
    const compatibleDonors = await Donor.find({
      'organDonatable': {
        $elemMatch: {
          organType: organType,
          isAvailable: true
        }
      },
      isAvailable: true
    }).populate('user');
    
    // Calculate match scores for each donor
    const potentialMatches = await Promise.all(compatibleDonors.map(async donor => {
      const user = donor.user;
      if (!user || !user.location || !user.location.coordinates) {
        return null;
      }
      
      // Check blood compatibility for organ donation
      const isBloodCompatible = BLOOD_COMPATIBILITY[donor.bloodType]?.includes(recipientBloodType);
      if (!isBloodCompatible) {
        return null;
      }
      
      const distance = calculateDistance(
        hospital.location.coordinates, 
        user.location.coordinates
      );
      
      // Skip if beyond max distance criteria
      if (distance > request.matchCriteria.maxDistanceKm) {
        return null;
      }
      
      // Age criteria check
      const donorAge = donor.physicalDetails.age || 0;
      const recipientAge = request.recipientDetails.age || 0;
      
      if (request.matchCriteria.preferredAgeRange) {
        if (donorAge < request.matchCriteria.preferredAgeRange.min || 
            donorAge > request.matchCriteria.preferredAgeRange.max) {
          return null;
        }
      }
      
      // Calculate size match (based on height/weight)
      let sizeMatch = 0;
      if (donor.physicalDetails.height && request.recipientDetails.height) {
        const heightRatio = donor.physicalDetails.height / request.recipientDetails.height;
        // Ideal is between 0.85 and 1.15
        if (heightRatio >= 0.85 && heightRatio <= 1.15) {
          sizeMatch += 50;
        } else if (heightRatio >= 0.75 && heightRatio <= 1.25) {
          sizeMatch += 25;
        }
      }
      
      if (donor.physicalDetails.weight && request.recipientDetails.weight) {
        const weightRatio = donor.physicalDetails.weight / request.recipientDetails.weight;
        // Ideal is between 0.8 and 1.2
        if (weightRatio >= 0.8 && weightRatio <= 1.2) {
          sizeMatch += 50;
        } else if (weightRatio >= 0.7 && weightRatio <= 1.3) {
          sizeMatch += 25;
        }
      }
      
      // Normalize to 0-100
      sizeMatch = sizeMatch / 100;
      
      // Calculate urgency factor
      let urgencyFactor = 0;
      switch (request.recipientDetails.urgencyLevel) {
        case 'critical':
          urgencyFactor = 1.0;
          break;
        case 'emergency':
          urgencyFactor = 0.8;
          break;
        case 'urgent':
          urgencyFactor = 0.6;
          break;
        case 'routine':
          urgencyFactor = 0.3;
          break;
      }
      
      // Calculate match score (0-100)
      let matchScore = 0;
      
      // Blood type compatibility (25 points)
      matchScore += 25;
      
      // Size match (up to 25 points)
      matchScore += sizeMatch * 25;
      
      // Distance factor (up to 20 points, closer is better)
      // For organs, we have stricter distance requirements (cold ischemia time)
      const maxTransportDistance = 500; // km
      matchScore += Math.max(0, 20 * (1 - distance / maxTransportDistance));
      
      // Age difference factor (up to 15 points)
      const ageDifference = Math.abs(donorAge - recipientAge);
      matchScore += Math.max(0, 15 - (ageDifference / 2));
      
      // Urgency adjustment (can boost score by up to 15%)
      matchScore = matchScore * (1 + (urgencyFactor * 0.15));
      
      return {
        donor: donor._id,
        matchScore: Math.min(100, Math.round(matchScore)),
        matchFactors: {
          bloodTypeCompatibility: true,
          distanceKm: Math.round(distance * 10) / 10,
          ageDifference: ageDifference,
          sizeMatch: Math.round(sizeMatch * 100),
          urgencyFactor: Math.round(urgencyFactor * 100),
          timeToTransport: Math.round(distance / 80 * 60) // Estimated minutes (80km/h)
        }
      };
    }));
    
    // Filter out null matches and sort by match score (highest first)
    return potentialMatches
      .filter(match => match !== null)
      .sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('Error finding organ donor matches:', error);
    throw error;
  }
};

/**
 * Create a match record in the database
 * @param {Object} request - Request object
 * @param {Object} matchData - Match data including donor and score
 * @returns {Promise<Object>} - Created match object
 */
const createMatch = async (request, matchData) => {
  try {
    const match = new Match({
      request: request._id,
      donor: matchData.donor,
      matchScore: matchData.matchScore,
      matchFactors: matchData.matchFactors,
      status: 'proposed'
    });
    
    await match.save();
    
    // Update request status
    await Request.findByIdAndUpdate(request._id, {
      status: 'matched'
    });
    
    return match;
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
};

/**
 * Find the best matches for a request
 * @param {String} requestId - Request ID to find matches for
 * @param {Number} limit - Maximum number of matches to return
 * @returns {Promise<Array>} - Array of created matches
 */
const findBestMatches = async (requestId, limit = 5) => {
  try {
    const request = await Request.findById(requestId);
    if (!request) {
      throw new Error('Request not found');
    }
    
    // Skip if request is not in pending or searching status
    if (!['pending', 'searching'].includes(request.status)) {
      return [];
    }
    
    // Update request status to searching
    if (request.status === 'pending') {
      await Request.findByIdAndUpdate(requestId, { status: 'searching' });
    }
    
    // Find potential matches based on request type
    let potentialMatches = [];
    if (request.requestType === 'blood') {
      potentialMatches = await findBloodDonorMatches(request);
    } else if (request.requestType === 'organ') {
      potentialMatches = await findOrganDonorMatches(request);
    }
    
    // Limit the number of matches
    potentialMatches = potentialMatches.slice(0, limit);
    
    // Create match records in the database
    const createdMatches = await Promise.all(
      potentialMatches.map(matchData => createMatch(request, matchData))
    );
    
    return createdMatches;
  } catch (error) {
    console.error('Error finding best matches:', error);
    throw error;
  }
};

/**
 * Process all pending requests to find matches
 * @returns {Promise<Object>} - Statistics about processed requests
 */
const processAllPendingRequests = async () => {
  try {
    const pendingRequests = await Request.find({
      status: 'pending',
      requiredBy: { $gt: new Date() } // Only process requests that haven't expired
    });
    
    let stats = {
      total: pendingRequests.length,
      processed: 0,
      matchesFound: 0,
      errors: 0
    };
    
    for (const request of pendingRequests) {
      try {
        const matches = await findBestMatches(request._id);
        stats.processed++;
        stats.matchesFound += matches.length;
      } catch (error) {
        console.error(`Error processing request ${request._id}:`, error);
        stats.errors++;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error processing pending requests:', error);
    throw error;
  }
};

module.exports = {
  findBestMatches,
  processAllPendingRequests,
  calculateDistance,
  BLOOD_COMPATIBILITY
};