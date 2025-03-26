import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, AlertCircle } from 'lucide-react';
// import { sendEmail } from '../../lib/email';
import { useAuth } from '../../contexts/AuthContext';
import 'react-quill/dist/quill.snow.css';
import ReactQuill from 'react-quill';
import { useGoogleLogin } from '@react-oauth/google';
import { getEmailConfig, connectGmail, saveEmailConfig, sendEmail } from '../../lib/email';



type Props = {
  to: string;
  onClose: () => void;
  onSuccess: () => void;
  caseTitle?: string; // <-- add this
};


const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean'],
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'align',
  'link', 'image',
];


export function EmailModal({ to, onClose, onSuccess, caseTitle }: Props) {
  // const [subject, setSubject] = useState(caseTitle ? `[${caseTitle}]` : '');

  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState(caseTitle ? `[${caseTitle}]` : '');
  const [toAddress, setToAddress] = useState(to);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);



  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.send',
    onSuccess: async (tokenResponse) => {
      if (!user) return;
      const config = await connectGmail(tokenResponse);
      const { error: saveError } = await saveEmailConfig(user.id, config);

      console.log('[Reauth] Saving config:', config);

      if (saveError) {
        console.error('[Reauth] Failed to save config:', saveError);
        setError('Failed to re-authenticate Gmail');
        setLoading(false);
        return;
      } else {

      // if (saveError) {
      //   setError('Failed to re-authenticate Gmail');
      // } else {
        // Try sending email again
        try {
          await sendEmail(user.id, toAddress, subject, body, cc, bcc);

          onSuccess();
        } catch (retryErr) {
          setError('Still failed after re-auth: ' + retryErr.message);
        }
      }
      setLoading(false);
    },
    onError: () => {
      setError('Gmail login failed');
      setLoading(false);
    },
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const config = await getEmailConfig(user.id);

      console.log('config : ' + config);

      if (!config || Date.now() >= config.expiresAt) {
        // Token expired or not available — reauthenticate
        alert('Email token expired. Re-authenticating Gmail...');
        googleLogin(); // this will handle reconnect and retry
        return;
      }

      // Token is good — send email
      await sendEmail(user.id, to, subject, body, cc, bcc);

      onSuccess();
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
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
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Send Email</h2>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="email"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
              required
            />
          </div>

          {/* Show/hide CC/BCC */}
          <div className="text-sm text-primary-600 hover:underline cursor-pointer mb-2" onClick={() => setShowCcBcc(!showCcBcc)}>
            {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
          </div>

          {showCcBcc && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                />
              </div>
            </>
          )}


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <div className="rounded-lg overflow-hidden border border-gray-300">
              <ReactQuill
                theme="snow"
                value={body}
                onChange={setBody}
                modules={modules}
                formats={formats}
                className="h-[200px] overflow-y-auto"
              />
            </div>

          </div>


          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}