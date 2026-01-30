import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DriverProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    isAvailable: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        vehicleType: user.driverInfo?.vehicleType || '',
        vehicleNumber: user.driverInfo?.vehicleNumber || '',
        licenseNumber: user.driverInfo?.licenseNumber || '',
        street: user.address?.street || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        zipCode: user.address?.zipCode || '',
        country: user.address?.country || 'USA',
        isAvailable: user.driverInfo?.isAvailable || false
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        },
        driverInfo: {
          isAvailable: formData.isAvailable,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          licenseNumber: formData.licenseNumber,
          currentLocation: user.driverInfo?.currentLocation || null
        }
      };

      // Only include password if it's provided
      if (formData.password) {
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        updateData.password = formData.password;
      }

      const response = await axios.put(`${API_URL}/users/${user._id}`, updateData);
      
      // Update the user in context
      setUser(response.data);
      
      setSuccess('Profile updated successfully!');
      setFormData(prev => ({ ...prev, password: '' })); // Clear password field
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'driver') {
    return (
      <div className="container">
        <div className="error">Access denied. Driver access required.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Driver Profile</h1>

      {error && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}
      {success && <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>{success}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <h3 style={{ marginBottom: '20px', color: '#495057' }}>👤 Personal Information</h3>
          
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={formData.email}
              disabled
              style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#7f8c8d' }}>Email cannot be changed</small>
          </div>

          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              name="phone"
              className="form-control"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '5px',
                  color: '#7f8c8d'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small style={{ color: '#7f8c8d' }}>Leave blank to keep your current password</small>
          </div>

          {/* Vehicle Information */}
          <h3 style={{ marginTop: '30px', marginBottom: '20px', color: '#495057' }}>🚗 Vehicle Information</h3>
          
          <div className="form-group">
            <label>Vehicle Type *</label>
            <select
              name="vehicleType"
              className="form-control"
              value={formData.vehicleType}
              onChange={handleChange}
              required
            >
              <option value="">Select vehicle type</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="Car">Car</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
              <option value="Bicycle">Bicycle</option>
            </select>
          </div>

          <div className="form-group">
            <label>Vehicle Number/Plate *</label>
            <input
              type="text"
              name="vehicleNumber"
              className="form-control"
              value={formData.vehicleNumber}
              onChange={handleChange}
              required
              placeholder="e.g., ABC-123"
            />
          </div>

          <div className="form-group">
            <label>License Number *</label>
            <input
              type="text"
              name="licenseNumber"
              className="form-control"
              value={formData.licenseNumber}
              onChange={handleChange}
              required
            />
          </div>

          {/* Address Information */}
          <h3 style={{ marginTop: '30px', marginBottom: '20px', color: '#495057' }}>📍 Address</h3>
          
          <div className="form-group">
            <label>Street</label>
            <input
              type="text"
              name="street"
              className="form-control"
              value={formData.street}
              onChange={handleChange}
              placeholder="123 Main St"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                className="form-control"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="state"
                className="form-control"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Zip Code</label>
              <input
                type="text"
                name="zipCode"
                className="form-control"
                value={formData.zipCode}
                onChange={handleChange}
                placeholder="12345"
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                name="country"
                className="form-control"
                value={formData.country}
                onChange={handleChange}
                placeholder="Country"
              />
            </div>
          </div>

          {/* Availability Status */}
          <div style={{ 
            marginTop: '30px', 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Availability Status</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'normal'
              }}>
                <input
                  type="checkbox"
                  name="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      isAvailable: e.target.checked
                    });
                    setError('');
                    setSuccess('');
                  }}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    marginRight: '10px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ 
                  fontWeight: formData.isAvailable ? 'bold' : 'normal',
                  color: formData.isAvailable ? '#28a745' : '#6c757d'
                }}>
                  {formData.isAvailable ? 'Available for deliveries' : 'Unavailable'}
                </span>
              </label>
            </div>
            <small style={{ color: '#7f8c8d', display: 'block', marginTop: '10px' }}>
              Toggle your availability to accept or decline new delivery assignments.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button 
              type="submit" 
              className="btn btn-success" 
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/driver')} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverProfile;

