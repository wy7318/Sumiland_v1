import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSessionEstablished, setIsSessionEstablished] = useState(false);

    // Handle the auth parameters from URL when component mounts
    useEffect(() => {
        // This is critical: process the hash parameters when the component loads
        const handleHashChange = async () => {
            try {
                setLoading(true);

                // This will automatically process the hash parameters in the URL
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (data?.session) {
                    setIsSessionEstablished(true);
                } else {
                    setError('Invalid or expired reset link. Please request a new password reset.');
                }
            } catch (err) {
                setError(err.message || 'Failed to verify reset link');
            } finally {
                setLoading(false);
            }
        };

        handleHashChange();

        // Also set up a listener for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsSessionEstablished(true);
            }
        });

        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!isSessionEstablished) {
            setError('Authentication session not established. Please try using the reset link again.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess('Your password has been successfully reset');

            // Sign out after password reset
            await supabase.auth.signOut();

            setTimeout(() => {
                navigate('/login', {
                    state: { message: 'Password reset successful. Please login with your new password.' }
                });
            }, 3000);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8"
            >
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter a new password for your account
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <AlertCircle className="h-5 w-5 text-red-400" />
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                        Password reset failed
                                    </h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        {error}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="rounded-md bg-green-50 p-4">
                            <div className="flex">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                                <div className="ml-3">
                                    <div className="text-sm text-green-800">
                                        {success}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="password" className="sr-only">
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
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                                    placeholder="New password"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">
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
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !isSessionEstablished}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Reset password'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}