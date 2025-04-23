import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, EyeOff, Eye, Shield, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function ChangePasswordPage() {
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [authenticated, setAuthenticated] = useState(false);

    // Check authentication status on component mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Get current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;

                if (session) {
                    // User is authenticated
                    setAuthenticated(true);
                } else {
                    // No session, user needs to complete the auth flow
                    setError('You must follow the link from your email to reset your password');
                }
            } catch (err) {
                console.error('Authentication error:', err);
                setError(err instanceof Error ? err.message : 'Authentication error');
            } finally {
                setInitialLoading(false);
            }
        };

        checkAuth();
    }, []);

    const validateForm = () => {
        const errors = {};

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

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;
        if (!authenticated) {
            setError('You need to be authenticated to change your password');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Update user's password
            const { error: updateError } = await supabase.auth.updateUser({
                password
            });

            if (updateError) throw updateError;

            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error('Error changing password:', err);
            setError(err instanceof Error ? err.message : 'Failed to change password');
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
                        Set New Password
                    </h1>
                </div>

                <div className="p-6">
                    {initialLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                            <p className="text-gray-600">Verifying your account...</p>
                        </div>
                    ) : (
                        <>
                            {!authenticated && error ? (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 bg-red-50 p-4 rounded-lg text-red-700 flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p>{error}</p>
                                        <a
                                            href="/reset-password"
                                            className="block mt-2 text-sm font-medium text-red-700 hover:text-red-800"
                                        >
                                            Return to password reset page
                                        </a>
                                    </div>
                                </motion.div>
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
                                            <h2 className="text-xl font-bold text-gray-800 mb-2">Password Changed Successfully</h2>
                                            <p className="text-gray-600 mb-4">
                                                Your password has been updated. You will be redirected to the login page shortly.
                                            </p>
                                            <button
                                                onClick={() => navigate('/login')}
                                                className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
                                            >
                                                Go to Login Now
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <form onSubmit={handleChangePassword} className="space-y-5">
                                            <div className="bg-blue-50 p-4 rounded-lg text-blue-700 flex items-start gap-3 mb-6">
                                                <Key className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-medium">Create a strong password</p>
                                                    <p className="text-sm mt-1">
                                                        Choose a secure password that you don't use elsewhere.
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                                    New Password
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
                                                        placeholder="Enter your new password"
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
                                                        placeholder="Confirm your new password"
                                                    />
                                                </div>
                                                {validationErrors.confirmPassword && (
                                                    <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                                                )}
                                            </div>

                                            <div className="pt-3">
                                                <button
                                                    type="submit"
                                                    disabled={loading || !authenticated}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-medium transition-all shadow-sm",
                                                        loading || !authenticated
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : "bg-gradient-to-r from-primary-500 to-violet-500 text-white hover:shadow-md"
                                                    )}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                                            Updating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-5 h-5" />
                                                            Change Password
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}