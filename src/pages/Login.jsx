import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { LogIn, Mail } from 'lucide-react';

// Import các ảnh cục bộ từ thư mục assets/img
import bgImage from '../assets/img/background.jpg';
import logoImage from '../assets/img/Logo HCM-UTE_ 1.png';
import taglineImage from '../assets/img/B_Tagline - HCM-UTE - 1.png';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // REPLACE THIS WITH YOUR ACTUAL GOOGLE CLIENT ID
  const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });
    }
  }, []);

  async function handleGoogleCredentialResponse(response) {
    try {
      setLoading(true);
      setError('');
      
      // Decode JWT to get email
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const googleEmail = payload.email;

      console.log("Google Login Email:", googleEmail);

      const res = await api.login(googleEmail);
      if (res.success) {
        onLogin(res.user);
        navigate('/');
      } else {
        setError(res.message || 'Email Google này không tồn tại trong hệ thống!');
      }
    } catch (err) {
      console.error("Lỗi đăng nhập Google:", err);
      setError('Lỗi xác thực Google. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleBtnClick = () => {
    if (window.google) {
      google.accounts.id.prompt(); // Thử hiển thị One Tap
      // Nếu không hiện One Tap, có thể dùng renderButton hoặc chọn tài khoản
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback if one-tap is not available
          console.log("One Tap not displayed, showing account selector...");
        }
      });
    } else {
      setError('Google API chưa tải xong. Vui lòng làm mới trang.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập email!');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await api.login(email);
      if (response.success) {
        onLogin(response.user);
        navigate('/');
      } else {
        setError(response.message || 'Email không tồn tại trong hệ thống!');
      }
    } catch {
      setError('Lỗi kết nối server. Hãy kiểm tra AppScript URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-container">
      {/* Cánh trái: Hình ảnh cổng trường HCMUTE */}
      <div className="login-image-side" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="login-image-overlay" />

        <div className="login-image-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
            <img src={taglineImage} alt="Tagline" style={{ height: '55px' }} />
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '2px', color: 'rgba(255,255,255,1)' }}>
            HỆ THỐNG QUẢN LÝ KHÓA LUẬN TRỰC TUYẾN
          </div>
        </div>
      </div>

      {/* Cánh phải: Form đăng nhập */}
      <div className="login-form-side">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logoImage} alt="Logo" style={{ width: '100px', marginBottom: '10px' }} />
        </div>

        <div className="login-card-elevated animate-fade-in">
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>XÁC THỰC</h1>
          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', marginBottom: '32px' }}>
            QUẢN LÝ KHÓA LUẬN & BCTT
          </p>

          <form onSubmit={handleSubmit}>
            <div className="login-input-group">
              <label className="login-input-label">EMAIL HỆ THỐNG</label>
              <div className="login-input-wrapper">
                <Mail className="icon" size={20} />
                <input
                  type="email"
                  placeholder="name@hcmute.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginBottom: '16px', fontWeight: '600' }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary-blue" style={{ width: '100%', marginBottom: '20px' }} disabled={loading}>
              <LogIn size={20} />
              {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#cbd5e1' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ padding: '0 15px', fontSize: '0.75rem', fontWeight: '700' }}>HOẶC</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          </div>

          <button 
            className="google-login-btn-outline" 
            style={{ width: '100%' }}
            onClick={handleGoogleBtnClick}
            type="button"
            disabled={loading}
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" style={{ width: '22px' }} />
            TRUY CẬP VỚI GOOGLE
          </button>

          <div className="login-card-footer">
            Sử dụng tài khoản @hcmute.edu.vn hoặc @student.hcmute.edu.vn
          </div>
        </div>

        <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '0.65rem', color: '#475569', fontWeight: '700' }}>
          © COPYRIGHT 2024 TRƯỜNG ĐH SPKT TP.HCM<br />
          HỆ THỐNG QUẢN LÝ CHUYÊN MÔN KHOA CÔNG NGHỆ HÓA HỌC & THỰC PHẨM
        </div>
      </div>
    </div>
  );
}

export default Login;
