import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { updateProfile } from '../../store/slices/authSlice';

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  phone: Yup.string().required('Phone number is required'),
  address: Yup.string().required('Address is required'),
  bloodType: Yup.string().required('Blood type is required'),
  organTypes: Yup.array().min(1, 'Select at least one organ type'),
  lastDonationDate: Yup.date().nullable(),
  isAvailable: Yup.boolean(),
});

export default function DonorProfile() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);

  const initialValues = {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bloodType: user?.bloodType || '',
    organTypes: user?.organTypes || [],
    lastDonationDate: user?.lastDonationDate || null,
    isAvailable: user?.isAvailable || false,
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await dispatch(updateProfile(values)).unwrap();
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const organTypes = [
    'Heart',
    'Lungs',
    'Liver',
    'Kidneys',
    'Pancreas',
    'Intestines',
    'Corneas',
    'Skin',
    'Bone',
    'Bone Marrow',
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Donor Profile</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, values, setFieldValue }) => (
              <Form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="name"
                  >
                    Full Name
                  </label>
                  <Field
                    id="name"
                    name="name"
                    type="text"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.name && touched.name ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.name && touched.name && (
                    <p className="text-red-500 text-xs italic">{errors.name}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.email && touched.email ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.email && touched.email && (
                    <p className="text-red-500 text-xs italic">{errors.email}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="phone"
                  >
                    Phone Number
                  </label>
                  <Field
                    id="phone"
                    name="phone"
                    type="text"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.phone && touched.phone ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.phone && touched.phone && (
                    <p className="text-red-500 text-xs italic">{errors.phone}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="address"
                  >
                    Address
                  </label>
                  <Field
                    as="textarea"
                    id="address"
                    name="address"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.address && touched.address ? 'border-red-500' : ''
                    }`}
                    rows="3"
                  />
                  {errors.address && touched.address && (
                    <p className="text-red-500 text-xs italic">{errors.address}</p>
                  )}
                </div>

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
                    <p className="text-red-500 text-xs italic">
                      {errors.bloodType}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Organ Types (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {organTypes.map((organ) => (
                      <div key={organ} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`organ-${organ}`}
                          checked={values.organTypes.includes(organ)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFieldValue('organTypes', [
                                ...values.organTypes,
                                organ,
                              ]);
                            } else {
                              setFieldValue(
                                'organTypes',
                                values.organTypes.filter((type) => type !== organ)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`organ-${organ}`}>{organ}</label>
                      </div>
                    ))}
                  </div>
                  {errors.organTypes && touched.organTypes && (
                    <p className="text-red-500 text-xs italic">
                      {errors.organTypes}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="lastDonationDate"
                  >
                    Last Donation Date
                  </label>
                  <Field
                    id="lastDonationDate"
                    name="lastDonationDate"
                    type="date"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.lastDonationDate && touched.lastDonationDate
                        ? 'border-red-500'
                        : ''
                    }`}
                  />
                  {errors.lastDonationDate && touched.lastDonationDate && (
                    <p className="text-red-500 text-xs italic">
                      {errors.lastDonationDate}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="isAvailable"
                      name="isAvailable"
                      className="mr-2"
                    />
                    <label
                      className="text-gray-700 text-sm font-bold"
                      htmlFor="isAvailable"
                    >
                      I am available for donation
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                  >
                    {isSubmitting || loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Name</p>
                  <p className="font-medium">{user?.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Email</p>
                  <p className="font-medium">{user?.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Phone</p>
                  <p className="font-medium">{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Address</p>
                  <p className="font-medium">{user?.address || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Donation Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Blood Type</p>
                  <p className="font-medium">{user?.bloodType || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Organ Types</p>
                  <p className="font-medium">
                    {user?.organTypes?.length
                      ? user.organTypes.join(', ')
                      : 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Last Donation Date</p>
                  <p className="font-medium">
                    {user?.lastDonationDate
                      ? new Date(user.lastDonationDate).toLocaleDateString()
                      : 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Availability</p>
                  <p className="font-medium">
                    {user?.isAvailable ? 'Available' : 'Not available'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 