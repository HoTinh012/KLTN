import React, { useState } from 'react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } catch (err) {
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
        <div className="login-image-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '50%', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logoImage} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            </div>
            <div style={{ fontWeight: '900', fontSize: '1.4rem', letterSpacing: '1px' }}>HCM-UTE</div>
          </div>
        </div>

        <div className="login-image-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
             <img src={logoImage} alt="Logo" style={{ width: '50px' }} />
             <img src={taglineImage} alt="Tagline" style={{ height: '45px' }} />
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '2px', color: 'rgba(255,255,255,0.9)' }}>
             HỆ THỐNG QUẢN LÝ KHÓA LUẬN TRỰC TUYẾN
          </div>
        </div>
      </div>

      {/* Cánh phải: Form đăng nhập */}
      <div className="login-form-side">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logoImage} alt="Logo" style={{ width: '90px', marginBottom: '10px' }} />
          <div style={{ fontWeight: '900', color: '#004b91', fontSize: '1.2rem' }}>HCM-UTE</div>
        </div>

        <div className="login-card-elevated animate-fade-in">
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>ĐĂNG NHẬP</h1>
          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', marginBottom: '32px' }}>
            CHỌN PHƯƠNG THỨC TRUY CẬP
          </p>

          <form onSubmit={handleSubmit}>
            <div className="login-input-group">
              <label className="login-input-label">EMAIL NỘI BỘ HỆ THỐNG</label>
              <div className="login-input-wrapper">
                <Mail className="icon" size={20} />
                <input 
                  type="email" 
                  placeholder="MSSV @ @hcmute.edu.vn" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginBottom: '16px' }}>{error}</p>}

            <button type="submit" className="google-login-btn" disabled={loading}>
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" style={{ width: '24px' }} />
              {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP VỚI GOOGLE'}
            </button>
          </form>

          <div className="login-card-footer">
            Hãy sử dụng tài khoản email sinh viên/giảng viên được cấp
          </div>
        </div>

        <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '0.65rem', color: '#475569', fontWeight: '700' }}>
           © COPYRIGHT 2024 KH CÔNG NGHỆ KỸ THUẬT TP.HCM<br/>
           ALL RIGHTS RESERVED DEVELOPED BY ANTIGRAVITY
        </div>
      </div>
    </div>
  );
}

export default Login;
