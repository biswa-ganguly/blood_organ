import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const [role, setRole] = useState(user?.role || 'donor');

  useEffect(() => {
    if (user?.role) {
      setRole(user.role);
    }
  }, [user]);

  const renderDashboardContent = () => {
    switch (role) {
      case 'donor':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Donor Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
                <p className="mb-4">Manage your donor profile and preferences.</p>
                <Link
                  to="/donor/profile"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Profile
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Find Hospitals</h3>
                <p className="mb-4">Search for hospitals that need blood or organs.</p>
                <Link
                  to="/donor/search"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Search Hospitals
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Your Donations</h3>
                <p className="mb-4">View your donation history and upcoming donations.</p>
                <Link
                  to="/donor/donations"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Donations
                </Link>
              </div>
            </div>
          </div>
        );
      case 'hospital':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Hospital Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Hospital Profile</h3>
                <p className="mb-4">Manage your hospital profile and information.</p>
                <Link
                  to="/hospital/profile"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Profile
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Find Donors</h3>
                <p className="mb-4">Search for available blood and organ donors.</p>
                <Link
                  to="/hospital/search"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Search Donors
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Requests</h3>
                <p className="mb-4">Manage your blood and organ requests.</p>
                <Link
                  to="/hospital/requests"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Requests
                </Link>
              </div>
            </div>
          </div>
        );
      case 'coordinator':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Coordinator Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Manage Donors</h3>
                <p className="mb-4">View and manage donor registrations.</p>
                <Link
                  to="/coordinator/donors"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Donors
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Manage Hospitals</h3>
                <p className="mb-4">View and manage hospital registrations.</p>
                <Link
                  to="/coordinator/hospitals"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Hospitals
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Reports</h3>
                <p className="mb-4">Generate and view system reports.</p>
                <Link
                  to="/coordinator/reports"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Reports
                </Link>
              </div>
            </div>
          </div>
        );
      case 'admin':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">User Management</h3>
                <p className="mb-4">Manage all users in the system.</p>
                <Link
                  to="/admin/users"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Manage Users
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">System Settings</h3>
                <p className="mb-4">Configure system-wide settings.</p>
                <Link
                  to="/admin/settings"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  System Settings
                </Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Analytics</h3>
                <p className="mb-4">View system analytics and reports.</p>
                <Link
                  to="/admin/analytics"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Analytics
                </Link>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome to Blood & Organ Donation System</h2>
            <p className="mt-4">Please select your role to continue.</p>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {renderDashboardContent()}
    </div>
  );
} 