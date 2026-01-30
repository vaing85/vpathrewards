import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const { cartItems, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    paymentMethod: 'cash',
    notes: ''
  });

  const deliveryFee = 5.00;
  const tax = getCartTotal() * 0.08;
  const total = getCartTotal() + deliveryFee + tax;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const orderData = {
        items: cartItems.map(item => ({
          product: item.product._id || item.product.id,
          quantity: item.quantity
        })),
        deliveryAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        },
        notes: formData.notes
      };

      const response = await axios.post(`${API_URL}/orders`, orderData);
      clearCart();
      navigate(`/orders/${response.data._id}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container">
        <div className="card">
          <p>Your cart is empty. Add items to checkout.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Checkout</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Delivery Address</h2>
            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                name="street"
                className="form-control"
                value={formData.street}
                onChange={handleChange}
                required
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
                  required
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
                  required
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
                required
              />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select
                name="paymentMethod"
                className="form-control"
                value={formData.paymentMethod}
                onChange={handleChange}
              >
                <option value="cash">Cash on Delivery</option>
                <option value="card">Card on Delivery</option>
                <option value="online">Online Payment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                name="notes"
                className="form-control"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
              />
            </div>
          </div>
          <div>
            <div className="card cart-summary">
              <h2 style={{ marginBottom: '20px' }}>Order Summary</h2>
              {cartItems.map(item => (
                <div key={item.product._id} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.product.name} x{item.quantity}</span>
                    <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div className="cart-summary-row">
                <span>Subtotal:</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Delivery Fee:</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Tax:</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="cart-summary-total">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                className="btn btn-success"
                style={{ width: '100%', marginTop: '20px', padding: '15px' }}
                disabled={loading}
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;

