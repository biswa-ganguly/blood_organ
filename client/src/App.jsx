import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { store } from './store';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Protected Pages
import Dashboard from './pages/Dashboard';
import DonorDashboard from './pages/donor/Dashboard';
import HospitalDashboard from './pages/hospital/Dashboard';
import DonorProfile from './pages/donor/Profile';
import HospitalProfile from './pages/hospital/Profile';
import DonorSearch from './pages/donor/Search';
import HospitalSearch from './pages/hospital/Search';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/dashboard"
                element={
                  <ProtectedRoute>
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/dashboard"
                element={
                  <ProtectedRoute>
                    <HospitalDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/profile"
                element={
                  <ProtectedRoute>
                    <DonorProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/profile"
                element={
                  <ProtectedRoute>
                    <HospitalProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/search"
                element={
                  <ProtectedRoute>
                    <DonorSearch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/search"
                element={
                  <ProtectedRoute>
                    <HospitalSearch />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
          <Toaster position="top-right" />
        </div>
      </Router>
    </Provider>
  );
}

export default App;
