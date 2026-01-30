import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status.toLowerCase().replace('-', '')}`;
  };

  if (loading) {
    return <div className="container"><div className="loading">Loading orders...</div></div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>My Orders</h1>
      {orders.length === 0 ? (
        <div className="card">
          <p>You haven't placed any orders yet.</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: '20px' }}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div>
          {orders.map(order => (
            <div key={order._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
                  <p style={{ color: '#7f8c8d' }}>
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={getStatusClass(order.status)}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
                </span>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
                <p><strong>Items:</strong> {order.items.length} item(s)</p>
                {order.driver && (
                  <p><strong>Driver:</strong> {order.driver.name}</p>
                )}
              </div>
              <Link to={`/orders/${order._id}`} className="btn btn-primary">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;

