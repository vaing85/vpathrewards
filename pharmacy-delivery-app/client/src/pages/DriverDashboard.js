import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import LabelCapture from '../components/LabelCapture';
import RouteCreation from '../components/RouteCreation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DriverDashboard = () => {
  const { user } = useContext(AuthContext);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLabelCapture, setShowLabelCapture] = useState(false);
  const [showRouteCreation, setShowRouteCreation] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(`${API_URL}/deliveries`);
      setDeliveries(response.data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      await axios.put(`${API_URL}/deliveries/${deliveryId}/status`, { status });
      alert('Status updated successfully');
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      alert('Failed to update status');
    }
  };

  const updateLocation = async (deliveryId) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await axios.put(`${API_URL}/deliveries/${deliveryId}/location`, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            alert('Location updated successfully');
            fetchDeliveries();
          } catch (error) {
            console.error('Error updating location:', error);
            alert('Failed to update location');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Failed to get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status.toLowerCase().replace('-', '')}`;
  };

  if (loading) {
    return <div className="container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Driver Dashboard</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>My Deliveries</h2>
        <button
          onClick={() => setShowRouteCreation(true)}
          className="btn btn-success"
        >
          ➕ Create Route
        </button>
      </div>
      {deliveries.length === 0 ? (
        <div className="card">
          <p>No deliveries assigned yet.</p>
        </div>
      ) : (
        <div>
          {deliveries.map(delivery => (
            <div key={delivery._id} className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  {delivery.order ? (
                    <>
                      <h3>Order #{delivery.order._id?.slice(-6).toUpperCase()}</h3>
                      <p>Customer: {delivery.order.customer?.name || delivery.order.customer?.email}</p>
                      {delivery.order.customer?.phone && (
                        <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Phone: {delivery.order.customer.phone}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3>Route #{delivery._id.slice(-6).toUpperCase()}</h3>
                      <p><strong>Recipient:</strong> {delivery.recipientName}</p>
                      {delivery.recipientPhone && (
                        <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Phone: {delivery.recipientPhone}</p>
                      )}
                    </>
                  )}
                </div>
                <span className={getStatusClass(delivery.status)}>
                  {delivery.status}
                </span>
              </div>
              <div style={{ marginBottom: '15px' }}>
                {(delivery.order?.deliveryAddress || delivery.deliveryAddress) && (
                  <p><strong>Delivery Address:</strong> {
                    delivery.order?.deliveryAddress 
                      ? `${delivery.order.deliveryAddress.street}, ${delivery.order.deliveryAddress.city}, ${delivery.order.deliveryAddress.state} ${delivery.order.deliveryAddress.zipCode}`
                      : `${delivery.deliveryAddress.street}, ${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.state} ${delivery.deliveryAddress.zipCode}`
                  }</p>
                )}
                {delivery.order?.total && (
                  <p><strong>Total:</strong> ${delivery.order.total.toFixed(2)}</p>
                )}
                {delivery.currentLocation && (
                  <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                    Last location update: {new Date(delivery.currentLocation.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
              {/* Label Information Display */}
              {delivery.labelInfo && (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '5px', 
                  marginBottom: '15px',
                  border: '1px solid #dee2e6'
                }}>
                  <h4 style={{ marginBottom: '10px', color: '#495057' }}>📦 Label Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                    <div><strong>Tracking:</strong> {delivery.labelInfo.trackingNumber}</div>
                    <div><strong>Carrier:</strong> {delivery.labelInfo.carrier}</div>
                    {delivery.labelInfo.packageWeight && (
                      <div><strong>Weight:</strong> {delivery.labelInfo.packageWeight}</div>
                    )}
                    {delivery.labelInfo.packageDimensions && (
                      <div><strong>Dimensions:</strong> {delivery.labelInfo.packageDimensions}</div>
                    )}
                  </div>
                  {delivery.labelInfo.labelImage && (
                    <div style={{ marginTop: '10px' }}>
                      <img 
                        src={delivery.labelInfo.labelImage} 
                        alt="Label" 
                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '5px', border: '1px solid #ddd' }}
                      />
                    </div>
                  )}
                  {delivery.labelInfo.specialInstructions && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Instructions:</strong> {delivery.labelInfo.specialInstructions}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => updateLocation(delivery._id)}
                  className="btn btn-primary"
                >
                  📍 Update Location
                </button>
                
                {/* Label Capture Button - Show when picked up, in transit, or for routes in assigned status */}
                {((delivery.status === 'picked-up' || delivery.status === 'in-transit') || 
                  (!delivery.order && delivery.status === 'assigned')) && (
                  <button
                    onClick={() => {
                      setSelectedDelivery(delivery);
                      setShowLabelCapture(true);
                    }}
                    className="btn btn-primary"
                  >
                    {delivery.labelInfo ? '✏️ Edit Label' : '📦 Capture Label'}
                  </button>
                )}

                {delivery.status === 'assigned' && (
                  <button
                    onClick={() => updateDeliveryStatus(delivery._id, 'picked-up')}
                    className="btn btn-success"
                  >
                    ✅ Mark as Picked Up
                  </button>
                )}
                {delivery.status === 'picked-up' && (
                  <button
                    onClick={() => updateDeliveryStatus(delivery._id, 'in-transit')}
                    className="btn btn-primary"
                  >
                    🚚 Start Delivery
                  </button>
                )}
                {delivery.status === 'in-transit' && (
                  <button
                    onClick={() => updateDeliveryStatus(delivery._id, 'delivered')}
                    className="btn btn-success"
                  >
                    ✓ Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Label Capture Modal */}
      {showLabelCapture && selectedDelivery && (
        <LabelCapture
          deliveryId={selectedDelivery._id}
          onLabelCaptured={(labelData) => {
            // Update the delivery in state
            setDeliveries(prevDeliveries =>
              prevDeliveries.map(d =>
                d._id === selectedDelivery._id
                  ? { ...d, labelInfo: { ...labelData, capturedAt: new Date() } }
                  : d
              )
            );
            setShowLabelCapture(false);
            setSelectedDelivery(null);
          }}
          onClose={() => {
            setShowLabelCapture(false);
            setSelectedDelivery(null);
          }}
        />
      )}

      {/* Route Creation Modal */}
      {showRouteCreation && (
        <RouteCreation
          onRouteCreated={(newRoute) => {
            // Add the new route to the deliveries list
            setDeliveries(prevDeliveries => [newRoute, ...prevDeliveries]);
            setShowRouteCreation(false);
            alert('Route created successfully!');
          }}
          onClose={() => {
            setShowRouteCreation(false);
          }}
        />
      )}
    </div>
  );
};

export default DriverDashboard;

