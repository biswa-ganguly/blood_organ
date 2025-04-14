module.exports = {
    // Check user role
    checkRole: (roles) => {
      return (req, res, next) => {
        if (!req.user) {
          return res.status(401).json({ message: 'Unauthorized' });
        }
  
        const hasRole = roles.find(role => req.user.role === role);
        if (!hasRole) {
          return res.status(403).json({ message: 'Access forbidden: insufficient permissions' });
        }
  
        next();
      };
    },
  
    // Role constants
    ROLES: {
      ADMIN: 'admin',
      DONOR: 'donor',
      HOSPITAL: 'hospital',
      COORDINATOR: 'coordinator'
    }
  };