import React, { useState, useEffect } from 'react';
import api, { lookupName } from '../../api';
import { Users, Folder, TrendingUp, CheckCircle, Clock, Search, User, Filter, ShieldCheck, Mail, Calendar, List, Star, FileText, BarChart3, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AdminView({ user, activeTab }) {
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [user.Email]);

  const fetchData = async () => {
    setLoading(true);
    try { setMasterData(await api.getMasterData()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Đang kết nối hệ thống quản trị...</div>;
  if (!masterData) return <div style={{ color: 'red', padding: '2rem' }}>Lỗi tải dữ liệu Master Data.</div>;

  const allReg = masterData.linkGiangvien || [];
  const users = masterData.users || [];
  const students = users.filter(u => (u.Role || '').toLowerCase().includes('sinhvien') || (u.Role || '').toLowerCase() === 'student');
  const lecturers = users.filter(u => {
    const r = (u.Role||'').toLowerCase();
    return r.includes('giangvien') || r === 'lecturer' || r === 'tbm';
  });
  const bcttCount = allReg.filter(r => r.Role === 'GVHD' && String(r.Link).trim() === 'BCTT').length + allReg.filter(r => r.Role === 'BCTT').length;
  const kltnCount = allReg.filter(r => r.Role === 'GVHD' && String(r.Link).trim() === 'KLTN').length + allReg.filter(r => r.Role === 'KLTN').length;
  const activeDots = (masterData.dots || []).filter(d => String(d.Active || '').toLowerCase() === 'yes' || d.Active === true).length;

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="SINH VIÊN" val={students.length} icon={Users} color="#004b91" />
        <StatCard title="GIẢNG VIÊN" val={lecturers.length} icon={User} color="#059669" />
        <StatCard title="BCTT / KLTN" val={`${bcttCount} / ${kltnCount}`} icon={Folder} color="#7c3aed" />
        <StatCard title="ĐỢT ĐANG MỞ" val={activeDots} icon={Calendar} color="#ea580c" />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'home' && <AdminHome user={user} masterData={masterData} />}
        {activeTab === 'management' && <QuotaManagement lecturers={lecturers} masterData={masterData} onRefresh={fetchData} user={user} />}
        {activeTab === 'assign' && <AssignmentView masterData={masterData} lecturers={lecturers} onRefresh={fetchData} user={user} />}
        {activeTab === 'thesis_list' && <ThesisListView masterData={masterData} />}
        {activeTab === 'council_admin' && <CouncilManagement masterData={masterData} lecturers={lecturers} onRefresh={fetchData} />}
        {activeTab === 'president_admin' && <PresidentManagement masterData={masterData} />}
        {activeTab === 'stats' && <StatsView masterData={masterData} />}
        {activeTab === 'periods' && <PeriodsView masterData={masterData} onRefresh={fetchData} user={user} />}
      </AnimatePresence>
    </div>
  );
}

// ===================== ADMIN HOME =====================
function AdminHome({ user, masterData }) {
  const allReg = masterData.linkGiangvien || [];

  // Đề tài chờ GV duyệt lần đầu
  const pendingApproval = allReg.filter(r =>
    (r.Role === 'GVHD' || r.Role === 'BCTT' || r.Role === 'KLTN') &&
    (!r.End || r.End === 'Registered' || r.End === 'New')
  ).length;

  // KLTN đã GV duyệt nhưng chưa có GVPB
  const pendingGVPB = allReg.filter(r => {
    const isKLTN = (r.Role === 'GVHD' && String(r.Link).trim() === 'KLTN') || r.Role === 'KLTN';
    const hasGVPB = allReg.some(x => String(x.EmailSV).toLowerCase() === String(r.EmailSV).toLowerCase() && x.Role === 'GVPB');
    return isKLTN && !hasGVPB && (r.End === 'Approved' || r.End === 'Yes');
  }).length;

  // KLTN đã qua Turnitin (Graded) nhưng chưa có Hội đồng
  const pendingCouncil = allReg.filter(r => {
    const isKLTN = (r.Role === 'GVHD' && String(r.Link).trim() === 'KLTN') || r.Role === 'KLTN';
    const hasCouncil = allReg.some(x => String(x.EmailSV).toLowerCase() === String(r.EmailSV).toLowerCase() && x.Role === 'CTHD');
    return isKLTN && r.End === 'Graded' && !hasCouncil;
  }).length;

  // KLTN SV đã nộp bản sửa, chờ GVHD xác nhận
  const pendingRevision = allReg.filter(r =>
    (r.Role === 'GVHD' && String(r.Link).trim() === 'KLTN') &&
    r.End === 'Revised'
  ).length;

  const cards = [
    { label: 'ĐỀ TÀI CHờ GV DUYỆT', count: pendingApproval, color: '#ea580c', desc: 'BCTT + KLTN mới đăng ký chưa được phê duyệt' },
    { label: 'KLTN CHờ PHÂN GVPB', count: pendingGVPB, color: '#7c3aed', desc: 'KLTN đã GV duyệt, TBM cần phân công GV Phản biện' },
    { label: 'KLTN CHờ LẬP HỘI ĐỒNG', count: pendingCouncil, color: '#0891b2', desc: 'Đã qua Turnitin, TBM cần lập Hướng + lịch bảo vệ' },
    { label: 'KLTN CHờ GVHD XÁC NHẬN', count: pendingRevision, color: '#059669', desc: 'SV đã nộp bản sửa, GVHD chưa xác nhận' },
  ];

  return (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Tổng quan Hệ thống</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {cards.map((c, i) => (
          <div key={i} className="card-flat" style={{ borderLeft: `4px solid ${c.color}` }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: c.color, letterSpacing: '1px', marginBottom: '8px' }}>{c.label}</p>
            <p style={{ fontSize: '2.2rem', fontWeight: '900', color: c.count > 0 ? c.color : '#94a3b8', lineHeight: 1 }}>{c.count}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>{c.desc}</p>
          </div>
        ))}
      </div>

      {(pendingApproval + pendingGVPB + pendingCouncil + pendingRevision) === 0 && (
        <div className="card-flat" style={{ textAlign: 'center', color: '#059669', padding: '32px' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: '800' }}>✅ Tất cả quy trình đã cập nhật!</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Không có đề tài nào đang chờ xử lý.</p>
        </div>
      )}
    </motion.div>
  );
}

