import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { donorAPI } from '../../services/api';
import toast from 'react-hot-toast';

const donationSchema = Yup.object().shape({
  donationType: Yup.string().oneOf(['blood', 'organ']).required('Please select a donation type'),
  bloodType: Yup.string().when('donationType', {
    is: (val) => val === 'blood',
    then: () => Yup.string().required('Blood type is required for blood donation'),
    otherwise: () => Yup.string(),
  }),
  organType: Yup.string().when('donationType', {
    is: (val) => val === 'organ',
    then: () => Yup.string().required('Organ type is required for organ donation'),
    otherwise: () => Yup.string(),
  }),
  urgency: Yup.string().oneOf(['low', 'medium', 'high']).required('Please select urgency level'),
  description: Yup.string().required('Please provide a description'),
});

export default function DonorDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [donationType, setDonationType] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const response = await donorAPI.getDonationHistory(user._id);
        setRequests(response.data);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const handleDonationSubmit = async (values, { resetForm }) => {
    if (!user?._id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      await donorAPI.createDonationRequest({
        ...values,
        donorId: user._id,
      });
      toast.success('Donation request submitted successfully');
      resetForm();
      setShowDonationForm(false);
      setDonationType(null);
      // Refresh the requests list
      const response = await donorAPI.getDonationHistory(user._id);
      setRequests(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit donation request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Donor Dashboard</h1>
        <Link
          to="/donor/profile"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Complete Profile
        </Link>
      </div>

      {!showDonationForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donate Option */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">I Want to Donate</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setDonationType('blood');
                  setShowDonationForm(true);
                }}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Donate Blood
              </button>
              <button
                onClick={() => {
                  setDonationType('organ');
                  setShowDonationForm(true);
                }}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Donate Organ
              </button>
            </div>
          </div>

          {/* Request Transplant Option */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">I Need a Transplant</h2>
            <div className="space-y-4">
              <Link
                to="/donor/request-transplant"
                className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Request Transplant
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {donationType === 'blood' ? 'Blood Donation Request' : 'Organ Donation Request'}
            </h2>
            <button
              onClick={() => {
                setShowDonationForm(false);
                setDonationType(null);
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <Formik
            initialValues={{
              donationType,
              bloodType: '',
              organType: '',
              urgency: 'medium',
              description: '',
            }}
            validationSchema={donationSchema}
            onSubmit={handleDonationSubmit}
          >
            {({ errors, touched }) => (
              <Form className="space-y-4">
                {donationType === 'blood' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                    <Field
                      as="select"
                      name="bloodType"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select Blood Type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </Field>
                    {errors.bloodType && touched.bloodType && (
                      <p className="mt-1 text-sm text-red-600">{errors.bloodType}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organ Type</label>
                    <Field
                      as="select"
                      name="organType"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select Organ Type</option>
                      <option value="kidney">Kidney</option>
                      <option value="liver">Liver</option>
                      <option value="heart">Heart</option>
                      <option value="lung">Lung</option>
                      <option value="pancreas">Pancreas</option>
                    </Field>
                    {errors.organType && touched.organType && (
                      <p className="mt-1 text-sm text-red-600">{errors.organType}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Urgency Level</label>
                  <Field
                    as="select"
                    name="urgency"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Field>
                  {errors.urgency && touched.urgency && (
                    <p className="mt-1 text-sm text-red-600">{errors.urgency}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <Field
                    as="textarea"
                    name="description"
                    rows="4"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Please provide any additional information..."
                  />
                  {errors.description && touched.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Submit Request
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Recent Requests */}
      <div className="bg-white p-6 rounded-lg shadow-md">
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
                      {request.hospital?.name || 'Hospital name not available'}
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
                  {request.description || 'No description available'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No recent requests</p>
        )}
      </div>
    </div>
  );
} 