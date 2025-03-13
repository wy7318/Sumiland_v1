import { useGoogleLogin } from '@react-oauth/google';

export const useGmailLogin = () => {
  return useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.send',
    onSuccess: (response) => {
      return response;
    },
    onError: (error) => {
      console.error('Google login error:', error);
      throw error;
    }
  });
};