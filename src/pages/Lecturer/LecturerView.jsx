import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Check, X, FileText, Star, Clock, CheckCircle, Users, Mail, Search, Edit3, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LecturerView({ user, activeTab }) {
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState({ emailSV: '', title: '' });
  const [gradingForm, setGradingForm] = useState(null);

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

  if (loading) return <div style={{ padding: '2rem' }}>Đang tải danh sách công việc...</div>;
  if (!masterData) return <div style={{ color: 'red', padding: '2rem' }}>Lỗi tải dữ liệu Master Data.</div>;

  // Lọc sinh viên theo 3 vai trò: HD, PB, Hội đồng
  const hdStudents = masterData.linkGiangvien.filter(r => String(r.EmailGV).toLowerCase() === user.Email.toLowerCase());
  const pbStudents = masterData.linkGiangvien.filter(r => String(r.ReviewerEmail).toLowerCase() === user.Email.toLowerCase());
  const councilStudents = masterData.linkGiangvien.filter(r => String(r.CouncilID).includes(user.Email) || String(r.CouncilID).includes(user.Ten));

  const handleApprove = async (emailSV, status) => {
    const title = editingTitle.emailSV === emailSV ? editingTitle.title : '';
    try {
      await api.approveTopicBulk({
        emailGV: user.Email,
        svEmails: [emailSV],
        status: status,
        newTitle: title
      });
      alert(`Đã ${status === 'Approved' ? 'Duyệt' : 'Từ chối'} thành công!`);
      setEditingTitle({ emailSV: '', title: '' });
      fetchData();
    } catch (err) { alert('Lỗi thao tác!'); }
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    try {
      await api.submitGrade(gradingForm);
      alert('Nhập điểm thành công!');
      setGradingForm(null);
      fetchData();
    } catch (err) { alert('Lỗi nhập điểm!'); }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <AnimatePresence mode="wait">
        {activeTab === 'home' && <HomeView user={user} hd={hdStudents} pb={pbStudents} council={councilStudents} masterData={masterData} />}
        
        {activeTab === 'guidance' && (
          <motion.div key="guidance" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '24px' }}>Phê duyệt đề tài (Giai đoạn BCTT/KLTN)</h2>
            <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>SINH VIÊN</th>
                    <th>LOẠI</th>
                    <th>ĐỀ TÀI / CÔNG TY</th>
                    <th>PHÊ DUYỆT & ĐỔI TÊN</th>
                  </tr>
                </thead>
                <tbody>
                  {hdStudents.map(s => {
                    const sub = masterData.linkBainop.find(b => b.EmailSV === s.EmailSV && b.Loai === s.Role) || {};
                    const isNew = s.End === 'New';
                    return (
                      <tr key={s.EmailSV} className="table-row">
                        <td><div style={{ fontWeight: '700' }}>{s.EmailSV}</div></td>
                        <td><span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#eff6ff', color: '#1e40af', padding: '4px 8px', borderRadius: '4px' }}>{s.Role}</span></td>
                        <td>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{sub.TenDeTai || '---'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.CongTy} | {sub.MangDeTai}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                            {isNew ? (
                              <>
                                <input 
                                  type="text" 
                                  placeholder="Sửa tên đề tài (nếu cần)..." 
                                  style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '200px' }}
                                  onChange={(e) => setEditingTitle({ emailSV: s.EmailSV, title: e.target.value })}
                                />
                                <button className="btn-success" onClick={() => handleApprove(s.EmailSV, 'Approved')} style={{ padding: '8px' }}><Check size={18} /></button>
                                <button className="btn-error" onClick={() => handleApprove(s.EmailSV, 'Rejected')} style={{ padding: '8px' }}><X size={18} /></button>
                              </>
                            ) : (
                              <span style={{ color: 'var(--success)', fontWeight: '800', fontSize: '0.8rem' }}>✓ ĐÃ DUYỆT</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'grading' && (
           <motion.div key="grading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Chấm điểm & Đánh giá</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Nhập điểm và nhận xét cho các vai trò Hướng dẫn, Phản biện và Hội đồng.</p>
              
              <div className="card-flat">
                 <h3 style={{ marginBottom: '20px', fontWeight: '800' }}>DANH SÁCH CHẤM ĐIỂM</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {hdStudents.map(s => <GradingCard key={s.EmailSV} s={s} role="GVHD" onOpen={() => setGradingForm({ emailSV: s.EmailSV, role: 'GVHD', loaiDeTai: s.Role, grade: '', comment: '' })} />)}
                    {pbStudents.map(s => <GradingCard key={s.EmailSV} s={s} role="GVPB" onOpen={() => setGradingForm({ emailSV: s.EmailSV, role: 'GVPB', loaiDeTai: s.Role, grade: '', comment: '' })} />)}
                    {councilStudents.map(s => <GradingCard key={s.EmailSV} s={s} role="HD" onOpen={() => setGradingForm({ emailSV: s.EmailSV, role: 'HD', loaiDeTai: s.Role, grade: '', comment: '', councilMinutes: '' })} />)}
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL NHẬP ĐIỂM */}
      {gradingForm && (
        <div className="modal-overlay">
          <div className="card-flat" style={{ width: '500px', padding: '32px' }}>
             <h3 style={{ marginBottom: '24px', fontWeight: '800' }}>Chấm điểm: {gradingForm.emailSV}</h3>
             <form onSubmit={handleSubmitGrade}>
                <label style={{ display: 'block', marginBottom: '16px' }}>
                   <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>VAI TRÒ: {gradingForm.role}</span>
                   <input type="number" step="0.1" max="10" required placeholder="Nhập điểm (0-10)..." className="input-field" 
                          onChange={e => setGradingForm({...gradingForm, grade: e.target.value})} style={{ width: '100%', padding: '12px' }} />
                </label>
                <label style={{ display: 'block', marginBottom: '16px' }}>
                   <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>NHẬN XÉT / GÓP Ý</span>
                   <textarea required className="input-field" placeholder="Nhập ý kiến chuyên môn..." rows="4" 
                             onChange={e => setGradingForm({...gradingForm, comment: e.target.value})} style={{ width: '100%', padding: '12px' }}></textarea>
                </label>
                {gradingForm.role === 'HD' && (
                   <label style={{ display: 'block', marginBottom: '20px' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>LINK BIÊN BẢN HỘI ĐỒNG (Nếu có)</span>
                      <input type="text" className="input-field" placeholder="Dán link biên bản..." 
                             onChange={e => setGradingForm({...gradingForm, councilMinutes: e.target.value})} style={{ width: '100%', padding: '12px' }} />
                   </label>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                   <button type="submit" className="btn-primary" style={{ flex: 2 }}>LƯU KẾT QUẢ</button>
                   <button type="button" onClick={() => setGradingForm(null)} className="btn-secondary" style={{ flex: 1 }}>HỦY</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeView({ user, hd, pb, council, masterData }) {
   return (
      <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
         <div className="card-flat">
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Hộp thư Phê Duyệt</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Chào mừng Giảng viên {user.Ten}.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
               <StatCard title="HƯỚNG DẪN" val={hd.length} icon={Users} color="#004b91" />
               <StatCard title="PHẢN BIỆN" val={pb.length} icon={ShieldCheck} color="#059669" />
               <StatCard title="HỘI ĐỒNG" val={council.length} icon={Users} color="#7c3aed" />
            </div>
         </div>
      </motion.div>
   );
}

const StatCard = ({ title, val, icon: Icon, color }) => (
   <div style={{ padding: '24px', background: `${color}10`, borderRadius: '12px', border: `1px solid ${color}30` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: color, marginBottom: '12px' }}>
         <Icon size={20} /> <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>{title}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: '900', color: color }}>{val}</div>
   </div>
);

const GradingCard = ({ s, role, onOpen }) => (
   <div className="table-row" style={{ padding: '20px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
         <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)' }}>Mã SV: {s.EmailSV}</p>
            <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Loại: {s.Role}</p>
         </div>
         <span style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontWeight: '800' }}>{role}</span>
      </div>
      <button className="btn-primary" onClick={onOpen} style={{ width: '100%', fontSize: '0.8rem', padding: '10px' }}><Star size={16} /> Chấm điểm ngay</button>
   </div>
);

export default LecturerView;
