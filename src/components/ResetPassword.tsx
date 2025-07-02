
// // src/pages/ResetPassword.tsx
// import { useState, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { supabase } from '../lib/supabase';

// export default function ResetPassword() {
//     const [password, setPassword] = useState('');
//     const [confirmPassword, setConfirmPassword] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
//     const [isValidSession, setIsValidSession] = useState(false);
//     const [checkingSession, setCheckingSession] = useState(true);

//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();

//     useEffect(() => {
//         const checkSession = async () => {
//             try {
//                 // Debug: Log the full URL to see what we're working with
//                 console.log('Full URL:', window.location.href);
//                 console.log('Hash:', window.location.hash);
//                 console.log('Search:', window.location.search);

//                 // First, let Supabase handle any auth callback from the URL
//                 const { data: { session }, error } = await supabase.auth.getSession();

//                 if (error) {
//                     console.error('Session error:', error);
//                     setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
//                     setIsValidSession(false);
//                 } else if (session) {
//                     console.log('Found valid session:', session);
//                     setIsValidSession(true);
//                 } else {
//                     // If no session, check for auth parameters in URL
//                     const hashParams = new URLSearchParams(window.location.hash.substring(1));
//                     const urlParams = new URLSearchParams(window.location.search);

//                     // Debug: Log all parameters
//                     console.log('Hash parameters:', [...hashParams.entries()]);
//                     console.log('URL parameters:', [...urlParams.entries()]);

//                     // Check for various auth parameters
//                     const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
//                     const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
//                     const tokenHash = hashParams.get('token_hash') || urlParams.get('token_hash');
//                     const type = hashParams.get('type') || urlParams.get('type');
//                     const token = hashParams.get('token') || urlParams.get('token');

//                     console.log('Extracted parameters:', {
//                         accessToken: !!accessToken,
//                         refreshToken: !!refreshToken,
//                         tokenHash: !!tokenHash,
//                         type,
//                         token: !!token
//                     });

//                     if (accessToken && refreshToken) {
//                         // Set the session from URL parameters
//                         const { error: sessionError } = await supabase.auth.setSession({
//                             access_token: accessToken,
//                             refresh_token: refreshToken
//                         });

//                         if (sessionError) {
//                             console.error('Session setting error:', sessionError);
//                             setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
//                             setIsValidSession(false);
//                         } else {
//                             setIsValidSession(true);
//                             // Clean up the URL
//                             window.history.replaceState({}, document.title, window.location.pathname);
//                         }
//                     } else if (type === 'recovery' || token) {
//                         // This is likely a PKCE flow - wait for Supabase to process it
//                         console.log('Detected recovery type or token, waiting for Supabase to process...');

//                         // Enable detectSessionInUrl temporarily for this
//                         const originalDetectSessionInUrl = supabase.auth.getSession;

//                         // Wait a bit for Supabase to process the callback
//                         setTimeout(async () => {
//                             const { data: { session: delayedSession } } = await supabase.auth.getSession();
//                             console.log('Delayed session check:', !!delayedSession);
//                             if (delayedSession) {
//                                 setIsValidSession(true);
//                                 setCheckingSession(false);
//                             } else {
//                                 // Try to manually handle the token if present
//                                 if (token && type === 'recovery') {
//                                     try {
//                                         const { data, error: verifyError } = await supabase.auth.verifyOtp({
//                                             token_hash: token,
//                                             type: 'recovery'
//                                         });

//                                         if (!verifyError && data.session) {
//                                             setIsValidSession(true);
//                                             setCheckingSession(false);
//                                             return;
//                                         }
//                                     } catch (e) {
//                                         console.error('Manual token verification failed:', e);
//                                     }
//                                 }

//                                 setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
//                                 setIsValidSession(false);
//                                 setCheckingSession(false);
//                             }
//                         }, 2000); // Increased timeout
//                         return; // Don't set checkingSession to false yet
//                     } else {
//                         console.log('No valid parameters found for password reset');
//                         setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
//                         setIsValidSession(false);
//                     }
//                 }
//             } catch (error) {
//                 console.error('Error checking session:', error);
//                 setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
//                 setIsValidSession(false);
//             } finally {
//                 setCheckingSession(false);
//             }
//         };

//         // Set up auth state change listener
//         const { data: { subscription } } = supabase.auth.onAuthStateChange(
//             async (event, session) => {
//                 console.log('Auth state change:', event, !!session);

