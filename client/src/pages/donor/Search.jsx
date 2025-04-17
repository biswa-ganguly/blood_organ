import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { donorAPI } from '../../services/api';

const validationSchema = Yup.object({
  bloodType: Yup.string().required('Blood type is required'),
  organType: Yup.string().required('Organ type is required'),
  location: Yup.string().required('Location is required'),
});

export default function DonorSearch() {
  const { user } = useSelector((state) => state.auth);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const initialValues = {
    bloodType: '',
    organType: '',
    location: '',
  };

  const handleSearch = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      const response = await donorAPI.searchDonors(values);
      setSearchResults(response.data);
      if (response.data.length === 0) {
        toast.info('No donors found matching your criteria');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to search donors');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const bloodTypes = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ];

  const organTypes = [
    'Heart', 'Lungs', 'Liver', 'Kidneys', 'Pancreas', 'Intestines', 'Bone Marrow', 'Corneas', 'Skin', 'Tissue'
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Search Donors</h1>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSearch}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="bloodType"
                  >
                    Blood Type
                  </label>
                  <Field
                    as="select"
                    id="bloodType"
                    name="bloodType"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.bloodType && touched.bloodType ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">Select Blood Type</option>
                    {bloodTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Field>
                  {errors.bloodType && touched.bloodType && (
                    <p className="text-red-500 text-xs italic">{errors.bloodType}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="organType"
                  >
                    Organ Type
                  </label>
                  <Field
                    as="select"
                    id="organType"
                    name="organType"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.organType && touched.organType ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">Select Organ Type</option>
                    {organTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Field>
                  {errors.organType && touched.organType && (
                    <p className="text-red-500 text-xs italic">{errors.organType}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="location"
                  >
                    Location
                  </label>
                  <Field
                    id="location"
                    name="location"
                    type="text"
                    placeholder="Enter city or state"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.location && touched.location ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.location && touched.location && (
                    <p className="text-red-500 text-xs italic">{errors.location}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                >
                  {isSubmitting || loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </Form>
          )}
        </Formik>

        {searchResults.length > 0 && (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((donor) => (
                <div
                  key={donor._id}
                  className="border rounded p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{donor.name}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      {donor.bloodType}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <p>Location: {donor.address}</p>
                    <p>Phone: {donor.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {donor.organTypes.map((type) => (
                      <span
                        key={type}
                        className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = `mailto:${donor.email}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Contact Donor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 