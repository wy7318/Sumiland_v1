import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, CheckCircle, RefreshCw, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            setLoading(true);

            // Simply check if we have a valid session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!session?.user) {
                throw new Error('No active password reset session. Please use the link from your email.');
            }

            console.log('✅ Password reset session active for:', session.user.email);
            setUser(session.user);

        } catch (err) {
            console.error('Session check error:', err);
            setError(err instanceof Error ? err.message : 'Invalid session');
        } finally {
            setLoading(false);
        }
    };

    const validatePassword = (pwd: string) => {
        const errors = [];
        if (pwd.length < 8) errors.push('at least 8 characters');
        if (!/[A-Z]/.test(pwd)) errors.push('one uppercase letter');
        if (!/[a-z]/.test(pwd)) errors.push('one lowercase letter');
        if (!/[0-9]/.test(pwd)) errors.push('one number');
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!user) {
            setError('No active session. Please request a new password reset.');
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
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess('Password updated successfully! Redirecting to login...');

            // Sign out and redirect
            setTimeout(async () => {
                await supabase.auth.signOut();
                navigate('/login', {
                    state: {
                        message: 'Password updated successfully. Please login with your new password.',
                        email: user.email
                    }
                });
            }, 2000);

        } catch (err) {
            console.error('Update error:', err);
            setError(err instanceof Error ? err.message : 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
                >
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Success!</h2>
                    <p className="text-gray-600">{success}</p>
                </motion.div>
            </div>
        );
    }

    if (error && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login', { state: { requestReset: true } })}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        Request New Reset Link
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
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
                        Reset Your Password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter a new password for {user?.email}
                    </p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Enter new password"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="confirm-password"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li className={password.length >= 8 ? 'text-green-600' : ''}>
                                • At least 8 characters
                            </li>
                            <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                                • One uppercase letter
                            </li>
                            <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                                • One lowercase letter
                            </li>
                            <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                                • One number
                            </li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}