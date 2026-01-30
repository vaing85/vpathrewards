import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const navigate = useNavigate();

  const deliveryFee = 5.00;
  const tax = getCartTotal() * 0.08;
  const total = getCartTotal() + deliveryFee + tax;

  if (cartItems.length === 0) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Your cart is empty</h2>
          <p style={{ marginBottom: '30px' }}>Start shopping to add items to your cart!</p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Shopping Cart</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        <div className="card">
          {cartItems.map(item => (
            <div key={item.product._id} className="cart-item">
              <div style={{ flex: 1 }}>
                <h3>{item.product.name}</h3>
                <p>${item.product.price.toFixed(2)} each</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px' }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px' }}
                    disabled={item.quantity >= item.product.stock}
                  >
                    +
                  </button>
                </div>
                <p style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>
                  ${(item.product.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeFromCart(item.product._id)}
                  className="btn btn-danger"
                  style={{ padding: '5px 10px' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="card cart-summary">
            <h2 style={{ marginBottom: '20px' }}>Order Summary</h2>
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
              onClick={() => navigate('/checkout')}
              className="btn btn-success"
              style={{ width: '100%', marginTop: '20px', padding: '15px' }}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

