import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (category) params.category = category;
      
      const response = await axios.get(`${API_URL}/products`, { params });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const categories = [
    'prescription',
    'over-the-counter',
    'vitamins',
    'personal-care',
    'medical-devices',
    'other'
  ];

  if (loading) {
    return <div className="container"><div className="loading">Loading products...</div></div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Our Products</h1>

      <div style={{ marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <select
          className="form-control"
          style={{ width: '200px' }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {products.length === 0 ? (
        <div className="card">
          <p>No products found. Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(product => (
            <div key={product._id} className="product-card">
              <div
                className="product-image"
                style={{
                  backgroundImage: product.image ? `url(${product.image})` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem'
                }}
              >
                {!product.image && '💊'}
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">${product.price.toFixed(2)}</p>
                <p className="product-stock">
                  {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <Link to={`/products/${product._id}`} className="btn btn-primary" style={{ flex: 1 }}>
                    View Details
                  </Link>
                  <button
                    onClick={() => addToCart(product)}
                    className="btn btn-success"
                    disabled={product.stock === 0}
                    style={{ flex: 1 }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;

