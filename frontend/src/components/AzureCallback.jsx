import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from './ToastProvider';

const AzureCallback = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          const data = await authService.azureLogin();
          
          if (data.token) {
            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem("role", String(data.role).trim());
            localStorage.setItem("token", String(data.token).trim());

            showToast("Azure login successful! Redirecting...", "success");
            navigate("/newrequest");
          }
        } else {
          throw new Error('No authorization code received');
        }
      } catch (error) {
        console.error('Azure callback error:', error);
        showToast("Azure login failed. Please try again.", "error");
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Processing Azure login...</p>
      </div>
    </div>
  );
};

export default AzureCallback;
