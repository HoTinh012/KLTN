import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Folder, TrendingUp, Users, CheckCircle,
  Calendar, LogOut, Search, Bell, Settings, ChevronRight,
  Star, ShieldCheck, Home, FileText, Edit3, Layout, List, BarChart3
} from 'lucide-react';
import StudentView from './Student/StudentView';
import LecturerView from './Lecturer/LecturerView';
import AdminView from './Admin/AdminView';

import logoImage from '../assets/img/Logo HCM-UTE_ 1.png';

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const role = (user.Role || '').toLowerCase();
  const isStudent = role === 'sinhvien' || role === 'student';
  const isLecturer = role === 'giangvien' || role === 'lecturer';
  const isTBM = role === 'admin' || role === 'truongbm' || role === 'head' || role === 'tbm';

  const renderContent = () => {
    if (isStudent) return <StudentView user={user} activeTab={activeTab} />;
    if (isTBM) {
      // TBM cũng là GV → nếu tab thuộc GV thì render LecturerView
      const gvTabs = ['guidance', 'reviewer', 'council', 'president', 'secretary', 'suggestion', 'grading'];
      if (gvTabs.includes(activeTab)) return <LecturerView user={user} activeTab={activeTab} />;
      return <AdminView user={user} activeTab={activeTab} />;
    }
    if (isLecturer) return <LecturerView user={user} activeTab={activeTab} />;
    return <div>Vai trò "{user.Role}" không hợp lệ!</div>;
  };

  // === MENU DEFINITIONS ===

  const studentMenuItems = [
    { id: 'register', label: 'Đăng ký BCTT', icon: Folder },
    { id: 'register_kltn', label: 'Đăng ký KLTN', icon: Layout },
    { id: 'grades', label: 'Kết quả học tập', icon: CheckCircle }
  ];

  const lecturerMenuItems = [
    { id: 'guidance', label: 'Hướng dẫn', icon: CheckCircle },
    { id: 'reviewer', label: 'Phản biện', icon: ShieldCheck },
    { id: 'council', label: 'Hội đồng', icon: Users },
    { id: 'president', label: 'Chủ tịch', icon: Star },
    { id: 'secretary', label: 'Thư ký', icon: FileText },
    { id: 'suggestion', label: 'Gợi ý đề tài', icon: Edit3 },
    { id: 'grading', label: 'Chấm điểm', icon: Star },
  ];

  const adminMenuItems = [
    { id: 'management', label: 'Mở slot GVHD', icon: Users },
    { id: 'assign', label: 'Phân công PB/HD', icon: ShieldCheck },
    { id: 'thesis_list', label: 'Danh sách đề tài', icon: List },
    { id: 'council_admin', label: 'Hội đồng', icon: Users },
    { id: 'president_admin', label: 'Chủ tịch', icon: Star },
    { id: 'stats', label: 'Thống kê', icon: BarChart3 },
    { id: 'periods', label: 'Quản lý Đợt', icon: Calendar },
  ];

  let menuItems = [{ id: 'home', label: 'Thông tin chung', icon: Home }];

  if (isStudent) menuItems = [...menuItems, ...studentMenuItems];
  if (isLecturer) menuItems = [...menuItems, ...lecturerMenuItems];
  if (isTBM) {
    // TBM = Trưởng bộ môn menu + Giảng viên menu (vì TBM cũng là GV)
    menuItems = [
      ...menuItems,
      { type: 'divider', label: 'TRƯỞNG BỘ MÔN' },
      ...adminMenuItems,
      { type: 'divider', label: 'GIẢNG VIÊN' },
      ...lecturerMenuItems,
    ];
  }

  const roleLabel = isTBM ? 'Trưởng BM' : isLecturer ? 'Giảng viên' : 'Sinh viên';

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-box">
            <img src={logoImage} alt="UTE Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </div>
          <div className="logo-text">
            UNIT THESIS<br />
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
            {roleLabel}
          </div>
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="menu-container">
            {menuItems.map((item, idx) => {
              if (item.type === 'divider') {
                return <div key={idx} className="menu-label" style={{ color: 'rgba(255,255,255,0.5)', marginTop: '16px' }}>{item.label}</div>;
              }
              return (
                <button
                  key={item.id}
                  className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="logout-section">
          <button onClick={handleLogout} className="menu-item" style={{ color: '#ff6b6b' }}>
            <LogOut size={18} />
            ĐĂNG XUẤT
          </button>
        </div>
      </aside>

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

      <main className="main-content">
        <div className="animate-fade-in" style={{ width: '100%' }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
