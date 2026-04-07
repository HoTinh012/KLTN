import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Folder, TrendingUp, Users, CheckCircle, 
  Calendar, LogOut, Search, Bell, Settings, ChevronRight,
  Star, ShieldCheck
} from 'lucide-react';
import StudentView from './Student/StudentView';
import LecturerView from './Lecturer/LecturerView';
import AdminView from './Admin/AdminView';

// Import Logo cục bộ
import logoImage from '../assets/img/Logo HCM-UTE_ 1.png';

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const renderContent = () => {
    const role = user.Role.toLowerCase();
    if (role === 'sinhvien' || role === 'student') {
      return <StudentView user={user} activeTab={activeTab} />;
    } else if (role === 'giangvien' || role === 'lecturer') {
      return <LecturerView user={user} activeTab={activeTab} />;
    } else if (role === 'admin' || role === 'truongbm' || role === 'head' || role === 'tbm') {
      return <AdminView user={user} activeTab={activeTab} />;
    } else {
      return <div>Vai trò "{user.Role}" không hợp lệ!.</div>;
    }
  };

  const menuItems = [
    { id: 'home', label: 'TỔNG QUAN HỆ THỐNG', icon: User },
    ...((user.Role.toLowerCase() === 'sinhvien' || user.Role.toLowerCase() === 'student') ? [
      { id: 'register', label: 'Đăng ký đề tài', icon: Folder },
      { id: 'status', label: 'Theo dõi tiến độ', icon: TrendingUp },
      { id: 'grades', label: 'Kết quả học tập', icon: CheckCircle }
    ] : []),
    ...((user.Role.toLowerCase() === 'giangvien' || user.Role.toLowerCase() === 'lecturer') ? [
      { id: 'guidance', label: 'PHÊ DUYỆT & HD', icon: Folder },
      { id: 'grading', label: 'Chấm điểm & Đánh giá', icon: Star },
      { id: 'review', label: 'DANH SÁCH ĐỀ TÀI', icon: CheckCircle },
      { id: 'council', label: 'HỘI ĐỒNG BẢO VỆ', icon: Calendar }
    ] : []),
    ...(['admin', 'truongbm', 'head', 'tbm'].includes(user.Role.toLowerCase()) ? [
      { id: 'management', label: 'Quản lý Đào tạo', icon: Users },
      { id: 'assign', label: 'Phân công & Hội đồng', icon: ShieldCheck },
      { id: 'periods', label: 'Quản lý Đợt', icon: Calendar },
      { id: 'stats', label: 'Thống kê', icon: TrendingUp }
    ] : []),
  ];

  return (
    <div className="layout-container">
      {/* Sidebar - Khớp 100% mẫu ảnh */}
      <aside className="sidebar">
        <div className="logo-section">
           <div className="logo-box">
              <img src={logoImage} alt="UTE Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
           </div>
           <div className="logo-text">
              UNIT THESIS<br/>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>HCMUTE ONLINE SYSTEM</span>
           </div>
        </div>

        <div className="sidebar-user">
           <div className="sidebar-avatar">
              <img src={`https://ui-avatars.com/api/?name=${user.Ten}&background=004b91&color=fff`} alt="User avatar" />
           </div>
           <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px', textAlign: 'center' }}>{user.Ten}</div>
           <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', textAlign: 'center' }}>{user.MS}</div>
           <div style={{ fontSize: '0.65rem', fontWeight: '800', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', color: '#fff' }}>
              {user.Role}
           </div>
        </div>

        <div className="menu-container">
           <div className="menu-label" style={{ color: 'rgba(255,255,255,0.6)' }}>CHỨC NĂNG</div>
           {menuItems.map(item => (
             <button
               key={item.id}
               className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
               onClick={() => setActiveTab(item.id)}
             >
               <item.icon size={18} />
               {item.label}
             </button>
           ))}
        </div>

        <div className="logout-section">
           <button onClick={handleLogout} className="menu-item" style={{ color: '#ff6b6b' }}>
              <LogOut size={18} />
              ĐĂNG XUẤT
           </button>
        </div>
      </aside>

      {/* Top Header */}
      <header className="header">
         <div className="header-search">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Tìm kiếm sinh viên, đề tài, giảng viên..." />
         </div>

         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.Ten}</div>
               <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.MS}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
               <User size={20} />
            </div>
         </div>
      </header>

      {/* Main Content - Full width */}
      <main className="main-content">
        <div className="animate-fade-in" style={{ width: '100%' }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
