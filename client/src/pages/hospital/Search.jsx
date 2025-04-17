import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { hospitalAPI } from '../../services/api';

const validationSchema = Yup.object({
  location: Yup.string().required('Location is required'),
  specialization: Yup.string().required('Specialization is required'),
});

export default function HospitalSearch() {
  const { user } = useSelector((state) => state.auth);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const initialValues = {
    location: '',
    specialization: '',
  };

  const handleSearch = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      const response = await hospitalAPI.searchHospitals(values);
      setSearchResults(response.data);
      if (response.data.length === 0) {
        toast.info('No hospitals found matching your criteria');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to search hospitals');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const specializations = [
    'General',
    'Cardiac',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Oncology',
    'Transplant',
    'Emergency',
    'Trauma',
    'Research'
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Search Hospitals</h1>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSearch}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="specialization"
                  >
                    Specialization
                  </label>
                  <Field
                    as="select"
                    id="specialization"
                    name="specialization"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.specialization && touched.specialization ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">Select Specialization</option>
                    {specializations.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </Field>
                  {errors.specialization && touched.specialization && (
                    <p className="text-red-500 text-xs italic">{errors.specialization}</p>
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
              {searchResults.map((hospital) => (
                <div
                  key={hospital._id}
                  className="border rounded p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{hospital.name}</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      {hospital.specialization}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <p>Location: {hospital.address}</p>
                    <p>Phone: {hospital.phone}</p>
                    <p>Email: {hospital.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hospital.facilities.map((facility) => (
                      <span
                        key={facility}
                        className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = `mailto:${hospital.email}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Contact Hospital
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