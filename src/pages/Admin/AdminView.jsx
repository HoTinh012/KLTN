import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Users, Folder, TrendingUp, CheckCircle, Clock, Search, User, Filter, ShieldCheck, Mail, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AdminView({ user, activeTab }) {
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState({ svEmail: '', reviewerEmail: '', councilID: '' });

  useEffect(() => {
    fetchData();
  }, [user.Email]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getMasterData();
      setMasterData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Đang kết nối hệ thống quản trị...</div>;
  if (!masterData) return <div style={{ color: 'red', padding: '2rem' }}>Lỗi tải dữ liệu Master Data.</div>;

  const students = masterData.users.filter(u => (u.Role || '').toLowerCase().includes('sinhvien') && u.Major === user.Major);
  const lecturers = masterData.users.filter(u => (u.Role || '').toLowerCase().includes('giangvien') && u.Major === user.Major);
  const kltnPending = masterData.linkGiangvien.filter(r => r.Role === 'KLTN' && (!r.ReviewerEmail || !r.CouncilID));

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await api.assignTBM({ ...assignment, loaiDeTai: 'KLTN' });
      alert('Phân công thành công!');
      setAssignment({ svEmail: '', reviewerEmail: '', councilID: '' });
      fetchData();
    } catch (err) { alert('Lỗi phân công!'); }
  };

  const handleTogglePeriod = async (period) => {
    const newStatus = !(period.Active === 'Yes' || period.Active === 'true' || period.Active === true);
    try {
      await api.updatePeriod({ periodName: period.Dot, major: period.Major, type: period.Loaidetai, isActive: newStatus });
      alert(`Đã ${newStatus ? 'Mở' : 'Đóng'} đợt thành công!`);
      fetchData();
    } catch (err) { alert('Lỗi!'); }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="SINH VIÊN NĂM CUỐI" val={students.length} icon={Users} color="#004b91" />
        <StatCard title="HỘI ĐỒNG HD/PB" val={lecturers.length} icon={ShieldCheck} color="#059669" />
        <StatCard title="ĐỢT ĐANG MỞ" val={masterData.dots.filter(d => d.Active === 'Yes').length} icon={Calendar} color="#7c3aed" />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'assign' && (
          <motion.div key="assign" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '24px' }}>Phân công Phản biện & Hội đồng</h2>
             <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
                <div className="card-flat">
                   <h3 style={{ marginBottom: '20px', fontWeight: '800', fontSize: '1rem' }}>BIỂU MẪU PHÂN CÔNG</h3>
                   <form onSubmit={handleAssign}>
                      <div style={{ marginBottom: '16px' }}>
                         <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>SINH VIÊN ĐANG CHỜ</label>
                         <select required style={selectStyle} onChange={e => setAssignment({...assignment, svEmail: e.target.value})}>
                            <option value="">-- Chọn sinh viên --</option>
                            {kltnPending.map(s => <option key={s.EmailSV} value={s.EmailSV}>{s.EmailSV}</option>)}
                         </select>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                         <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>GIẢNG VIÊN PHẢN BIỆN</label>
                         <select required style={selectStyle} onChange={e => setAssignment({...assignment, reviewerEmail: e.target.value})}>
                            <option value="">-- Chọn GVPB --</option>
                            {lecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten}</option>)}
                         </select>
                      </div>
                      <div style={{ marginBottom: '24px' }}>
                         <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>MÃ/TÊN HỘI ĐỒNG</label>
                         <input type="text" placeholder="VD: Hội đồng 01, HD-KLTN..." style={selectStyle} required
                                onChange={e => setAssignment({...assignment, councilID: e.target.value})} />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px' }}>BẮT ĐẦU PHÂN CÔNG</button>
                   </form>
                </div>

                <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
                   <table style={{ width: '100%' }}>
                      <thead>
                         <tr>
                            <th>SV KLTN</th>
                            <th>GV HƯỚNG DẪN</th>
                            <th>GV PHẢN BIỆN</th>
                            <th>HỘI ĐỒNG</th>
                         </tr>
                      </thead>
                      <tbody>
                         {masterData.linkGiangvien.filter(r => r.Role === 'KLTN').map((r, idx) => (
                            <tr key={idx} className="table-row">
                               <td style={{ fontWeight: '800' }}>{r.EmailSV}</td>
                               <td style={{ fontSize: '0.85rem' }}>{r.EmailGV}</td>
                               <td>
                                  {r.ReviewerEmail ? <span style={{ color: 'var(--success)', fontWeight: '700' }}>{r.ReviewerEmail}</span> : <span style={{ color: '#ef4444' }}>Chờ TBM...</span>}
                               </td>
                               <td>
                                  {r.CouncilID ? <span style={{ fontWeight: '700' }}>{r.CouncilID}</span> : '---'}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </motion.div>
        )}

        {/* CÁC TAB KHÁC NHƯ MANAGEMENT VÀ PERIODS GIỮ LOGIC NHƯ CŨ NHƯNG UPDATE CSS */}
        {activeTab === 'periods' && (
           <motion.div key="periods" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '24px' }}>Quản lý đợt đăng ký</h2>
              <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
                 <table style={{ width: '100%' }}>
                    <thead>
                       <tr>
                          <th>TÊN ĐỢT</th>
                          <th>LOẠI</th>
                          <th>TRẠNG THÁI</th>
                          <th style={{ textAlign: 'right' }}>THAO TÁC</th>
                       </tr>
                    </thead>
                    <tbody>
                       {masterData.dots.map((d, idx) => {
                          const isActive = d.Active === 'Yes' || d.Active === 'true' || d.Active === true;
                          return (
                             <tr key={idx} className="table-row">
                                <td style={{ fontWeight: '800' }}>{d.Dot}</td>
                                <td>{d.Loaidetai}</td>
                                <td>
                                   <span style={{ padding: '6px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: '900', background: isActive ? '#dcfce7':'#fee2e2', color: isActive ? '#166534':'#991b1b' }}>
                                      {isActive ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                                   </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                   <button className={isActive ? 'btn-error':'btn-success'} onClick={() => handleTogglePeriod(d)} style={{ padding: '8px 16px' }}>
                                      {isActive ? 'ĐÓNG ĐỢT' : 'MỞ ĐỢT'}
                                   </button>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const StatCard = ({ title, val, icon: Icon, color }) => (
   <div className="card-flat" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
         <Icon size={28} />
      </div>
      <div>
         <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px' }}>{title}</p>
         <p style={{ fontSize: '1.6rem', fontWeight: '900' }}>{val}</p>
      </div>
   </div>
);

const selectStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', color: '#0f172a' };

export default AdminView;
