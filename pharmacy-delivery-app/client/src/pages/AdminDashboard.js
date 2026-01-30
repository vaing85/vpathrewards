import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DriverForm from '../components/DriverForm';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverLocations, setDriverLocations] = useState({});
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchAllDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/drivers`);
      setDrivers(response.data);
      
      // Fetch locations for all drivers
      const locationPromises = response.data.map(driver =>
        axios.get(`${API_URL}/users/drivers/${driver._id}/location`)
          .then(res => ({ driverId: driver._id, location: res.data }))
          .catch(() => ({ driverId: driver._id, location: null }))
      );
      
      const locations = await Promise.all(locationPromises);
      const locationMap = {};
      locations.forEach(({ driverId, location }) => {
        locationMap[driverId] = location;
      });
      setDriverLocations(locationMap);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  useEffect(() => {
    // Fetch drivers when orders tab is active to enable assignment
    if (activeTab === 'orders') {
      axios.get(`${API_URL}/users/drivers?availableOnly=true`)
        .then(response => setDrivers(response.data))
        .catch(error => console.error('Error fetching drivers:', error));
    } else if (activeTab === 'drivers') {
      fetchAllDrivers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const response = await axios.get(`${API_URL}/orders`);
        setOrders(response.data);
      } else if (activeTab === 'drivers') {
        await fetchAllDrivers();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignDriver = async (orderId, driverId) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/assign-driver`, { driverId });
      fetchData();
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API_URL}/orders/${orderId}/status`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status.toLowerCase().replace('-', '')}`;
  };

  const handleCreateDriver = async (driverData) => {
    try {
      await axios.post(`${API_URL}/users/drivers`, driverData);
      alert('Driver created successfully!');
      setShowDriverForm(false);
      fetchAllDrivers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create driver');
    }
  };

  const handleDeleteDriver = async (driverId, driverName) => {
    if (!window.confirm(`Are you sure you want to delete driver "${driverName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/users/drivers/${driverId}`);
      alert('Driver deleted successfully!');
      fetchAllDrivers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete driver');
    }
  };

  const handleUpdateDriverAvailability = async (driverId, isAvailable) => {
    try {
      await axios.put(`${API_URL}/users/${driverId}`, {
        'driverInfo.isAvailable': isAvailable
      });
      fetchAllDrivers();
    } catch (error) {
      alert('Failed to update driver availability');
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`btn ${activeTab === 'drivers' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Drivers
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {activeTab === 'orders' && (
            <div>
              <h2>All Orders</h2>
              {orders.map(order => (
                <div key={order._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                      <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
                      <p>Customer: {order.customer?.name || order.customer?.email}</p>
                    </div>
                    <span className={getStatusClass(order.status)}>
                      {order.status}
                    </span>
                  </div>
                  <p>Total: ${order.total.toFixed(2)}</p>
                  {!order.driver && (
                    <div style={{ marginTop: '15px' }}>
                      <select
                        onChange={(e) => assignDriver(order._id, e.target.value)}
                        className="form-control"
                        style={{ width: '200px', display: 'inline-block', marginRight: '10px' }}
                      >
                        <option value="">Assign Driver</option>
                        {drivers.map(driver => (
                          <option key={driver._id} value={driver._id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {order.driver && <p>Driver: {order.driver.name}</p>}
                  <div style={{ marginTop: '15px' }}>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                      className="form-control"
                      style={{ width: '200px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="assigned">Assigned</option>
                      <option value="out-for-delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'drivers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2>Driver Management</h2>
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    Locations refresh automatically every 30 seconds
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={fetchAllDrivers}
                    className="btn btn-secondary"
                    title="Refresh driver locations"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    onClick={() => {
                      setEditingDriver(null);
                      setShowDriverForm(!showDriverForm);
                    }}
                    className="btn btn-success"
                  >
                    {showDriverForm ? '✕ Cancel' : '+ Add Driver'}
                  </button>
                </div>
              </div>

              {showDriverForm && (
                <DriverForm
                  driver={editingDriver}
                  onSave={handleCreateDriver}
                  onCancel={() => {
                    setShowDriverForm(false);
                    setEditingDriver(null);
                  }}
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {drivers.map(driver => {
                  const location = driverLocations[driver._id];
                  return (
                    <div key={driver._id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div>
                          <h3>{driver.name}</h3>
                          <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>{driver.email}</p>
                        </div>
                        <span className={`status-badge ${driver.driverInfo?.isAvailable ? 'status-ready' : 'status-cancelled'}`}>
                          {driver.driverInfo?.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <p><strong>Phone:</strong> {driver.phone}</p>
                        <p><strong>Vehicle:</strong> {driver.driverInfo?.vehicleType} - {driver.driverInfo?.vehicleNumber}</p>
                        <p><strong>License:</strong> {driver.driverInfo?.licenseNumber}</p>
                        {driver.address && (
                          <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                            {driver.address.city}, {driver.address.state}
                          </p>
                        )}
                      </div>

                      {/* Location Display */}
                      {location?.location && (
                        <div style={{ 
                          backgroundColor: '#e8f5e9', 
                          padding: '10px', 
                          borderRadius: '5px', 
                          marginBottom: '15px',
                          fontSize: '0.9rem'
                        }}>
                          <strong>📍 Current Location:</strong>
                          <div style={{ marginTop: '5px' }}>
                            <div>Lat: {location.location.latitude.toFixed(6)}</div>
                            <div>Lng: {location.location.longitude.toFixed(6)}</div>
                            <div style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
                              Updated: {new Date(location.location.timestamp).toLocaleTimeString()}
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${location.location.latitude},${location.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary"
                              style={{ 
                                marginTop: '8px', 
                                padding: '5px 10px', 
                                fontSize: '0.85rem',
                                display: 'inline-block'
                              }}
                            >
                              View on Map
                            </a>
                          </div>
                        </div>
                      )}

                      {!location?.location && driver.driverInfo?.isAvailable && (
                        <div style={{ 
                          backgroundColor: '#fff3cd', 
                          padding: '10px', 
                          borderRadius: '5px', 
                          marginBottom: '15px',
                          fontSize: '0.9rem',
                          color: '#856404'
                        }}>
                          No active location data
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleUpdateDriverAvailability(driver._id, !driver.driverInfo?.isAvailable)}
                          className={`btn ${driver.driverInfo?.isAvailable ? 'btn-secondary' : 'btn-success'}`}
                          style={{ fontSize: '0.9rem', padding: '5px 15px' }}
                        >
                          {driver.driverInfo?.isAvailable ? 'Set Unavailable' : 'Set Available'}
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(driver._id, driver.name)}
                          className="btn btn-danger"
                          style={{ fontSize: '0.9rem', padding: '5px 15px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {drivers.length === 0 && !showDriverForm && (
                <div className="card">
                  <p>No drivers found. Click "Add Driver" to create one.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

