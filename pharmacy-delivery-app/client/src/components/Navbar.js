import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Navbar = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const { cartItems } = useCart();
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAvailabilityToggle = async () => {
    if (!user || user.role !== 'driver') return;
    
    const newAvailability = !user.driverInfo?.isAvailable;
    setUpdatingAvailability(true);
    
    try {
      await axios.put(`${API_URL}/users/${user._id}/availability`, {
        isAvailable: newAvailability
      });
      
      // Update user in context
      setUser({
        ...user,
        driverInfo: {
          ...user.driverInfo,
          isAvailable: newAvailability
        }
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          🏥 Pharmacy Delivery
        </Link>
        <div className="navbar-links">
          {user ? (
            <>
              {user.role === 'customer' && (
                <>
                  <Link to="/cart">
                    Cart {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
                  </Link>
                  <Link to="/orders">My Orders</Link>
                </>
              )}
              {user.role === 'admin' && (
                <Link to="/admin">Admin Dashboard</Link>
              )}
              {user.role === 'driver' && (
                <>
                  <Link to="/driver">Driver Dashboard</Link>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                    <Link to="/driver/profile">Profile</Link>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: updatingAvailability ? 'wait' : 'pointer',
                      gap: '6px',
                      fontSize: '0.8rem',
                      color: 'white',
                      opacity: 0.9
                    }}>
                      <input
                        type="checkbox"
                        checked={user.driverInfo?.isAvailable || false}
                        onChange={handleAvailabilityToggle}
                        disabled={updatingAvailability}
                        style={{ 
                          width: '14px', 
                          height: '14px', 
                          cursor: updatingAvailability ? 'wait' : 'pointer',
                          margin: 0
                        }}
                      />
                      <span style={{ 
                        fontWeight: '500',
                        color: user.driverInfo?.isAvailable ? '#2ecc71' : '#e74c3c'
                      }}>
                        {updatingAvailability ? 'Updating...' : (user.driverInfo?.isAvailable ? '● Available' : '● Unavailable')}
                      </span>
                    </label>
                  </div>
                </>
              )}
              <span>Hello, {user.name}</span>
              <button onClick={logout} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

