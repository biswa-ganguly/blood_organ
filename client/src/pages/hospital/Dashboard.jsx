import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { hospitalAPI } from '../../services/api';

export default function HospitalDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await hospitalAPI.getRequests();
        setRequests(response.data);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hospital Dashboard</h1>
        <Link
          to="/hospital/profile"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Complete Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link
              to="/hospital/search"
              className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Find Donors
            </Link>
            <Link
              to="/hospital/profile"
              className="block w-full text-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Update Profile
            </Link>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Recent Requests</h2>
          {loading ? (
            <p>Loading requests...</p>
          ) : requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{request.type}</h3>
                      <p className="text-sm text-gray-600">
                        {request.donor.name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {request.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent requests</p>
          )}
        </div>
      </div>
    </div>
  );
} 