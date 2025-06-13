import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, CheckCircle, RefreshCw, Shield, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [debugInfo, setDebugInfo] = useState({});
    const [showDebug, setShowDebug] = useState(false);
    const processedRef = useRef(false);

    // Extract all possible tokens from URL
    const extractTokensFromUrl = () => {
        const tokens = {
            fromQuery: {
                access_token: searchParams.get('access_token'),
                refresh_token: searchParams.get('refresh_token'),
                type: searchParams.get('type'),
                error: searchParams.get('error'),
                error_description: searchParams.get('error_description')
            },
            fromHash: {},
            fullUrl: window.location.href,
            pathname: location.pathname,
            search: location.search,
            hash: location.hash
        };

        // Also check hash parameters
        if (window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            tokens.fromHash = {
                access_token: hashParams.get('access_token'),
                refresh_token: hashParams.get('refresh_token'),
                type: hashParams.get('type'),
                error: hashParams.get('error'),
                error_description: hashParams.get('error_description')
            };
        }

        return tokens;
    };

    useEffect(() => {
        let mounted = true;

        const handlePasswordReset = async () => {
            if (processedRef.current) return;
            processedRef.current = true;

            try {
                setLoading(true);
                setError(null);

                // Extract and log all token information
                const tokenInfo = extractTokensFromUrl();
                console.log('🔍 Full token analysis:', tokenInfo);
                setDebugInfo(tokenInfo);

                // Check for errors in URL first
                const urlError = tokenInfo.fromQuery.error || tokenInfo.fromHash.error;
                const urlErrorDesc = tokenInfo.fromQuery.error_description || tokenInfo.fromHash.error_description;

                if (urlError) {
                    throw new Error(`Authentication error: ${urlError}. ${urlErrorDesc || ''}`);
                }

                // Get tokens from either query or hash
                const accessToken = tokenInfo.fromQuery.access_token || tokenInfo.fromHash.access_token;
                const refreshToken = tokenInfo.fromQuery.refresh_token || tokenInfo.fromHash.refresh_token;
                const type = tokenInfo.fromQuery.type || tokenInfo.fromHash.type;

                console.log('🎫 Tokens found:', {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    type,
                    accessTokenLength: accessToken?.length,
                    refreshTokenLength: refreshToken?.length
                });

                // Validate this is a recovery flow
                if (type !== 'recovery') {
                    throw new Error(`Invalid link type: "${type}". Expected "recovery".`);
                }

                if (!accessToken || !refreshToken) {
                    throw new Error('Missing authentication tokens in URL. The reset link may be incomplete or corrupted.');
                }

                // Try to set session with extracted tokens
                console.log('🔄 Setting session with extracted tokens...');
                const { data, error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (sessionError) {
                    console.error('❌ Session error:', sessionError);
                    throw new Error(`Failed to establish session: ${sessionError.message}`);
                }

                if (!data?.session?.user) {
                    throw new Error('Session was created but no user data returned. The tokens may be expired.');
                }

                console.log('✅ Session established for user:', data.session.user.email);

                if (!mounted) return;

                setUser(data.session.user);
                sessionStorage.setItem('password-reset-mode', 'true');

                // Log user info
                const isNewUser = !data.session.user.last_sign_in_at ||
                    data.session.user.last_sign_in_at === data.session.user.created_at;

                console.log('👤 User details:', {
                    email: data.session.user.email,
                    isNewUser,
                    lastSignIn: data.session.user.last_sign_in_at,
                    createdAt: data.session.user.created_at,
                    userId: data.session.user.id
                });

            } catch (err) {
                console.error('💥 Password reset error:', err);
                if (!mounted) return;
                setError(err.message || 'Failed to process reset link. Please request a new password reset.');

                // Add specific troubleshooting info
                if (err.message?.includes('expired') || err.message?.includes('invalid')) {
                    setError(prev => prev + '\n\nThis usually happens when:\n• The reset link is older than 1 hour\n• The link has already been used\n• The link was forwarded or copied incorrectly');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Also listen for auth state changes as backup
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state change:', event, 'Has session:', !!session);

            if (!mounted) return;

            if (event === 'PASSWORD_RECOVERY' && session?.user) {
                console.log('🔐 Password recovery event with session');
                setUser(session.user);
                setError(null);
                sessionStorage.setItem('password-reset-mode', 'true');
            } else if (event === 'SIGNED_OUT') {
                console.log('👋 User signed out');
                setUser(null);
                sessionStorage.removeItem('password-reset-mode');
            }
        });

        // Start the password reset process
        handlePasswordReset();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []); // Run only once

    const validatePassword = (pwd) => {
        const errors = [];

        if (pwd.length < 8) {
            errors.push('at least 8 characters');
        }
        if (!/[A-Z]/.test(pwd)) {
            errors.push('one uppercase letter');
        }
        if (!/[a-z]/.test(pwd)) {
            errors.push('one lowercase letter');
        }
        if (!/[0-9]/.test(pwd)) {
            errors.push('one number');
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!user) {
            setError('No active session. Please use a fresh reset link from your email.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            setError(`Password must contain ${passwordErrors.join(', ')}`);
            return;
        }

        setLoading(true);

        try {
            console.log('🔄 Updating password for user:', user.email);

            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                throw updateError;
            }

            console.log('✅ Password updated successfully');
            setSuccess('Your password has been successfully set!');

            // Clear the password reset mode flag
            sessionStorage.removeItem('password-reset-mode');

            // Sign out and redirect
            setTimeout(async () => {
                await supabase.auth.signOut();
                navigate('/login', {
                    state: {
                        message: 'Password set successfully. Please login with your new password.',
                        email: user.email
                    }
                });
            }, 2000);

        } catch (err) {
            console.error('💥 Password update error:', err);
            setError(err.message || 'Failed to set password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyDebugInfo = () => {
        navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    };

    // Loading state
    if (loading && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
                    <p className="text-gray-600">Processing reset link...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Set Successfully!</h2>
                    <p className="text-gray-600 mb-6">
                        Your account is now ready. Redirecting to login...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8"
            >
                <div>
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
                        <Shield className="h-6 w-6 text-primary-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Set Your Password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {user ? `Please set a secure password for ${user.email}` : 'Processing your reset request...'}
                    </p>
                </div>

                {/* Session status */}
                <div className="text-center">
                    {user ? (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Reset link verified
                        </div>
                    ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Reset link not verified
                        </div>
                    )}
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-50 border border-red-200 p-4">
                            <div className="flex">
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="ml-3 flex-1">
                                    <h3 className="text-sm font-medium text-red-800">
                                        Password Reset Failed
                                    </h3>
                                    <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                                        {error}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/login')}
                                            className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                                        >
                                            ← Back to Login
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDebug(!showDebug)}
                                            className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded hover:bg-gray-200"
                                        >
                                            {showDebug ? 'Hide' : 'Show'} Debug Info
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Debug Information */}
                    {showDebug && (
                        <div className="bg-gray-100 rounded-lg p-4 text-xs">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-gray-900">Debug Information</h4>
                                <button
                                    type="button"
                                    onClick={copyDebugInfo}
                                    className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
                                >
                                    <Copy className="w-3 h-3" />
                                    Copy
                                </button>
                            </div>
                            <pre className="text-gray-700 overflow-x-auto">
                                {JSON.stringify(debugInfo, null, 2)}
                            </pre>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={!user || loading}
                                    className="block w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                                    placeholder="Enter your new password"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={!user || loading}
                                    className="block w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                                    placeholder="Confirm your new password"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Password requirements */}
                    {user && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li className="flex items-center">
                                    <span className={`mr-2 ${password.length >= 8 ? 'text-green-500' : 'text-gray-400'}`}>•</span>
                                    At least 8 characters
                                </li>
                                <li className="flex items-center">
                                    <span className={`mr-2 ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`}>•</span>
                                    One uppercase letter
                                </li>
                                <li className="flex items-center">
                                    <span className={`mr-2 ${/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`}>•</span>
                                    One lowercase letter
                                </li>
                                <li className="flex items-center">
                                    <span className={`mr-2 ${/[0-9]/.test(password) ? 'text-green-500' : 'text-gray-400'}`}>•</span>
                                    One number
                                </li>
                            </ul>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !user}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {loading ? 'Setting Password...' : 'Set Password'}
                        </button>
                    </div>

                    {!user && !loading && (
                        <div className="text-center space-y-2">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="text-primary-600 hover:text-primary-500 text-sm"
                            >
                                Try Again
                            </button>
                            <div className="text-gray-500 text-xs">or</div>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-gray-600 hover:text-gray-500 text-sm"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>
        </div>
    );
}