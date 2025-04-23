import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, EyeOff, Eye, Shield, CheckCircle, AlertCircle, RefreshCw, User } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Adjust path as needed
import { cn } from '../lib/utils'; // Adjust path as needed

export default function SetPasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [canSetPassword, setCanSetPassword] = useState(false);
    const [userEmail, setUserEmail] = useState<string>('');
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        const handleInvitationLink = async () => {
            try {
                setInitialLoading(true);

                // Check for invitation token in URL parameters
                const hashParams = new URLSearchParams(location.hash.substring(1));
                const queryParams = new URLSearchParams(location.search);

                // Look for different possible parameters - invitation could be in either place
                const inviteToken =
                    hashParams.get('invitation_token') ||
                    queryParams.get('invitation_token') ||
                    hashParams.get('token') ||
                    queryParams.get('token');

                const type = hashParams.get('type') || queryParams.get('type');

                if (!inviteToken) {
                    throw new Error('No invitation token found');
                }

                // For invitation flows, we first need to verify the token
                // This creates a session for the user
                const { data, error: verifyError } = await supabase.auth.verifyOtp({
                    token_hash: inviteToken,
                    type: 'invite',
                });

                if (verifyError) {
                    throw verifyError;
                }

                // Now we should have a session
                const { data: sessionData } = await supabase.auth.getSession();

                if (!sessionData.session) {
                    throw new Error('Failed to create session from invitation');
                }

                // Get user details to display
                setUserEmail(sessionData.session.user.email || '');
                setUserName(sessionData.session.user.user_metadata?.name || '');

                setCanSetPassword(true);
            } catch (err) {
                console.error('Error processing invitation:', err);
                setError(err instanceof Error ? err.message : 'Failed to process invitation');
                setCanSetPassword(false);
            } finally {
                setInitialLoading(false);
            }
        };

        handleInvitationLink();
    }, [location]);

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;
        if (!canSetPassword) {
            setError('Cannot set password. Please check your invitation link.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Update user's password and remove the requires_password_setup flag
            const { error: updateError } = await supabase.auth.updateUser({
                password,
                data: {
                    requires_password_setup: false
                }
            });

            if (updateError) throw updateError;

            setSuccess(true);

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                navigate('/dashboard'); // Adjust to your main dashboard route
            }, 3000);

        } catch (err) {
            console.error('Error setting password:', err);
            setError(err instanceof Error ? err.message : 'Failed to set password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white shadow-lg rounded-2xl overflow-hidden"
            >
                <div className="p-6 flex justify-center items-center border-b border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-500" />
                        Set Your Password
                    </h1>
                </div>

                <div className="p-6">
                    {initialLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                            <p className="text-gray-600">Verifying your invitation...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 bg-red-50 p-4 rounded-lg text-red-700 flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {success ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8"
                                >
                                    <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome to the Platform!</h2>
                                    <p className="text-gray-600 mb-4">
                                        Your password has been set successfully. You'll be redirected to the dashboard shortly.
                                    </p>
                                    <button
                                        onClick={() => navigate('/dashboard')} // Adjust to your dashboard route
                                        className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
                                    >
                                        Go to Dashboard Now
                                    </button>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSetPassword} className="space-y-5">
                                    {userEmail && (
                                        <div className="bg-blue-50 p-4 rounded-lg text-blue-700 flex items-start gap-3 mb-6">
                                            <User className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium">Welcome, {userName || userEmail}!</p>
                                                <p className="text-sm mt-1">
                                                    Please set a password to complete your account setup.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Key className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className={cn(
                                                    "block w-full pl-10 pr-10 py-3 rounded-lg border focus:ring-2 focus:outline-none transition-all",
                                                    validationErrors.password
                                                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                                        : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
                                                )}
                                                placeholder="Enter a secure password"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                        {validationErrors.password && (
                                            <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Key className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="confirmPassword"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={cn(
                                                    "block w-full pl-10 pr-10 py-3 rounded-lg border focus:ring-2 focus:outline-none transition-all",
                                                    validationErrors.confirmPassword
                                                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                                        : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
                                                )}
                                                placeholder="Confirm your password"
                                            />
                                        </div>
                                        {validationErrors.confirmPassword && (
                                            <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 -mx-6 -mb-6 p-6 pt-5 rounded-b-2xl border-t border-gray-100">
                                        <button
                                            type="submit"
                                            disabled={loading || !canSetPassword}
                                            className={cn(
                                                "flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-medium transition-all shadow-sm",
                                                loading || !canSetPassword
                                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                    : "bg-gradient-to-r from-primary-500 to-violet-500 text-white hover:shadow-md"
                                            )}
                                        >
                                            {loading ? (
                                                <>
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                    Setting Password...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-5 h-5" />
                                                    Complete Setup
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}