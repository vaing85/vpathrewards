import React, { useState } from 'react';

const DriverForm = ({ onSave, onCancel, driver = null }) => {
  const [formData, setFormData] = useState({
    name: driver?.name || '',
    email: driver?.email || '',
    password: '',
    phone: driver?.phone || '',
    vehicleType: driver?.driverInfo?.vehicleType || '',
    vehicleNumber: driver?.driverInfo?.vehicleNumber || '',
    licenseNumber: driver?.driverInfo?.licenseNumber || '',
    street: driver?.address?.street || '',
    city: driver?.address?.city || '',
    state: driver?.address?.state || '',
    zipCode: driver?.address?.zipCode || ''
  });

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!driver && !formData.password) {
      setError('Password is required for new drivers');
      return;
    }

    const driverData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber,
      licenseNumber: formData.licenseNumber,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode
      }
    };

    if (!driver) {
      driverData.password = formData.password;
    }

    onSave(driverData);
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3>{driver ? 'Edit Driver' : 'Add New Driver'}</h3>
      {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
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
          <label>Email *</label>
          <input
            type="email"
            name="email"
            className="form-control"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={!!driver}
          />
        </div>

        <div className="form-group">
          <label>Password {!driver && '*'}</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required={!driver}
              placeholder={driver ? 'Leave blank to keep current password' : ''}
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

        <h4 style={{ marginTop: '20px', marginBottom: '15px' }}>Vehicle Information</h4>
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

        <h4 style={{ marginTop: '20px', marginBottom: '15px' }}>Address (Optional)</h4>
        <div className="form-group">
          <label>Street</label>
          <input
            type="text"
            name="street"
            className="form-control"
            value={formData.street}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              className="form-control"
              value={formData.city}
              onChange={handleChange}
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
            />
          </div>
        </div>

        <div className="form-group">
          <label>Zip Code</label>
          <input
            type="text"
            name="zipCode"
            className="form-control"
            value={formData.zipCode}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-success">
            {driver ? 'Update Driver' : 'Create Driver'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverForm;

