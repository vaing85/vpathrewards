import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const LabelCapture = ({ deliveryId, onLabelCaptured, onClose }) => {
  const [captureMethod, setCaptureMethod] = useState('manual'); // 'manual' or 'photo'
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const [formData, setFormData] = useState({
    trackingNumber: '',
    carrier: '',
    packageWeight: '',
    packageDimensions: '',
    specialInstructions: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Please select an image file');
      }
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], 'label-photo.jpg', { type: 'image/jpeg' });
        setImageFile(file);
        setImagePreview(canvas.toDataURL());
        stopCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('deliveryId', deliveryId);

    try {
      const response = await axios.post(`${API_URL}/deliveries/${deliveryId}/label-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let imageUrl = null;
      
      if (captureMethod === 'photo' && imageFile) {
        imageUrl = await uploadImage();
      }

      const labelData = {
        trackingNumber: formData.trackingNumber,
        carrier: formData.carrier,
        packageWeight: formData.packageWeight,
        packageDimensions: formData.packageDimensions,
        specialInstructions: formData.specialInstructions,
        labelImage: imageUrl,
        captureMethod: captureMethod
      };

      await axios.put(`${API_URL}/deliveries/${deliveryId}/label-info`, labelData);
      
      if (onLabelCaptured) {
        onLabelCaptured(labelData);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving label info:', error);
      setError(error.response?.data?.message || 'Failed to save label information');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (method) => {
    setCaptureMethod(method);
    setError('');
    if (method === 'photo') {
      stopCamera();
      setImagePreview(null);
      setImageFile(null);
    }
  };

  return (
    <div className="label-capture-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Capture Label Information</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px 15px' }}>
            ✕ Close
          </button>
        </div>

        {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}

        {/* Method Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Capture Method:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleMethodChange('manual')}
              className={`btn ${captureMethod === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              📝 Manual Entry
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange('photo')}
              className={`btn ${captureMethod === 'photo' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              📷 Take Photo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Photo Capture Section */}
          {captureMethod === 'photo' && (
            <div style={{ marginBottom: '20px' }}>
              {!stream && !imagePreview && (
                <div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn btn-primary"
                    style={{ width: '100%', marginBottom: '10px' }}
                  >
                    📷 Open Camera
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    📁 Choose from Gallery
                  </button>
                </div>
              )}

              {stream && (
                <div style={{ marginBottom: '15px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="btn btn-success"
                      style={{ flex: 1 }}
                    >
                      📸 Capture
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {imagePreview && (
                <div style={{ marginBottom: '15px' }}>
                  <img
                    src={imagePreview}
                    alt="Label preview"
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '2px solid #ddd' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="btn btn-danger"
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    Remove Photo
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}

          {/* Manual Input Fields */}
          <div className="form-group">
            <label>Tracking Number *</label>
            <input
              type="text"
              name="trackingNumber"
              className="form-control"
              value={formData.trackingNumber}
              onChange={handleInputChange}
              required
              placeholder="Enter tracking number"
            />
          </div>

          <div className="form-group">
            <label>Carrier *</label>
            <select
              name="carrier"
              className="form-control"
              value={formData.carrier}
              onChange={handleInputChange}
              required
            >
              <option value="">Select carrier</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="USPS">USPS</option>
              <option value="DHL">DHL</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Package Weight</label>
              <input
                type="text"
                name="packageWeight"
                className="form-control"
                value={formData.packageWeight}
                onChange={handleInputChange}
                placeholder="e.g., 2.5 lbs"
              />
            </div>
            <div className="form-group">
              <label>Package Dimensions</label>
              <input
                type="text"
                name="packageDimensions"
                className="form-control"
                value={formData.packageDimensions}
                onChange={handleInputChange}
                placeholder="e.g., 10x8x6 in"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Special Instructions</label>
            <textarea
              name="specialInstructions"
              className="form-control"
              value={formData.specialInstructions}
              onChange={handleInputChange}
              rows="3"
              placeholder="Any special handling instructions..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Saving...' : 'Save Label Info'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LabelCapture;

