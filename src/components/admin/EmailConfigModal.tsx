import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { connectGmail, connectOutlook, saveEmailConfig } from '../../lib/email';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
};

export function EmailConfigModal({ onClose, onSuccess, organizationId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');



  const handleGoogleSuccess = async (codeResponse: any) => {
    try {
      if (!user) return;
      if (!codeResponse?.code) {
        throw new Error('No authorization code received from Google');
      }

      setLoading(true);
      // Pass the code instead of tokens to connectGmail
      const config = await connectGmail(codeResponse.code);

      // Store the token with organization context
      const { error: saveError } = await saveEmailConfig(
        user.id,
        config,
        organizationId
      );

      if (saveError) throw saveError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error connecting Gmail:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Gmail');
    } finally {
      setLoading(false);
    }
  };

  

  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    onSuccess: handleGoogleSuccess,
    onError: (error) => {
      console.error('Google login error:', error);
      setError('Failed to connect to Gmail');
      setLoading(false);
    },
    flow: 'auth-code', // Add this line - very important for refresh tokens
    // These are critical for refresh tokens:
    access_type: 'offline',
    prompt: 'consent'
  });

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    if (!user) return;

    setLoading(true);
    setError(null);

    if (provider === 'gmail') {
      googleLogin(); // Just call the function, don't await
    } else {
      try {
        const config = await connectOutlook();

        // Store the token with organization context
        const { error: saveError } = await saveEmailConfig(
          user.id,
          config,
          organizationId
        );

        if (saveError) throw saveError;

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } catch (err) {
        console.error('Error connecting Outlook:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect Outlook');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Connect Email Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Successfully Connected!
            </h3>
            <p className="text-gray-500">
              You can now send emails directly from the dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">
              Connect your email account to send emails directly from the dashboard. This allows you to use our CRM to send emails that appear to come from your actual email address.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Your Email Address
              </label>
              <div className="flex">
                <div className="relative flex-grow">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    placeholder="your.name@company.com"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the email address you want to send from. We'll verify this during OAuth.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Select your email provider:</p>
            </div>

            <button
              onClick={() => handleConnect('gmail')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                alt="Google"
                className="w-6 h-6 mr-3"
              />
              <span className="font-medium">Connect with Gmail</span>
            </button>

            <button
              onClick={() => handleConnect('outlook')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg"
                alt="Outlook"
                className="w-6 h-6 mr-3"
              />
              <span className="font-medium">Connect with Outlook</span>
            </button>

            <div className="mt-4 text-xs text-gray-500">
              <p>By connecting your email, you authorize our application to send emails on your behalf. You can revoke this access at any time.</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}