import { useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '../context/AuthContext';
import { useFormValidation } from '../hooks/useFormValidation';
import FormField from '../components/FormField';

const TURNSTILE_SITE_KEY = '0x4AAAAAACwdtfRVjf6eOysH';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const referralCode = searchParams.get('ref');

  const validation = useFormValidation({
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
    confirmPassword: { 
      required: true,
      custom: (value) => {
        if (value !== password) {
          return 'Passwords do not match';
        }
        return null;
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    const isValid = validation.validateForm({ name, email, password, confirmPassword });
    if (!isValid) {
      // Mark all fields as touched to show errors
      validation.handleBlur('name');
      validation.handleBlur('email');
      validation.handleBlur('password');
      validation.handleBlur('confirmPassword');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name, referralCode || undefined, turnstileToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      turnstileRef.current?.reset();
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              sign in to your existing account
            </Link>
          </p>
          {referralCode && (
            <div className="mt-2 text-center">
              <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded">
                🎉 You've been referred! You'll get bonus cashback when you start earning.
              </p>
            </div>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <FormField
              label="Full Name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                validation.handleChange('name', e.target.value);
              }}
              onBlur={() => validation.handleBlur('name')}
              placeholder="Full Name"
              error={validation.getFieldError('name')}
              touched={validation.isFieldTouched('name')}
              required
              showSuccess
              autoComplete="name"
            />
            <FormField
              label="Email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validation.handleChange('email', e.target.value);
              }}
              onBlur={() => validation.handleBlur('email')}
              placeholder="Email address"
              error={validation.getFieldError('email')}
              touched={validation.isFieldTouched('email')}
              required
              showSuccess
              autoComplete="email"
            />
            <FormField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validation.handleChange('password', e.target.value);
                // Re-validate confirm password if it's been touched
                if (validation.isFieldTouched('confirmPassword')) {
                  validation.handleChange('confirmPassword', confirmPassword);
                }
              }}
              onBlur={() => validation.handleBlur('password')}
              placeholder="Password (min. 6 characters)"
              error={validation.getFieldError('password')}
              touched={validation.isFieldTouched('password')}
              required
              autoComplete="new-password"
            />
            <FormField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                validation.handleChange('confirmPassword', e.target.value);
              }}
              onBlur={() => validation.handleBlur('confirmPassword')}
              placeholder="Confirm Password"
              error={validation.getFieldError('confirmPassword')}
              touched={validation.isFieldTouched('confirmPassword')}
              required
              autoComplete="new-password"
            />
          </div>

          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken('')}
            options={{ theme: 'light' }}
          />

          <div>
            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