//                 if (event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
//                     setIsValidSession(true);
//                     setCheckingSession(false);
//                 } else if (event === 'SIGNED_IN' && session) {
//                     setIsValidSession(true);
//                     setCheckingSession(false);
//                 }
//             }
//         );

//         checkSession();

//         // Cleanup subscription
//         return () => {
//             subscription.unsubscribe();
//         };
//     }, []);

//     const handlePasswordReset = async (e: React.FormEvent) => {
//         e.preventDefault();

//         if (!password || !confirmPassword) {
//             setMessage({ type: 'error', text: 'Please fill in all fields' });
//             return;
//         }

//         if (password !== confirmPassword) {
//             setMessage({ type: 'error', text: 'Passwords do not match' });
//             return;
//         }

//         if (password.length < 6) {
//             setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
//             return;
//         }

//         setLoading(true);
//         setMessage(null);

//         try {
//             const { error } = await supabase.auth.updateUser({
//                 password: password
//             });

//             if (error) {
//                 setMessage({ type: 'error', text: error.message });
//             } else {
//                 setMessage({
//                     type: 'success',
//                     text: 'Password updated successfully! Redirecting to login...'
//                 });

//                 // Sign out the user and redirect to login after a delay
//                 setTimeout(async () => {
//                     await supabase.auth.signOut();
//                     navigate('/login');
//                 }, 2000);
//             }
//         } catch (error) {
//             setMessage({
//                 type: 'error',
//                 text: 'An unexpected error occurred. Please try again.'
//             });
//             console.error('Password update error:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     if (checkingSession) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gray-50">
//                 <div className="flex items-center space-x-2">
//                     <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                     </svg>
//                     <span className="text-gray-600">Verifying reset link...</span>
//                 </div>
//             </div>
//         );
//     }

//     if (!isValidSession) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
//                 <div className="max-w-md w-full space-y-8">
//                     <div className="text-center">
//                         <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
//                             Invalid Reset Link
//                         </h2>
//                         <p className="mt-2 text-sm text-gray-600">
//                             This password reset link is invalid or has expired.
//                         </p>
//                         {message && (
//                             <div className="mt-4 rounded-md p-4 bg-red-50 text-red-800 border border-red-200">
//                                 <p className="text-sm">{message.text}</p>
//                             </div>
//                         )}
//                         <div className="mt-6">
//                             <button
//                                 onClick={() => navigate('/forgot-password')}
//                                 className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
//                             >
//                                 Request a new reset link
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
//             <div className="max-w-md w-full space-y-8">
//                 <div>
//                     <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
//                         Set new password
//                     </h2>
//                     <p className="mt-2 text-center text-sm text-gray-600">
//                         Enter your new password below.
//                     </p>
//                 </div>

//                 <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
//                     <div className="space-y-4">
//                         <div>
//                             <label htmlFor="password" className="sr-only">
//                                 New Password
//                             </label>
//                             <input
//                                 id="password"
//                                 name="password"
//                                 type="password"
//                                 autoComplete="new-password"
//                                 required
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
//                                 placeholder="New password"
//                                 disabled={loading}
//                             />
//                         </div>

//                         <div>
//                             <label htmlFor="confirmPassword" className="sr-only">
//                                 Confirm New Password
//                             </label>
//                             <input
//                                 id="confirmPassword"
//                                 name="confirmPassword"
//                                 type="password"
//                                 autoComplete="new-password"
//                                 required
//                                 value={confirmPassword}
//                                 onChange={(e) => setConfirmPassword(e.target.value)}
//                                 className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
//                                 placeholder="Confirm new password"
//                                 disabled={loading}
//                             />
//                         </div>
//                     </div>

//                     {message && (
//                         <div className={`rounded-md p-4 ${message.type === 'success'
//                                 ? 'bg-green-50 text-green-800 border border-green-200'
//                                 : 'bg-red-50 text-red-800 border border-red-200'
//                             }`}>
//                             <p className="text-sm">{message.text}</p>
//                         </div>
//                     )}

//                     <div>
//                         <button
//                             type="submit"
//                             disabled={loading}
//                             className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                             {loading ? (
//                                 <div className="flex items-center">
//                                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                     </svg>
//                                     Updating...
//                                 </div>
//                             ) : (
//                                 'Update password'
//                             )}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// }



