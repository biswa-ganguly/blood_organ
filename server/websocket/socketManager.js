// websocket/socketManager.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Request = require('../models/Request');
const Match = require('../models/Match');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');

/**
 * Socket Manager for realtime communication
 * Handles authentication, connections and event handlers
 */
class SocketManager {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Store connected users
    this.connectedUsers = new Map();
    
    // Initialize socket connection
    this.initialize();
  }

  /**
   * Initialize socket connections and middleware
   */
  initialize() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: Token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user information
        const user = await User.findById(decoded.user.id).select('-password');
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        // Attach user to socket
        socket.user = user;
        next();
      } catch (err) {
        console.error('Socket authentication error:', err);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.io socket
   */
  handleConnection(socket) {
    const userId = socket.user.id;
    const userRole = socket.user.role;
    
    console.log(`User connected: ${userId} (${userRole})`);
    
    // Add user to connected users map
    this.connectedUsers.set(userId, socket.id);
    
    // Join role-specific room
    socket.join(userRole);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Join additional rooms based on role
    this.joinRoleSpecificRooms(socket);

    // Set up event listeners
    this.setupEventListeners(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      this.connectedUsers.delete(userId);
    });
  }

  /**
   * Join additional rooms based on user role
   * @param {Object} socket - Socket.io socket
   */
  async joinRoleSpecificRooms(socket) {
    const userId = socket.user.id;
    const userRole = socket.user.role;

    try {
      if (userRole === 'hospital') {
        // Join hospital-specific room
        const hospital = await Hospital.findOne({ user: userId });
        if (hospital) {
          socket.join(`hospital:${hospital._id}`);
        }
      } else if (userRole === 'donor') {
        // Join donor-specific room
        const donor = await Donor.findOne({ user: userId });
        if (donor) {
          socket.join(`donor:${donor._id}`);
          
          // Join blood type specific room
          if (donor.bloodType) {
            socket.join(`bloodType:${donor.bloodType}`);
          }
          
          // Join organ donor rooms
          donor.organDonatable.forEach(organ => {
            if (organ.isAvailable) {
              socket.join(`organ:${organ.organType}`);
            }
          });
        }
      } else if (userRole === 'coordinator') {
        // Coordinators join all request rooms
        socket.join('allRequests');
      }
    } catch (err) {
      console.error('Error joining role-specific rooms:', err);
    }
  }

  /**
   * Set up event listeners for socket
   * @param {Object} socket - Socket.io socket
   */
  setupEventListeners(socket) {
    const userRole = socket.user.role;

    // Request-related events
    socket.on('request:subscribe', (requestId) => this.handleRequestSubscribe(socket, requestId));
    socket.on('request:unsubscribe', (requestId) => socket.leave(`request:${requestId}`));
    
    // Match-related events
    socket.on('match:subscribe', (matchId) => this.handleMatchSubscribe(socket, matchId));
    socket.on('match:unsubscribe', (matchId) => socket.leave(`match:${matchId}`));
    socket.on('match:statusUpdate', (data) => this.handleMatchStatusUpdate(socket, data));
    
    // Tracking events
    socket.on('tracking:update', (data) => this.handleTrackingUpdate(socket, data));
    
    // Chat events
    socket.on('chat:message', (data) => this.handleChatMessage(socket, data));
    socket.on('chat:typing', (data) => this.handleChatTyping(socket, data));
    
    // Role-specific events
    if (userRole === 'hospital') {
      socket.on('hospital:capacity', (data) => this.handleHospitalCapacityUpdate(socket, data));
    } else if (userRole === 'donor') {
      socket.on('donor:availability', (data) => this.handleDonorAvailabilityUpdate(socket, data));
    }
  }

  /**
   * Handle subscription to a request
   * @param {Object} socket - Socket.io socket
   * @param {String} requestId - Request ID
   */
  async handleRequestSubscribe(socket, requestId) {
    try {
      const userId = socket.user.id;
      const userRole = socket.user.role;
      
      const request = await Request.findById(requestId);
      if (!request) {
        socket.emit('error', { message: 'Request not found' });
        return;
      }
      
      // Check if user has permission to subscribe to this request
      if (userRole === 'hospital') {
        const hospital = await Hospital.findOne({ user: userId });
        if (!hospital || hospital._id.toString() !== request.hospital.toString()) {
          socket.emit('error', { message: 'Not authorized to subscribe to this request' });
          return;
        }
      } else if (userRole === 'donor') {
        // Donors can only subscribe to requests they are matched with
        const donor = await Donor.findOne({ user: userId });
        if (!donor) {
          socket.emit('error', { message: 'Donor profile not found' });
          return;
        }
        
        const isMatched = await Match.findOne({
          request: requestId,
          donor: donor._id,
          status: { $nin: ['rejected', 'failed'] }
        });
        
        if (!isMatched) {
          socket.emit('error', { message: 'Not authorized to subscribe to this request' });
          return;
        }
      }
      
      // Join request room
      socket.join(`request:${requestId}`);
      socket.emit('request:subscribed', { requestId });
    } catch (err) {
      console.error('Error subscribing to request:', err);
      socket.emit('error', { message: 'Failed to subscribe to request' });
    }
  }

  /**
   * Handle subscription to a match
   * @param {Object} socket - Socket.io socket
   * @param {String} matchId - Match ID
   */
  async handleMatchSubscribe(socket, matchId) {
    try {
      const userId = socket.user.id;
      const userRole = socket.user.role;
      
      const match = await Match.findById(matchId)
        .populate('donor')
        .populate('request');
        
      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }
      
      // Check if user has permission to subscribe to this match
      if (userRole === 'hospital') {
        const hospital = await Hospital.findOne({ user: userId });
        if (!hospital || hospital._id.toString() !== match.request.hospital.toString()) {
          socket.emit('error', { message: 'Not authorized to subscribe to this match' });
          return;
        }
      } else if (userRole === 'donor') {
        const donor = await Donor.findOne({ user: userId });
        if (!donor || donor._id.toString() !== match.donor._id.toString()) {
          socket.emit('error', { message: 'Not authorized to subscribe to this match' });
          return;
        }
      }
      
      // Join match room
      socket.join(`match:${matchId}`);
      socket.emit('match:subscribed', { matchId });
    } catch (err) {
      console.error('Error subscribing to match:', err);
      socket.emit('error', { message: 'Failed to subscribe to match' });
    }
  }

  /**
   * Handle match status updates
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Status update data
   */
  async handleMatchStatusUpdate(socket, data) {
    try {
      const { matchId, status, notes } = data;
      
      const match = await Match.findById(matchId);
      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }
      
      // Update match status
      match.status = status;
      if (status === 'confirmed') {
        match.confirmedAt = new Date();
      }
      if (status === 'rejected' && notes) {
        match.rejectionReason = notes;
      }
      
      await match.save();
      
      // Populate match with related data
      const populatedMatch = await Match.findById(matchId)
        .populate('donor', 'user')
        .populate('request', 'hospital')
        .populate({
          path: 'donor',
          populate: { path: 'user', select: 'name' }
        })
        .populate({
          path: 'request',
          populate: { path: 'hospital', select: 'name' }
        });
      
      // Notify all users in the match room
      this.io.to(`match:${matchId}`).emit('match:updated', populatedMatch);
      
      // Also notify the related request room
      this.io.to(`request:${match.request}`).emit('request:matchUpdated', {
        requestId: match.request,
        matchId: match._id,
        status
      });
      
      // Notify donor if they're online
      const donorUserId = populatedMatch.donor.user._id.toString();
      if (this.connectedUsers.has(donorUserId)) {
        this.io.to(`user:${donorUserId}`).emit('notification', {
          type: 'match',
          message: `Your match status has been updated to: ${status}`,
          data: { matchId }
        });
      }
      
      // If match is confirmed or rejected, update all other matches for this request
      if (['confirmed', 'rejected'].includes(status)) {
        this.handleMatchStatusSideEffects(match, status);
      }
    } catch (err) {
      console.error('Error updating match status:', err);
      socket.emit('error', { message: 'Failed to update match status' });
    }
  }

  /**
   * Handle side effects of match status updates
   * @param {Object} match - Match object
   * @param {String} status - New status
   */
  async handleMatchStatusSideEffects(match, status) {
    try {
      if (status === 'confirmed') {
        // Update request status
        await Request.findByIdAndUpdate(match.request, { status: 'matched' });
        
        // Update other matches for this request to "rejected"
        const otherMatches = await Match.find({
          request: match.request,
          _id: { $ne: match._id },
          status: { $nin: ['rejected', 'failed'] }
        });
        
        for (const otherMatch of otherMatches) {
          otherMatch.status = 'rejected';
          otherMatch.rejectionReason = 'Another match was confirmed';
          await otherMatch.save();
          
          // Notify other donors
          this.io.to(`match:${otherMatch._id}`).emit('match:updated', otherMatch);
        }
      }
    } catch (err) {
      console.error('Error handling match side effects:', err);
    }
  }

  /**
   * Handle tracking updates for donations in transit
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Tracking data
   */
  async handleTrackingUpdate(socket, data) {
    try {
      const { matchId, location, status, estimatedArrival } = data;
      
      const match = await Match.findById(matchId);
      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }
      
      // Only coordinators or authorized transport personnel can update tracking
      if (!['coordinator', 'admin'].includes(socket.user.role)) {
        socket.emit('error', { message: 'Not authorized to update tracking' });
        return;
      }
      
      // Update tracking information
      if (!match.logistics) {
        match.logistics = {};
      }
      
      if (!match.logistics.trackingInfo) {
        match.logistics.trackingInfo = {};
      }
      
      if (location) {
        match.logistics.trackingInfo.currentLocation = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        };
      }
      
      match.logistics.trackingInfo.lastUpdated = new Date();
      
      if (status) {
        match.status = status;
      }
      
      if (estimatedArrival) {
        match.logistics.estimatedArrival = new Date(estimatedArrival);
      }
      
      await match.save();
      
      // Broadcast update to all subscribers
      this.io.to(`match:${matchId}`).emit('tracking:updated', {
        matchId,
        status: match.status,
        location: match.logistics.trackingInfo.currentLocation,
        lastUpdated: match.logistics.trackingInfo.lastUpdated,
        estimatedArrival: match.logistics.estimatedArrival
      });
    } catch (err) {
      console.error('Error updating tracking:', err);
      socket.emit('error', { message: 'Failed to update tracking information' });
    }
  }

  /**
   * Handle chat messages between users
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Message data
   */
  handleChatMessage(socket, data) {
    const { recipientId, matchId, message } = data;
    const senderId = socket.user.id;
    const senderName = socket.user.name;
    
    const timestamp = new Date();
    const messageData = {
      sender: { id: senderId, name: senderName },
      message,
      timestamp
    };
    
    // Send direct message if recipient ID is provided
    if (recipientId) {
      const recipientSocketId = this.connectedUsers.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('chat:message', {
          ...messageData,
          isDirectMessage: true
        });
      }
      
      // Also send confirmation back to sender
      socket.emit('chat:sent', {
        recipientId,
        timestamp
      });
    }
    
    // Send to match room if match ID is provided
    if (matchId) {
      this.io.to(`match:${matchId}`).emit('chat:message', {
        ...messageData,
        matchId
      });
    }
  }

  /**
   * Handle chat typing indicator
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Typing data
   */
  handleChatTyping(socket, data) {
    const { recipientId, matchId, isTyping } = data;
    const senderId = socket.user.id;
    const senderName = socket.user.name;
    
    const typingData = {
      sender: { id: senderId, name: senderName },
      isTyping
    };
    
    // Send to direct recipient
    if (recipientId) {
      const recipientSocketId = this.connectedUsers.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('chat:typing', {
          ...typingData,
          isDirectMessage: true
        });
      }
    }
    
    // Send to match room
    if (matchId) {
      socket.to(`match:${matchId}`).emit('chat:typing', {
        ...typingData,
        matchId
      });
    }
  }

  /**
   * Handle hospital capacity updates
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Capacity data
   */
  async handleHospitalCapacityUpdate(socket, data) {
    try {
      const userId = socket.user.id;
      const { capacity } = data;
      
      const hospital = await Hospital.findOne({ user: userId });
      if (!hospital) {
        socket.emit('error', { message: 'Hospital profile not found' });
        return;
      }
      
      // Update hospital capacity
      hospital.capacity = {
        ...hospital.capacity,
        ...capacity
      };
      
      await hospital.save();
      
      // Broadcast to admins and coordinators
      this.io.to('admin').to('coordinator').emit('hospital:capacityUpdated', {
        hospitalId: hospital._id,
        name: hospital.name,
        capacity: hospital.capacity
      });
      
      socket.emit('hospital:capacityUpdated', {
        success: true,
        capacity: hospital.capacity
      });
    } catch (err) {
      console.error('Error updating hospital capacity:', err);
      socket.emit('error', { message: 'Failed to update hospital capacity' });
    }
  }

  /**
   * Handle donor availability updates
   * @param {Object} socket - Socket.io socket
   * @param {Object} data - Availability data
   */
  async handleDonorAvailabilityUpdate(socket, data) {
    try {
      const userId = socket.user.id;
      const { isAvailable, availabilitySchedule, organUpdates } = data;
      
      const donor = await Donor.findOne({ user: userId });
      if (!donor) {
        socket.emit('error', { message: 'Donor profile not found' });
        return;
      }
      
      // Update availability
      if (isAvailable !== undefined) {
        donor.isAvailable = isAvailable;
      }
      
      if (availabilitySchedule) {
        donor.availabilitySchedule = availabilitySchedule;
      }
      
      // Update organ availability if provided
      if (organUpdates && Array.isArray(organUpdates)) {
        organUpdates.forEach(update => {
          const organIndex = donor.organDonatable.findIndex(
            o => o.organType === update.organType
          );
          
          if (organIndex !== -1) {
            donor.organDonatable[organIndex].isAvailable = update.isAvailable;
            
            // Leave organ-specific room if no longer available
            if (!update.isAvailable) {
              socket.leave(`organ:${update.organType}`);
            } else {
              socket.join(`organ:${update.organType}`);
            }
          }
        });
      }
      
      await donor.save();
      
      // Notify coordinators
      this.io.to('coordinator').emit('donor:availabilityUpdated', {
        donorId: donor._id,
        isAvailable: donor.isAvailable,
        organDonatable: donor.organDonatable
      });
      
      socket.emit('donor:availabilityUpdated', {
        success: true,
        isAvailable: donor.isAvailable,
        availabilitySchedule: donor.availabilitySchedule,
        organDonatable: donor.organDonatable
      });
    } catch (err) {
      console.error('Error updating donor availability:', err);
      socket.emit('error', { message: 'Failed to update donor availability' });
    }
  }

  /**
   * Broadcast new request to potential donors
   * @param {Object} request - Request object
   */
  broadcastNewRequest(request) {
    try {
      // For blood requests
      if (request.requestType === 'blood') {
        // Compatible blood types mapping
        const compatibleTypes = {
          'A+': ['A+', 'A-', 'O+', 'O-'],
          'A-': ['A-', 'O-'],
          'B+': ['B+', 'B-', 'O+', 'O-'],
          'B-': ['B-', 'O-'],
          'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
          'AB-': ['A-', 'B-', 'AB-', 'O-'],
          'O+': ['O+', 'O-'],
          'O-': ['O-']
        };
        
        const recipientType = request.bloodType;
        if (recipientType && compatibleTypes[recipientType]) {
          // Broadcast to compatible blood types
          compatibleTypes[recipientType].forEach(bloodType => {
            this.io.to(`bloodType:${bloodType}`).emit('request:new', {
              type: 'blood',
              requestId: request._id,
              urgencyLevel: request.recipientDetails.urgencyLevel,
              bloodComponent: request.bloodComponent,
              hospitalName: request.hospital.name
            });
          });
        }
      } 
      // For organ requests
      else if (request.requestType === 'organ') {
        this.io.to(`organ:${request.organType}`).emit('request:new', {
          type: 'organ',
          requestId: request._id,
          organType: request.organType,
          urgencyLevel: request.recipientDetails.urgencyLevel,
          hospitalName: request.hospital.name
        });
      }
      
      // Broadcast to coordinators
      this.io.to('coordinator').emit('request:new', {
        requestId: request._id,
        type: request.requestType,
        urgencyLevel: request.recipientDetails.urgencyLevel,
        requiredBy: request.requiredBy,
        hospitalName: request.hospital.name
      });
    } catch (err) {
      console.error('Error broadcasting new request:', err);
    }
  }

  /**
   * Notify users about new match
   * @param {Object} match - Match object with populated fields
   */
  notifyNewMatch(match) {
    try {
      // Create notification data
      const notificationData = {
        matchId: match._id,
        requestId: match.request._id,
        matchScore: match.matchScore,
        status: match.status
      };
      
      // Notify hospital
      this.io.to(`hospital:${match.request.hospital}`).emit('match:new', {
        ...notificationData,
        donorName: match.donor.user.name,
        bloodType: match.donor.bloodType
      });
      
      // Notify donor if they're connected
      const donorUserId = match.donor.user._id.toString();
      if (this.connectedUsers.has(donorUserId)) {
        this.io.to(`user:${donorUserId}`).emit('match:new', {
          ...notificationData,
          hospitalName: match.request.hospital.name,
          requestType: match.request.requestType,
          urgencyLevel: match.request.recipientDetails.urgencyLevel
        });
      }
      
      // Notify coordinators
      this.io.to('coordinator').emit('match:new', {
        ...notificationData,
        hospitalName: match.request.hospital.name,
        donorName: match.donor.user.name,
        requestType: match.request.requestType
      });
    } catch (err) {
      console.error('Error notifying about new match:', err);
    }
  }

  /**
   * Broadcast emergency alerts
   * @param {Object} alert - Alert data
   */
  broadcastEmergencyAlert(alert) {
    try {
      const { type, bloodType, organType, hospitalId, message, location } = alert;
      
      // Broadcast based on type
      if (type === 'blood') {
        // Compatible blood types mapping (same as in broadcastNewRequest)
        const compatibleTypes = {
          'A+': ['A+', 'A-', 'O+', 'O-'],
          'A-': ['A-', 'O-'],
          'B+': ['B+', 'B-', 'O+', 'O-'],
          'B-': ['B-', 'O-'],
          'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
          'AB-': ['A-', 'B-', 'AB-', 'O-'],
          'O+': ['O+', 'O-'],
          'O-': ['O-']
        };
        
        if (bloodType && compatibleTypes[bloodType]) {
          compatibleTypes[bloodType].forEach(bType => {
            this.io.to(`bloodType:${bType}`).emit('alert:emergency', {
              type: 'blood',
              bloodType,
              hospitalId,
              message,
              location
            });
          });
        }
      } else if (type === 'organ') {
        this.io.to(`organ:${organType}`).emit('alert:emergency', {
          type: 'organ',
          organType,
          hospitalId,
          message,
          location
        });
      }
      
      // Also notify coordinators and admins
      this.io.to('coordinator').to('admin').emit('alert:emergency', {
        type,
        bloodType,
        organType,
        hospitalId,
        message,
        location,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error broadcasting emergency alert:', err);
    }
  }
}

module.exports = SocketManager;