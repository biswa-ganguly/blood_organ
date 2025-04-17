import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { updateProfile } from '../../store/slices/authSlice';

const validationSchema = Yup.object({
  name: Yup.string().required('Hospital name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  phone: Yup.string().required('Phone number is required'),
  address: Yup.string().required('Address is required'),
  licenseNumber: Yup.string().required('License number is required'),
  specialties: Yup.array().min(1, 'Select at least one specialty'),
  emergencyContact: Yup.string().required('Emergency contact is required'),
  isAcceptingDonations: Yup.boolean(),
});

export default function HospitalProfile() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);

  const initialValues = {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    licenseNumber: user?.licenseNumber || '',
    specialties: user?.specialties || [],
    emergencyContact: user?.emergencyContact || '',
    isAcceptingDonations: user?.isAcceptingDonations || false,
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await dispatch(updateProfile(values)).unwrap();
      toast.success('Hospital profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update hospital profile');
    } finally {
      setSubmitting(false);
    }
  };

  const specialties = [
    'General Medicine',
    'Emergency Medicine',
    'Surgery',
    'Pediatrics',
    'Oncology',
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Transplant Surgery',
    'Trauma Care',
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Hospital Profile</h1>
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
                    Hospital Name
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
                    htmlFor="licenseNumber"
                  >
                    License Number
                  </label>
                  <Field
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.licenseNumber && touched.licenseNumber
                        ? 'border-red-500'
                        : ''
                    }`}
                  />
                  {errors.licenseNumber && touched.licenseNumber && (
                    <p className="text-red-500 text-xs italic">
                      {errors.licenseNumber}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Specialties (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {specialties.map((specialty) => (
                      <div key={specialty} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`specialty-${specialty}`}
                          checked={values.specialties.includes(specialty)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFieldValue('specialties', [
                                ...values.specialties,
                                specialty,
                              ]);
                            } else {
                              setFieldValue(
                                'specialties',
                                values.specialties.filter(
                                  (type) => type !== specialty
                                )
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`specialty-${specialty}`}>
                          {specialty}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.specialties && touched.specialties && (
                    <p className="text-red-500 text-xs italic">
                      {errors.specialties}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="emergencyContact"
                  >
                    Emergency Contact
                  </label>
                  <Field
                    id="emergencyContact"
                    name="emergencyContact"
                    type="text"
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      errors.emergencyContact && touched.emergencyContact
                        ? 'border-red-500'
                        : ''
                    }`}
                  />
                  {errors.emergencyContact && touched.emergencyContact && (
                    <p className="text-red-500 text-xs italic">
                      {errors.emergencyContact}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="isAcceptingDonations"
                      name="isAcceptingDonations"
                      className="mr-2"
                    />
                    <label
                      className="text-gray-700 text-sm font-bold"
                      htmlFor="isAcceptingDonations"
                    >
                      We are currently accepting donations
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
              <h2 className="text-xl font-semibold mb-2">Hospital Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Hospital Name</p>
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
                <div>
                  <p className="text-gray-600 text-sm">License Number</p>
                  <p className="font-medium">
                    {user?.licenseNumber || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Emergency Contact</p>
                  <p className="font-medium">
                    {user?.emergencyContact || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Specialties</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {user?.specialties?.length ? (
                  user.specialties.map((specialty) => (
                    <div
                      key={specialty}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {specialty}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No specialties listed</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Donation Status</h2>
              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${
                    user?.isAcceptingDonations ? 'bg-green-500' : 'bg-red-500'
                  }`}
                ></div>
                <p className="font-medium">
                  {user?.isAcceptingDonations
                    ? 'Currently accepting donations'
                    : 'Not accepting donations at this time'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 