/**
 * Notifications Utility
 * 
 * This file contains functions for sending notifications through various channels:
 * - Email
 * - SMS
 * - Push notifications
 * - In-app notifications (via WebSockets)
 */

const nodemailer = require('nodemailer');
const User = require('../models/User');
const socketManager = require('../websocket/socketManager');

// Configure email transporter (update with actual credentials in production)
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'notifications@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  }
});

// SMS provider configuration (example using Twilio)
let smsClient;
try {
  const twilio = require('twilio');
  smsClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} catch (error) {
  console.warn('Twilio not configured, SMS notifications will be logged only.');
}

/**
 * Send an email notification
 * @param {String} to - Recipient email address
 * @param {String} subject - Email subject
 * @param {String} text - Plain text email body
 * @param {String} html - HTML email body (optional)
 * @returns {Promise} - Email send result
 */
const sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Donation System'} <${process.env.EMAIL_FROM_ADDRESS || 'notifications@example.com'}>`,
      to,
      subject,
      text,
      html: html || text
    };
    
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send an SMS notification
 * @param {String} to - Recipient phone number
 * @param {String} message - SMS message text
 * @returns {Promise} - SMS send result
 */
const sendSMS = async (to, message) => {
  try {
    if (!smsClient) {
      console.log('SMS would be sent to:', to, 'Message:', message);
      return { simulated: true };
    }
    
    const result = await smsClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    
    console.log('SMS sent:', result.sid);
    return result;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

/**
 * Send a push notification (placeholder - implement with Firebase or similar service)
 * @param {String} userId - User ID to send notification to
 * @param {Object} notification - Notification object with title and body
 * @returns {Promise} - Push notification result
 */
const sendPushNotification = async (userId, notification) => {
  try {
    // Placeholder for push notification implementation
    console.log(`Push notification would be sent to user ${userId}:`, notification);
    return { simulated: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send an in-app notification via WebSocket
 * @param {String} userId - User ID to send notification to
 * @param {Object} notification - Notification object
 * @returns {Boolean} - Whether notification was sent
 */
const sendSocketNotification = (userId, notification) => {
  try {
    // Add timestamp to notification
    const notificationWithTimestamp = {
      ...notification,
      timestamp: new Date()
    };
    
    // Send to user via WebSocket
    return socketManager.sendNotificationToUser(userId, notificationWithTimestamp);
  } catch (error) {
    console.error('Error sending socket notification:', error);
    return false;
  }
};

/**
 * Send a notification to a user through their preferred method
 * @param {String} userId - User ID to notify
 * @param {Object} notification - Notification with subject, message, and type
 * @returns {Promise<Object>} - Results of notification attempts
 */
const notifyUser = async (userId, notification) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    const results = {
      inApp: false,
      email: null,
      sms: null,
      push: null
    };
    
    // Always send in-app notification
    results.inApp = sendSocketNotification(userId, {
      type: notification.type,
      title: notification.subject,
      message: notification.message,
      data: notification.data
    });
    
    // Check donor contactPreferences if user is a donor
    if (user.role === 'donor' && notification.checkPreferences) {
      const Donor = require('../models/Donor');
      const donor = await Donor.findOne({ user: userId });
      
      if (donor && donor.contactPreferences && donor.contactPreferences.method) {
        if (donor.contactPreferences.method === 'email') {
          results.email = await sendEmail(
            user.email,
            notification.subject,
            notification.message,
            notification.html
          );
        } else if (donor.contactPreferences.method === 'sms' || donor.contactPreferences.method === 'phone') {
          results.sms = await sendSMS(user.phone, notification.message);
        }
        return results;
      }
    }
    
    // Default behavior - send email for all notifications
    if (notification.type === 'urgent' || notification.type === 'critical') {
      // For urgent notifications, try all channels
      try {
        results.email = await sendEmail(
          user.email,
          notification.subject,
          notification.message,
          notification.html
        );
      } catch (e) {
        console.error('Failed to send urgent email:', e);
      }
      
      try {
        results.sms = await sendSMS(user.phone, notification.message);
      } catch (e) {
        console.error('Failed to send urgent SMS:', e);
      }
      
      try {
        results.push = await sendPushNotification(userId, {
          title: notification.subject,
          body: notification.message
        });
      } catch (e) {
        console.error('Failed to send urgent push notification:', e);
      }
    } else {
      // For regular notifications, just send email
      results.email = await sendEmail(
        user.email,
        notification.subject,
        notification.message,
        notification.html
      );
    }
    
    return results;
  } catch (error) {
    console.error('Error notifying user:', error);
    throw error;
  }
};

/**
 * Notify about a new match
 * @param {Object} match - Match object (populated with request and donor)
 * @returns {Promise<Object>} - Notification results
 */
const notifyAboutMatch = async (match) => {
  try {
    // Ensure match is fully populated
    const populatedMatch = await match.populate([
      { path: 'request', populate: { path: 'hospital' } },
      { path: 'donor', populate: { path: 'user' } }
    ]);
    
    const request = populatedMatch.request;
    const donor = populatedMatch.donor;
    const hospital = request.hospital;
    
    // Notify hospital about the match
    const hospitalNotification = {
      type: 'match',
      subject: `New ${request.requestType} donation match found!`,
      message: `A potential ${request.requestType} donor has been matched to your request. ` +
        `Match score: ${match.matchScore}/100. Please review and confirm this match.`,
      html: `<h2>New donation match found!</h2>
        <p>A potential ${request.requestType} donor has been matched to your request.</p>
        <ul>
          <li><strong>Request Type:</strong> ${request.requestType}</li>
          ${request.requestType === 'blood' ? 
            `<li><strong>Blood Type:</strong> ${request.bloodType}</li>
             <li><strong>Component:</strong> ${request.bloodComponent}</li>` : 
            `<li><strong>Organ Type:</strong> ${request.organType}</li>`}
          <li><strong>Match Score:</strong> ${match.matchScore}/100</li>
          <li><strong>Distance:</strong> ${match.matchFactors.distanceKm} km</li>
          <li><strong>Est. Transport Time:</strong> ${match.matchFactors.timeToTransport} minutes</li>
        </ul>
        <p>Please <a href="${process.env.APP_URL || 'http://localhost:3000'}/matches/${match._id}">review and confirm this match</a>.</p>`,
      data: {
        matchId: match._id.toString(),
        requestId: request._id.toString()
      }
    };
    
    const hospitalResults = await notifyUser(hospital.user, hospitalNotification);
    
    // Notify donor about the match
    const donorNotification = {
      type: 'match',
      subject: `You've been matched for a ${request.requestType} donation!`,
      message: `You've been matched as a potential donor for a ${request.requestType} donation request from ${hospital.name}. Please review and confirm your availability.`,
      html: `<h2>Donation match found!</h2>
        <p>You've been matched as a potential donor for a ${request.requestType} donation request from ${hospital.name}.</p>
        <ul>
          <li><strong>Request Type:</strong> ${request.requestType}</li>
          ${request.requestType === 'blood' ? 
            `<li><strong>Blood Type Requested:</strong> ${request.bloodType}</li>
             <li><strong>Component:</strong> ${request.bloodComponent}</li>` : 
            `<li><strong>Organ Type:</strong> ${request.organType}</li>`}
          <li><strong>Hospital:</strong> ${hospital.name}</li>
          <li><strong>Location:</strong> ${hospital.location.address.city}, ${hospital.location.address.state}</li>
          <li><strong>Distance:</strong> ${match.matchFactors.distanceKm} km</li>
        </ul>
        <p>Please <a href="${process.env.APP_URL || 'http://localhost:3000'}/donations/matches/${match._id}">review and confirm your availability</a>.</p>`,
      data: {
        matchId: match._id.toString(),
        hospitalName: hospital.name,
        hospitalId: hospital._id.toString()
      },
      checkPreferences: true
    };
    
    const donorResults = await notifyUser(donor.user._id, donorNotification);
    
    return {
      hospital: hospitalResults,
      donor: donorResults
    };
  } catch (error) {
    console.error('Error notifying about match:', error);
    throw error;
  }
};

/**
 * Notify about request status changes
 * @param {Object} request - Request object
 * @param {String} previousStatus - Previous status
 * @returns {Promise<Object>} - Notification results
 */
const notifyRequestStatusChange = async (request, previousStatus) => {
  try {
    const populatedRequest = await request.populate('hospital');
    const hospital = populatedRequest.hospital;
    
    const statusMessages = {
      pending: 'Your request is pending review.',
      searching: 'We are actively searching for donors for your request.',
      matched: 'A potential donor match has been found for your request.',
      in_progress: 'Your request is now in progress. Donation has been confirmed.',
      completed: 'Your request has been completed successfully.',
      cancelled: 'Your request has been cancelled.'
    };
    
    const notification = {
      type: request.status === 'matched' ? 'match' : 'status',
      subject: `Request Status Update: ${request.status}`,
      message: `Your ${request.requestType} request status has changed from ${previousStatus} to ${request.status}. ${statusMessages[request.status] || ''}`,
      data: {
        requestId: request._id.toString(),
        newStatus: request.status,
        previousStatus
      }
    };
    
    return await notifyUser(hospital.user, notification);
  } catch (error) {
    console.error('Error notifying request status change:', error);
    throw error;
  }
};

/**
 * Send verification email to user
 * @param {Object} user - User object
 * @param {String} token - Verification token
 * @returns {Promise} - Email send result
 */
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  return await sendEmail(
    user.email,
    'Verify Your Email Address',
    `Please verify your email address by clicking the following link: ${verificationUrl}`,
    `<h2>Welcome to the Donation Management System!</h2>
    <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
    <p>
      <a href="${verificationUrl}" 
         style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
         Verify Email Address
      </a>
    </p>
    <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
    <p>${verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>`
  );
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {String} token - Reset token
 * @returns {Promise} - Email send result
 */
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  return await sendEmail(
    user.email,
    'Reset Your Password',
    `You requested a password reset. Please click the following link to reset your password: ${resetUrl}. This link will expire in 1 hour.`,
    `<h2>Password Reset Request</h2>
    <p>You requested a password reset. Please click the button below to reset your password:</p>
    <p>
      <a href="${resetUrl}" 
         style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
         Reset Password
      </a>
    </p>
    <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
    <p>${resetUrl}</p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, you can ignore this email.</p>`
  );
};

/**
 * Send emergency notification to hospital and coordinators
 * @param {String} hospitalId - Hospital ID
 * @param {Object} emergency - Emergency details
 * @returns {Promise<Array>} - Notification results
 */
const sendEmergencyNotification = async (hospitalId, emergency) => {
    try {
      const hospital = await Hospital.findById(hospitalId).populate('user');
      if (!hospital) {
        throw new Error(`Hospital not found: ${hospitalId}`);
      }
      
      // Notify the hospital
      const hospitalNotification = {
        type: 'emergency',
        subject: `URGENT: ${emergency.type} Emergency Notification`,
        message: emergency.message,
        html: `<h2 style="color: #d9534f;">URGENT: ${emergency.type} Emergency</h2>
          <p>${emergency.message}</p>
          <p><strong>Location:</strong> ${emergency.location || 'N/A'}</p>
          <p><strong>Severity:</strong> ${emergency.severity || 'High'}</p>
          <p><strong>Action Required:</strong> ${emergency.actionRequired || 'Please respond immediately'}</p>`,
        data: emergency
      };
      
      const hospitalResult = await notifyUser(hospital.user._id, hospitalNotification);
      
      // Find coordinators to notify
      const coordinators = await User.find({ role: 'coordinator' });
      
      // Notify all coordinators
      const coordinatorResults = await Promise.all(
        coordinators.map(coordinator => 
          notifyUser(coordinator._id, hospitalNotification)
        )
      );
      
      return [hospitalResult, ...coordinatorResults];
    } catch (error) {
      console.error('Error sending emergency notification:', error);
      throw error;
    }
  };
  
  /**
   * Notify about match status changes
   * @param {Object} match - Match object
   * @param {String} previousStatus - Previous status
   * @returns {Promise<Object>} - Notification results
   */
  const notifyMatchStatusChange = async (match, previousStatus) => {
    try {
      const populatedMatch = await match.populate([
        { path: 'request', populate: { path: 'hospital', populate: { path: 'user' } } },
        { path: 'donor', populate: { path: 'user' } }
      ]);
      
      const request = populatedMatch.request;
      const donor = populatedMatch.donor;
      const hospital = request.hospital;
      
      // Status-specific message details
      const statusInfo = {
        proposed: {
          title: 'New Match Proposed',
          hospitalMsg: 'A new donor match has been proposed for your request.',
          donorMsg: 'You have been proposed as a potential donor match.'
        },
        pending_confirmation: {
          title: 'Awaiting Confirmation',
          hospitalMsg: 'The match is pending donor confirmation.',
          donorMsg: 'Please confirm your availability for this donation.'
        },
        confirmed: {
          title: 'Match Confirmed',
          hospitalMsg: 'The donor has confirmed availability for the donation.',
          donorMsg: 'You have confirmed your availability for the donation.'
        },
        rejected: {
          title: 'Match Declined',
          hospitalMsg: 'The donor has declined this donation match.',
          donorMsg: 'You have declined this donation match.'
        },
        in_transit: {
          title: 'Donation In Transit',
          hospitalMsg: 'The donation is now in transit to your facility.',
          donorMsg: 'Your donation is now in transit to the hospital.'
        },
        delivered: {
          title: 'Donation Delivered',
          hospitalMsg: 'The donation has been delivered to your facility.',
          donorMsg: 'Your donation has been delivered to the hospital.'
        },
        transplanted: {
          title: 'Transplant Complete',
          hospitalMsg: 'The transplant procedure has been completed.',
          donorMsg: 'The transplant procedure using your donation has been completed.'
        },
        failed: {
          title: 'Match Failed',
          hospitalMsg: 'Unfortunately, this match has failed.',
          donorMsg: 'Unfortunately, this donation match has failed.'
        }
      };
      
      const info = statusInfo[match.status] || {
        title: `Status Update: ${match.status}`,
        hospitalMsg: `The match status has changed to ${match.status}.`,
        donorMsg: `The match status has changed to ${match.status}.`
      };
      
      // Notify hospital
      const hospitalNotification = {
        type: 'match_update',
        subject: info.title,
        message: `Match status changed from ${previousStatus} to ${match.status}. ${info.hospitalMsg}`,
        html: `<h2>Match Status Update</h2>
          <p>Match ID: ${match._id}</p>
          <p>Status changed from <strong>${previousStatus}</strong> to <strong>${match.status}</strong>.</p>
          <p>${info.hospitalMsg}</p>
          ${match.status === 'in_transit' && match.logistics ? 
            `<p><strong>Estimated Arrival:</strong> ${new Date(match.logistics.estimatedArrival).toLocaleString()}</p>` : ''}
          ${match.status === 'rejected' && match.rejectionReason ? 
            `<p><strong>Rejection Reason:</strong> ${match.rejectionReason}</p>` : ''}`,
        data: {
          matchId: match._id.toString(),
          requestId: request._id.toString(),
          newStatus: match.status,
          previousStatus
        }
      };
      
      // Notify donor
      const donorNotification = {
        type: 'match_update',
        subject: info.title,
        message: `Match status changed from ${previousStatus} to ${match.status}. ${info.donorMsg}`,
        html: `<h2>Match Status Update</h2>
          <p>Your donation match with ${hospital.name} has been updated.</p>
          <p>Status changed from <strong>${previousStatus}</strong> to <strong>${match.status}</strong>.</p>
          <p>${info.donorMsg}</p>
          ${match.status === 'confirmed' ? 
            `<h3>Next Steps</h3>
             <p>The hospital will contact you with further instructions.</p>` : ''}`,
        data: {
          matchId: match._id.toString(),
          hospitalId: hospital._id.toString(),
          hospitalName: hospital.name,
          newStatus: match.status,
          previousStatus
        },
        checkPreferences: true
      };
      
      const results = {
        hospital: await notifyUser(hospital.user._id, hospitalNotification),
        donor: await notifyUser(donor.user._id, donorNotification)
      };
      
      return results;
    } catch (error) {
      console.error('Error notifying about match status change:', error);
      throw error;
    }
  };
  
  module.exports = {
    sendEmail,
    sendSMS,
    sendPushNotification,
    sendSocketNotification,
    notifyUser,
    notifyAboutMatch,
    notifyRequestStatusChange,
    notifyMatchStatusChange,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendEmergencyNotification
  };