// ===================== QUOTA MANAGEMENT =====================
function QuotaManagement({ lecturers, masterData, onRefresh, user }) {
  const quotas = masterData.quotas || [];
  
  const handleUpdateQuota = async (emailGV, quota) => {
    try {
      await api.updateQuota({ emailGV, quota });
      alert('Đã cập nhật chỉ tiêu!'); onRefresh();
    } catch (err) { alert('Lỗi cập nhật!'); }
  };

  return (
    <motion.div key="management" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Quản lý Chỉ tiêu Hướng dẫn (Quota)</h2>
      <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%' }}>
          <thead><tr><th>GIẢNG VIÊN</th><th>EMAIL</th><th>NGÀNH</th><th>ĐANG HD</th><th>CHỈ TIÊU</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {lecturers.map(l => {
              const q = quotas.find(q => String(q.EmailGV || q.Email || '').toLowerCase() === l.Email.toLowerCase());
              const currentHD = (masterData.linkGiangvien || []).filter(r => String(r.EmailGV).toLowerCase() === l.Email.toLowerCase() && r.Role === 'GVHD').length;
              const currentQuota = q ? (q.Quota || q.SoLuong || 15) : 15;
              return (
                <tr key={l.Email} className="table-row">
                  <td style={{ fontWeight: '700' }}>{l.Ten}</td>
                  <td style={{ fontSize: '0.8rem' }}>{l.Email}</td>
                  <td>{l.Major || '---'}</td>
                  <td><span style={{ fontWeight: '800', color: currentHD >= currentQuota ? '#ef4444' : '#059669' }}>{currentHD}</span></td>
                  <td>
                    <input type="number" defaultValue={currentQuota} id={`quota-${l.Email}`}
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'center' }} />
                  </td>
                  <td>
                    <button className="btn-success" style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                      onClick={() => handleUpdateQuota(l.Email, document.getElementById(`quota-${l.Email}`).value)}>Lưu</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ===================== ASSIGNMENT (Phân công GVPB) =====================
function AssignmentView({ masterData, lecturers, onRefresh, user }) {
  const [form, setForm] = useState({ svEmail: '', reviewerEmail: '' });
  const allReg = masterData.linkGiangvien || [];
  const users = masterData.users || [];
  
  // SV KLTN đã approved nhưng chưa có GVPB
  const kltnApproved = allReg.filter(r => {
    const isKLTN = (r.Role === 'GVHD' && String(r.Link).trim() === 'KLTN') || r.Role === 'KLTN';
    const isApproved = r.End === 'Approved' || r.End === 'Yes' || r.End === 'Graded';
    const hasGVPB = allReg.some(x => String(x.EmailSV).toLowerCase() === String(r.EmailSV).toLowerCase() && x.Role === 'GVPB');
    return isKLTN && isApproved && !hasGVPB;
  });

  // Tất cả KLTN registrations
  const allKLTN = allReg.filter(r => (r.Role === 'GVHD' && String(r.Link).trim() === 'KLTN') || r.Role === 'KLTN');

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await api.assignGVPB({ svEmail: form.svEmail, reviewerEmail: form.reviewerEmail, loaiDeTai: 'KLTN' });
      alert('Phân công GVPB thành công!');
      setForm({ svEmail: '', reviewerEmail: '' });
      onRefresh();
    } catch (err) { alert('Lỗi phân công!'); }
  };

  return (
    <motion.div key="assign" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Phân công Giảng viên Phản biện</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' }}>
        <div className="card-flat">
          <h3 style={{ marginBottom: '20px', fontWeight: '800', fontSize: '1rem' }}>PHÂN CÔNG GVPB</h3>
          <form onSubmit={handleAssign}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>SINH VIÊN CHỜ GVPB ({kltnApproved.length})</label>
              <select required style={selectStyle} value={form.svEmail} onChange={e => setForm({...form, svEmail: e.target.value})}>
                <option value="">-- Chọn sinh viên --</option>
                {kltnApproved.map((s,i) => <option key={i} value={s.EmailSV}>{lookupName(s.EmailSV, users)} ({s.EmailSV})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>GIẢNG VIÊN PHẢN BIỆN</label>
              <select required style={selectStyle} value={form.reviewerEmail} onChange={e => setForm({...form, reviewerEmail: e.target.value})}>
                <option value="">-- Chọn GVPB --</option>
                {lecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary-blue" style={{ width: '100%', padding: '14px' }}>XÁC NHẬN PHÂN CÔNG GVPB</button>
          </form>
        </div>

        <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h4 style={{ fontWeight: '800', fontSize: '0.9rem' }}>TRẠNG THÁI PHÂN CÔNG KLTN</h4>
          </div>
          <table style={{ width: '100%' }}>
            <thead><tr><th>SINH VIÊN</th><th>GVHD</th><th>GVPB</th><th>HỘI ĐỒNG</th></tr></thead>
            <tbody>
              {allKLTN.map((r, idx) => {
                const gvpb = allReg.find(x => String(x.EmailSV).toLowerCase() === String(r.EmailSV).toLowerCase() && x.Role === 'GVPB');
                const council = allReg.filter(x => String(x.EmailSV).toLowerCase() === String(r.EmailSV).toLowerCase() && ['CTHD','TVHD1','TVHD2','ThukyHD'].includes(x.Role));
                return (
                  <tr key={idx} className="table-row">
                    <td><div style={{ fontWeight: '700' }}>{lookupName(r.EmailSV, users)}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.EmailSV}</div></td>
                    <td style={{ fontSize: '0.8rem' }}>{lookupName(r.EmailGV, users)}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {gvpb ? <span style={{ color: 'var(--success)', fontWeight: '700' }}>{lookupName(gvpb.EmailGV, users)}</span> : <span style={{ color: '#ef4444' }}>Chờ TBM...</span>}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>
                      {council.length > 0 ? <span style={{ color: 'var(--success)', fontWeight: '700' }}>{council.length} thành viên</span> : <span style={{ color: '#94a3b8' }}>---</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ===================== THESIS LIST =====================
function ThesisListView({ masterData }) {
  const allReg = masterData.linkGiangvien || [];
  const users = masterData.users || [];
  // Chỉ hiện GVHD records (mỗi SV 1 row)
  const gvhdRecords = allReg.filter(r => r.Role === 'GVHD' || r.Role === 'BCTT' || r.Role === 'KLTN');

  return (
    <motion.div key="thesis_list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Danh sách Đề tài ({gvhdRecords.length})</h2>
      <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%' }}>
          <thead><tr><th>SINH VIÊN</th><th>ĐỀ TÀI</th><th>LOẠI</th><th>GVHD</th><th>TRẠNG THÁI</th></tr></thead>
          <tbody>
            {gvhdRecords.map((r, idx) => {
              const sub = (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(r.EmailSV).toLowerCase()) || {};
              const loai = String(r.Link || r.Role || '').trim();
              const endVal = String(r.End || 'Registered').trim();
              const colorMap = { Registered: '#64748b', Approved: '#2563eb', Graded: '#7c3aed', Completed: '#059669', Yes: '#059669', Rejected: '#ef4444' };
              return (
                <tr key={idx} className="table-row">
                  <td><div style={{ fontWeight: '700' }}>{lookupName(r.EmailSV, users)}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.EmailSV}</div></td>
                  <td style={{ fontSize: '0.85rem' }}>{sub.Tendetai || '---'}</td>
                  <td><span style={{ fontSize: '0.7rem', fontWeight: '800', background: loai === 'KLTN' ? '#dcfce7' : '#eff6ff', color: loai === 'KLTN' ? '#166534' : '#1e40af', padding: '4px 8px', borderRadius: '4px' }}>{loai}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{lookupName(r.EmailGV, users)}</td>
                  <td><span style={{ fontWeight: '800', color: colorMap[endVal] || '#64748b', fontSize: '0.82rem' }}>{endVal}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ===================== COUNCIL MANAGEMENT =====================
function CouncilManagement({ masterData, lecturers, onRefresh }) {
  const [form, setForm] = useState({ svEmail: '', cthd: '', tvhd1: '', tvhd2: '', thuky: '', diadiem: '' });
  const allReg = masterData.linkGiangvien || [];
  const users = masterData.users || [];

  // KLTN đã qua Turnitin (End=Graded) và chưa có hội đồng
  const eligibleSV = allReg.filter(r => {
    const isKLTN = (r.Role === 'GVHD' && String(r.Link).trim() === 'KLTN') || r.Role === 'KLTN';
    const isGraded = r.End === 'Graded'; // Chỉ sau khi GV upload Turnitin và duyệt
    const hasCouncil = allReg.some(x => String(x.EmailSV).toLowerCase() === String(r.EmailSV).toLowerCase() && x.Role === 'CTHD');
    return isKLTN && isGraded && !hasCouncil;
  });

  // Existing councils
  const existingCouncils = {};
  allReg.filter(r => ['CTHD','TVHD1','TVHD2','ThukyHD'].includes(r.Role)).forEach(r => {
    const key = String(r.EmailSV).toLowerCase();
    if (!existingCouncils[key]) existingCouncils[key] = [];
    existingCouncils[key].push(r);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createCouncil({ ...form, loaiDeTai: 'KLTN' });
      alert('Tạo hội đồng thành công!');
      setForm({ svEmail: '', cthd: '', tvhd1: '', tvhd2: '', thuky: '', diadiem: '' });
      onRefresh();
    } catch(e) { alert('Lỗi!'); }
  };

  return (
    <motion.div key="council_admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Quản lý Hội đồng chấm</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px' }}>
        <div className="card-flat">
          <h3 style={{ marginBottom: '20px', fontWeight: '800', fontSize: '1rem' }}><Plus size={16} /> TẠO HỘI ĐỒNG MỚI</h3>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>SINH VIÊN</label>
              <select required style={selectStyle} value={form.svEmail} onChange={e => setForm({...form, svEmail: e.target.value})}>
                <option value="">-- Chọn SV --</option>
                {eligibleSV.map((s,i) => <option key={i} value={s.EmailSV}>{lookupName(s.EmailSV, users)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>CHỦ TỊCH HĐ</label>
              <select required style={selectStyle} value={form.cthd} onChange={e => setForm({...form, cthd: e.target.value})}>
                <option value="">-- Chọn --</option>
                {lecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>THÀNH VIÊN 1</label>
              <select required style={selectStyle} value={form.tvhd1} onChange={e => setForm({...form, tvhd1: e.target.value})}>
                <option value="">-- Chọn --</option>
                {lecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>THÀNH VIÊN 2</label>
              <select style={selectStyle} value={form.tvhd2} onChange={e => setForm({...form, tvhd2: e.target.value})}>
                <option value="">-- Không chọn --</option>
                {lecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>THƯ KÝ</label>
              <select required style={selectStyle} value={form.thuky} onChange={e => setForm({...form, thuky: e.target.value})}>
                <option value="">-- Chọn --</option>
                {lecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>ĐỊA ĐIỂM</label>
              <input type="text" style={selectStyle} value={form.diadiem} onChange={e => setForm({...form, diadiem: e.target.value})} placeholder="VD: P.301 B2" />
            </div>
            <button type="submit" className="btn-primary-blue" style={{ width: '100%', padding: '14px' }}>TẠO HỘI ĐỒNG</button>
          </form>
        </div>

        <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h4 style={{ fontWeight: '800', fontSize: '0.9rem' }}>HỘI ĐỒNG ĐÃ TẠO ({Object.keys(existingCouncils).length})</h4>
          </div>
          {Object.keys(existingCouncils).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Chưa có hội đồng nào.</div>
          ) : (
            <div style={{ padding: '16px' }}>
              {Object.entries(existingCouncils).map(([svEmail, members]) => (
                <div key={svEmail} className="card-flat" style={{ marginBottom: '12px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: '800', marginBottom: '8px' }}>{lookupName(svEmail, users)}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{svEmail}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {members.map((m, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontWeight: '700' }}>
                        {m.Role}: {lookupName(m.EmailGV, users)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ===================== PRESIDENT MANAGEMENT =====================
function PresidentManagement({ masterData }) {
  const allReg = masterData.linkGiangvien || [];
  const users = masterData.users || [];
  const cthdRecords = allReg.filter(r => r.Role === 'CTHD');

  return (
    <motion.div key="president_admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Quản lý Chủ tịch Hội đồng</h2>
      <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%' }}>
          <thead><tr><th>SINH VIÊN</th><th>CHỦ TỊCH HĐ</th><th>ĐỊA ĐIỂM</th><th>TRẠNG THÁI</th></tr></thead>
          <tbody>
            {cthdRecords.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có hội đồng nào.</td></tr>}
            {cthdRecords.map((r, idx) => (
              <tr key={idx} className="table-row">
                <td><div style={{ fontWeight: '700' }}>{lookupName(r.EmailSV, users)}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.EmailSV}</div></td>
                <td style={{ fontWeight: '700' }}>{lookupName(r.EmailGV, users)}</td>
                <td>{r.Diadiem || '---'}</td>
                <td><span style={{ fontWeight: '800', color: r.End === 'Yes' ? '#059669' : '#64748b' }}>{r.End || 'Chờ'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ===================== STATISTICS =====================
function StatsView({ masterData }) {
  const allReg = masterData.linkGiangvien || [];
  const users = masterData.users || [];

  // Count by status
  const statusCounts = {};
  allReg.filter(r => r.Role === 'GVHD' || r.Role === 'BCTT' || r.Role === 'KLTN').forEach(r => {
    const s = String(r.End || 'Registered').trim();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  // Count by GV
  const gvCounts = {};
  allReg.filter(r => r.Role === 'GVHD').forEach(r => {
    const gv = r.EmailGV || 'Unknown';
    gvCounts[gv] = (gvCounts[gv] || 0) + 1;
  });

  const maxGV = Math.max(...Object.values(gvCounts), 1);
  const statusColors = { Registered: '#64748b', Approved: '#2563eb', Graded: '#7c3aed', Completed: '#059669', Yes: '#059669', Rejected: '#ef4444', New: '#f59e0b' };

  const totalBCTT = allReg.filter(r => String(r.Link).trim() === 'BCTT' || r.Role === 'BCTT').length;
  const totalKLTN = allReg.filter(r => String(r.Link).trim() === 'KLTN' || r.Role === 'KLTN').length;
  const completedBCTT = allReg.filter(r => (String(r.Link).trim() === 'BCTT' || r.Role === 'BCTT') && (r.End === 'Completed' || r.End === 'Yes' || r.End === 'Pass')).length;
  const completedKLTN = allReg.filter(r => (String(r.Link).trim() === 'KLTN' || r.Role === 'KLTN') && (r.End === 'Completed' || r.End === 'Yes' || r.End === 'Pass')).length;

  return (
    <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Thống kê Hệ thống</h2>

      {/* Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="card-flat" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>BÁO CÁO THỰC TẬP</p>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#004b91" strokeWidth="12" strokeDasharray={`${(completedBCTT/Math.max(totalBCTT,1))*314} 314`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>{totalBCTT > 0 ? Math.round(completedBCTT/totalBCTT*100) : 0}%</div>
          </div>
          <p style={{ fontSize: '0.85rem' }}><strong>{completedBCTT}</strong> / {totalBCTT} hoàn tất</p>
        </div>
        <div className="card-flat" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>KHÓA LUẬN TỐT NGHIỆP</p>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#059669" strokeWidth="12" strokeDasharray={`${(completedKLTN/Math.max(totalKLTN,1))*314} 314`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>{totalKLTN > 0 ? Math.round(completedKLTN/totalKLTN*100) : 0}%</div>
          </div>
          <p style={{ fontSize: '0.85rem' }}><strong>{completedKLTN}</strong> / {totalKLTN} hoàn tất</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="card-flat" style={{ marginBottom: '32px' }}>
        <h3 style={{ fontWeight: '800', marginBottom: '20px' }}>Phân bố trạng thái đề tài</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} style={{ padding: '12px 20px', borderRadius: '8px', background: `${statusColors[status] || '#64748b'}10`, border: `1px solid ${statusColors[status] || '#64748b'}30`, minWidth: '120px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: statusColors[status] || '#64748b' }}>{count}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b' }}>{status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GV Distribution */}
      <div className="card-flat">
        <h3 style={{ fontWeight: '800', marginBottom: '20px' }}>Phân bổ GV Hướng dẫn</h3>
        {Object.entries(gvCounts).sort((a,b) => b[1]-a[1]).slice(0, 15).map(([gv, count]) => (
          <div key={gv} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ width: '180px', fontSize: '0.8rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lookupName(gv, users)}</div>
            <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${(count/maxGV)*100}%`, height: '100%', background: 'linear-gradient(90deg, #004b91, #2563eb)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', minWidth: '30px', textAlign: 'right' }}>{count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ===================== PERIODS =====================
function PeriodsView({ masterData, onRefresh, user }) {
  const handleToggle = async (d) => {
    const isActive = String(d.Active || '').toLowerCase() === 'yes' || d.Active === true;
    try {
      await api.updatePeriod({ periodName: d.Dot, major: d.Major, type: d.Loaidetai, isActive: !isActive });
      alert(`Đã ${!isActive ? 'mở' : 'đóng'} đợt!`); onRefresh();
    } catch(e) { alert('Lỗi!'); }
  };

  return (
    <motion.div key="periods" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '24px' }}>Quản lý đợt đăng ký</h2>
      <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%' }}>
          <thead><tr><th>TÊN ĐỢT</th><th>LOẠI</th><th>NGÀNH</th><th>TRẠNG THÁI</th><th style={{ textAlign: 'right' }}>THAO TÁC</th></tr></thead>
          <tbody>
            {(masterData.dots || []).map((d, idx) => {
              const isActive = String(d.Active || '').toLowerCase() === 'yes' || d.Active === true;
              return (
                <tr key={idx} className="table-row">
                  <td style={{ fontWeight: '800' }}>{d.Dot}</td>
                  <td>{d.Loaidetai || '---'}</td>
                  <td>{d.Major || '---'}</td>
                  <td>
                    <span style={{ padding: '6px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: '900', background: isActive ? '#dcfce7':'#fee2e2', color: isActive ? '#166534':'#991b1b' }}>
                      {isActive ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={isActive ? 'btn-error':'btn-success'} onClick={() => handleToggle(d)} style={{ padding: '8px 16px', fontSize: '0.75rem', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', background: isActive ? '#ef4444' : '#10b981' }}>
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
  );
}

// ===================== SHARED =====================
const StatCard = ({ title, val, icon: Icon, color }) => (
  <div className="card-flat" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
    <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
      <Icon size={28} />
    </div>
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px' }}>{title}</p>
      <p style={{ fontSize: '1.6rem', fontWeight: '900' }}>{val}</p>
    </div>
  </div>
);

const selectStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', color: '#0f172a' };
const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' };

export default AdminView;