// src/pages/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const checkSession = async () => {
            try {
                // Debug: Log the full URL to see what we're working with
                console.log('Full URL:', window.location.href);
                console.log('Hash:', window.location.hash);
                console.log('Search:', window.location.search);

                // First, let Supabase handle any auth callback from the URL
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Session error:', error);
                    setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
                    setIsValidSession(false);
                } else if (session) {
                    console.log('Found valid session:', session);
                    setIsValidSession(true);
                } else {
                    // If no session, check for auth parameters in URL
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const urlParams = new URLSearchParams(window.location.search);

                    // Debug: Log all parameters
                    console.log('Hash parameters:', [...hashParams.entries()]);
                    console.log('URL parameters:', [...urlParams.entries()]);

                    // Check for various auth parameters
                    const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
                    const tokenHash = hashParams.get('token_hash') || urlParams.get('token_hash');
                    const type = hashParams.get('type') || urlParams.get('type');
                    const token = hashParams.get('token') || urlParams.get('token');

                    console.log('Extracted parameters:', {
                        accessToken: !!accessToken,
                        refreshToken: !!refreshToken,
                        tokenHash: !!tokenHash,
                        type,
                        token: !!token
                    });

                    if (accessToken && refreshToken) {
                        // Set the session from URL parameters
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });

                        if (sessionError) {
                            console.error('Session setting error:', sessionError);
                            setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
                            setIsValidSession(false);
                        } else {
                            setIsValidSession(true);
                            // Clean up the URL
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } else if (type === 'recovery' || token) {
                        // This is likely a PKCE flow - wait for Supabase to process it
                        console.log('Detected recovery type or token, waiting for Supabase to process...');

                        // Enable detectSessionInUrl temporarily for this
                        const originalDetectSessionInUrl = supabase.auth.getSession;

                        // Wait a bit for Supabase to process the callback
                        setTimeout(async () => {
                            const { data: { session: delayedSession } } = await supabase.auth.getSession();
                            console.log('Delayed session check:', !!delayedSession);
                            if (delayedSession) {
                                setIsValidSession(true);
                                setCheckingSession(false);
                            } else {
                                // Try to manually handle the token if present
                                if (token && type === 'recovery') {
                                    try {
                                        const { data, error: verifyError } = await supabase.auth.verifyOtp({
                                            token_hash: token,
                                            type: 'recovery'
                                        });

                                        if (!verifyError && data.session) {
                                            setIsValidSession(true);
                                            setCheckingSession(false);
                                            return;
                                        }
                                    } catch (e) {
                                        console.error('Manual token verification failed:', e);
                                    }
                                }

                                setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
                                setIsValidSession(false);
                                setCheckingSession(false);
                            }
                        }, 2000); // Increased timeout
                        return; // Don't set checkingSession to false yet
                    } else {
                        console.log('No valid parameters found for password reset');
                        setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
                        setIsValidSession(false);
                    }
                }
            } catch (error) {
                console.error('Error checking session:', error);
                setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
                setIsValidSession(false);
            } finally {
                setCheckingSession(false);
            }
        };

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state change:', event, !!session);

                if (event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
                    setIsValidSession(true);
                    setCheckingSession(false);
                } else if (event === 'SIGNED_IN' && session) {
                    setIsValidSession(true);
                    setCheckingSession(false);
                }
            }
        );

        checkSession();

        // Cleanup subscription
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            setMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            } else {
                setMessage({
                    type: 'success',
                    text: 'Password updated successfully! Redirecting to login...'
                });

                // Sign out the user and redirect to login after a delay
                setTimeout(async () => {
                    await supabase.auth.signOut();
                    navigate('/login');
                }, 2000);
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: 'An unexpected error occurred. Please try again.'
            });
            console.error('Password update error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Verifying reset link...</span>
                </div>
            </div>
        );
    }

    if (!isValidSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                            Invalid Reset Link
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            This password reset link is invalid or has expired.
                        </p>
                        {message && (
                            <div className="mt-4 rounded-md p-4 bg-red-50 text-red-800 border border-red-200">
                                <p className="text-sm">{message.text}</p>
                            </div>
                        )}
                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/forgot-password')}
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Request a new reset link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Set new password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your new password below.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="sr-only">
                                New Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="New password"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="sr-only">
                                Confirm New Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm new password"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`rounded-md p-4 ${message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            <p className="text-sm">{message.text}</p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </div>
                            ) : (
                                'Update password'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}