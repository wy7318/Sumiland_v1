import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { connectGmail, connectOutlook, saveEmailConfig } from '../../lib/email';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function EmailConfigModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Configure Google login
  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.send',
    onError: (error) => {
      console.error('Google login error:', error);
      setError('Failed to connect to Gmail');
      setLoading(false);
    }
  });

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      let config;
      if (provider === 'gmail') {
        // Get Google access token
        const response = await googleLogin();
        if (!response?.access_token) {
          throw new Error('No access token received from Google');
        }
        config = await connectGmail(response);
      } else {
        config = await connectOutlook();
      }

      // Save the configuration
      const { error: saveError } = await saveEmailConfig(user.id, config);
      if (saveError) throw saveError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error connecting email:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect email account');
    } finally {
      setLoading(false);
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
              Choose your email provider to connect your account. This will allow you to send emails directly from the dashboard.
            </p>

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
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}