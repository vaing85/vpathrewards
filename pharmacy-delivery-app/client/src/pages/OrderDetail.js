import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    
    // Connect to socket for real-time updates
    const socket = io(SOCKET_URL);
    socket.emit('join-room', id);
    
    socket.on('order-status-updated', (updatedOrder) => {
      setOrder(updatedOrder);
    });

    socket.on('order-updated', (updatedOrder) => {
      if (updatedOrder._id === id) {
        setOrder(updatedOrder);
      }
    });

    socket.on('location-updated', (data) => {
      console.log('Location update:', data);
      // Refresh order to get updated location
      fetchOrder();
    });

    socket.on('label-info-updated', (updatedDelivery) => {
      console.log('Label info updated:', updatedDelivery);
      // Refresh order to get updated label info
      fetchOrder();
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status.toLowerCase().replace('-', '')}`;
  };

  if (loading) {
    return <div className="container"><div className="loading">Loading order details...</div></div>;
  }

  if (!order) {
    return <div className="container"><div className="error">Order not found</div></div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Order Details</h1>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>Order #{order._id.slice(-6).toUpperCase()}</h2>
            <p style={{ color: '#7f8c8d' }}>
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className={getStatusClass(order.status)} style={{ fontSize: '1.1rem', padding: '10px 20px' }}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
          </span>
        </div>
        {order.delivery?.estimatedArrival && (
          <p><strong>Estimated Delivery:</strong> {new Date(order.delivery.estimatedArrival).toLocaleString()}</p>
        )}
        {order.delivery?.actualDeliveryTime && (
          <p><strong>Delivered At:</strong> {new Date(order.delivery.actualDeliveryTime).toLocaleString()}</p>
        )}
        {order.driver && (
          <p><strong>Driver:</strong> {order.driver.name} {order.driver.phone && `(${order.driver.phone})`}</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '20px' }}>Items</h2>
        {order.items.map((item, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #ecf0f1' }}>
            <div>
              <h4>{item.product.name}</h4>
              <p style={{ color: '#7f8c8d' }}>Quantity: {item.quantity}</p>
            </div>
            <p style={{ fontWeight: 'bold' }}>${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '20px' }}>Delivery Address</h2>
        <p>
          {order.deliveryAddress.street}<br />
          {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
        </p>
      </div>

      {/* Label Information */}
      {order.delivery?.labelInfo && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ marginBottom: '20px' }}>📦 Label Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div><strong>Tracking Number:</strong> {order.delivery.labelInfo.trackingNumber}</div>
            <div><strong>Carrier:</strong> {order.delivery.labelInfo.carrier}</div>
            {order.delivery.labelInfo.packageWeight && (
              <div><strong>Weight:</strong> {order.delivery.labelInfo.packageWeight}</div>
            )}
            {order.delivery.labelInfo.packageDimensions && (
              <div><strong>Dimensions:</strong> {order.delivery.labelInfo.packageDimensions}</div>
            )}
          </div>
          {order.delivery.labelInfo.labelImage && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Label Image:</strong>
              <img 
                src={order.delivery.labelInfo.labelImage} 
                alt="Package Label" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px', 
                  marginTop: '10px',
                  borderRadius: '5px',
                  border: '2px solid #ddd'
                }}
              />
            </div>
          )}
          {order.delivery.labelInfo.specialInstructions && (
            <div>
              <strong>Special Instructions:</strong>
              <p style={{ marginTop: '5px' }}>{order.delivery.labelInfo.specialInstructions}</p>
            </div>
          )}
          <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginTop: '10px' }}>
            Captured: {new Date(order.delivery.labelInfo.capturedAt).toLocaleString()} 
            ({order.delivery.labelInfo.captureMethod === 'photo' ? 'Photo' : 'Manual Entry'})
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Order Summary</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Subtotal:</span>
          <span>${order.subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Delivery Fee:</span>
          <span>${order.deliveryFee.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Tax:</span>
          <span>${order.tax.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 'bold', borderTop: '2px solid #2c3e50', paddingTop: '10px', marginTop: '10px' }}>
          <span>Total:</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
        {order.notes && (
          <div style={{ marginTop: '20px' }}>
            <p><strong>Notes:</strong> {order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;

