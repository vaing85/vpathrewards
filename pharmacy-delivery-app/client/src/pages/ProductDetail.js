import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product && quantity > 0 && product.stock >= quantity) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      navigate('/cart');
    }
  };

  if (loading) {
    return <div className="container"><div className="loading">Loading...</div></div>;
  }

  if (!product) {
    return <div className="container"><div className="error">Product not found</div></div>;
  }

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        ← Back
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        <div>
          <div
            style={{
              width: '100%',
              height: '400px',
              backgroundColor: '#ecf0f1',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '5rem'
            }}
          >
            {product.image ? (
              <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
            ) : (
              '💊'
            )}
          </div>
        </div>
        <div>
          <h1 style={{ marginBottom: '20px' }}>{product.name}</h1>
          <p className="product-price" style={{ fontSize: '2rem', marginBottom: '20px' }}>
            ${product.price.toFixed(2)}
          </p>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Category:</strong> {product.category}</p>
            <p><strong>Stock:</strong> {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}</p>
            {product.requiresPrescription && (
              <p style={{ color: '#e74c3c' }}><strong>⚠️ Prescription Required</strong></p>
            )}
            {product.manufacturer && (
              <p><strong>Manufacturer:</strong> {product.manufacturer}</p>
            )}
          </div>
          <div style={{ marginBottom: '30px' }}>
            <h3>Description</h3>
            <p>{product.description}</p>
          </div>
          {product.stock > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label>Quantity: </label>
              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                style={{ width: '80px', padding: '8px', marginLeft: '10px' }}
              />
            </div>
          )}
          <button
            onClick={handleAddToCart}
            className="btn btn-success"
            disabled={product.stock === 0}
            style={{ fontSize: '1.2rem', padding: '15px 30px', width: '100%' }}
          >
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

