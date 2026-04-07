import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Upload, CheckCircle, Clock, Link as LinkIcon, AlertCircle, User, FileText, Building, BookOpen } from 'lucide-react';

function StudentView({ user, activeTab }) {
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user.Email]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getMasterData();
      setMasterData(data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Đang kết nối hệ thống UniThesis...</div>;
  if (!masterData) return <div style={{ color: 'red', padding: '2rem' }}>Lỗi: Không thể kết nối Master Data!</div>;

  // Lọc dữ liệu cá nhân
  const myBCTT = masterData.linkGiangvien.find(r => String(r.EmailSV).toLowerCase() === user.Email.toLowerCase() && r.Role === 'BCTT');
  const myKLTN = masterData.linkGiangvien.find(r => String(r.EmailSV).toLowerCase() === user.Email.toLowerCase() && r.Role === 'KLTN');
  const mySubmissions = masterData.linkBainop.find(s => String(s.EmailSV).toLowerCase() === user.Email.toLowerCase()) || {};
  const myGrades = masterData.diem.filter(g => String(g.EmailSV).toLowerCase() === user.Email.toLowerCase());

  // LOGIC TÍNH TOÁN 14 BƯỚC THẦN THÁNH
  let currentStep = 1;
  if (myBCTT) {
    currentStep = 2; // Đã đăng ký BCTT
    if (myBCTT.End === 'Approved') currentStep = 3;
    if (mySubmissions.BCTT_Report) currentStep = 4;
    const bcttGrade = myGrades.find(g => g.Loai === 'BCTT');
    if (bcttGrade && bcttGrade.Diem_GVHD) currentStep = 5;
  }
  if (currentStep >= 5 && myKLTN) {
    currentStep = 6; // Bắt đầu KLTN
    if (myKLTN.End === 'Approved') currentStep = 7;
    if (myKLTN.ReviewerEmail) currentStep = 8;
    if (mySubmissions.KLTN_Full) currentStep = 9;
    const kltnGrade = myGrades.find(g => g.Loai === 'KLTN');
    if (kltnGrade && kltnGrade.Diem_GVHD) currentStep = 10;
    if (myKLTN.CouncilID) currentStep = 11;
    if (kltnGrade && kltnGrade.Diem_HoiDong) currentStep = 12;
    if (mySubmissions.KLTN_Revised) currentStep = 13;
    if (myKLTN.End === 'Pass') currentStep = 14;
  }

  const studentDashboard = {
    registrations: [myBCTT, myKLTN].filter(Boolean),
    submissions: mySubmissions,
    grades: myGrades,
    currentStep
  };

  if (activeTab === 'register') {
    return <RegistrationForm user={user} masterData={masterData} dashboard={studentDashboard} onRefresh={fetchData} />;
  }

  if (activeTab === 'status') {
    return <ProgressTracker user={user} dashboard={studentDashboard} onRefresh={fetchData} />;
  }

  if (activeTab === 'grades') {
    return <GradesView user={user} grades={myGrades} />;
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '1.8rem', fontWeight: '800' }}>Thông tin Sinh viên</h2>
      <div className="card-flat" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px' }}>
        <InfoItem label="HỌ VÀ TÊN" value={user.Ten} />
        <InfoItem label="MÃ SỐ SINH VIÊN" value={user.MS} />
        <InfoItem label="NGÀNH HỌC" value={user.Major} />
        <InfoItem label="TRẠNG THÁI HIỆN TẠI" value={currentStep < 6 ? 'GIAI ĐOẠN BCTT' : 'GIAI ĐOẠN KLTN'} />
      </div>

      <div style={{ marginTop: '32px' }}>
         <h3 style={{ marginBottom: '16px', fontWeight: '800', fontSize: '1.1rem' }}>ĐỀ TÀI ĐANG THỰC HIỆN</h3>
         <div className="card-flat" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <p style={{ fontWeight: '900', fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '8px' }}>
                     {mySubmissions.TenDeTai || 'Chưa đăng ký đề tài'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                     <Building size={14} inline /> <strong>Công ty:</strong> {mySubmissions.CongTy || 'N/A'} | 
                     <BookOpen size={14} inline style={{ marginLeft: '10px' }} /> <strong>Mảng:</strong> {mySubmissions.MangDeTai || 'N/A'}
                  </p>
               </div>
               <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>GIẢNG VIÊN HƯỚNG DẪN</p>
                  <p style={{ fontWeight: '700' }}>{masterData.users.find(u => u.Email === (myKLTN?.EmailGV || myBCTT?.EmailGV))?.Ten || '---'}</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' }}>{label}</p>
      <p style={{ fontSize: '1rem', fontWeight: '700' }}>{value}</p>
    </div>
  );
}

function RegistrationForm({ user, masterData, dashboard, onRefresh }) {
  const isKLTN = dashboard.currentStep >= 5;
  const [form, setForm] = useState({
    tenDeTai: '',
    mangDeTai: '',
    congty: '',
    emailGV: '',
    dot: '',
    loaiDeTai: isKLTN ? 'KLTN' : 'BCTT'
  });
  const [submitting, setSubmitting] = useState(false);

  const filteredLecturers = masterData.users.filter(u => 
    (u.Role||'').toLowerCase().includes('giangvien') && u.Major === user.Major
  );

  const filteredDots = masterData.dots.filter(d => 
    d.Major === user.Major && d.Loaidetai === form.loaiDeTai && (d.Active === 'Yes' || d.Active === true)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.registerTopic({ ...form, emailSV: user.Email });
      alert('Đăng ký thành công!');
      onRefresh();
    } catch (err) {
      alert('Lỗi đăng ký!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-flat animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Đăng ký Đề tài</h2>
        <span style={{ padding: '6px 16px', borderRadius: '30px', fontSize: '0.8rem', fontWeight: '900', background: isKLTN ? '#dcfce7':'#eff6ff', color: isKLTN ? '#166534':'#004b91' }}>
          {isKLTN ? 'GIAI ĐOẠN KHÓA LUẬN' : 'GIAI ĐOẠN THỰC TẬP'}
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ gridColumn: 'span 2' }}>
           <FormBlock label="Tên đề tài dự kiến">
              <input type="text" value={form.tenDeTai} onChange={e => setForm({...form, tenDeTai: e.target.value})} required style={inputStyle} placeholder="VD: Xây dựng hệ thống quản lý học tập..." />
           </FormBlock>
        </div>
        <FormBlock label="Mảng đề tài">
           <input type="text" value={form.mangDeTai} onChange={e => setForm({...form, mangDeTai: e.target.value})} required style={inputStyle} placeholder="VD: Web, Mobile, AI..." />
        </FormBlock>
        <FormBlock label="Công ty thực tập">
           <input type="text" value={form.congty} onChange={e => setForm({...form, congty: e.target.value})} required style={inputStyle} placeholder="Nhập tên công ty..." />
        </FormBlock>
        <FormBlock label="Giảng viên hướng dẫn">
           <select value={form.emailGV} onChange={e => setForm({...form, emailGV: e.target.value})} required style={selectStyle}>
              <option value="">-- Chọn Giảng viên --</option>
              {filteredLecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten}</option>)}
           </select>
        </FormBlock>
        <FormBlock label="Đợt đăng ký">
           <select value={form.dot} onChange={e => setForm({...form, dot: e.target.value})} required style={selectStyle}>
              <option value="">-- Chọn đợt --</option>
              {filteredDots.map(d => <option key={d.Dot} value={d.Dot}>{d.Dot}</option>)}
           </select>
        </FormBlock>
        <div style={{ gridColumn: 'span 2', marginTop: '12px' }}>
           <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px' }} disabled={submitting}>
              {submitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐĂNG KÝ'}
           </button>
        </div>
      </form>
    </div>
  );
}

function ProgressTracker({ user, dashboard, onRefresh }) {
  const steps = [
    'Đăng nhập', 'Đăng ký BCTT', 'GVHD Duyệt', 'Nộp bài BCTT', 'Chấm điểm BCTT',
    'Đăng ký KLTN', 'GVHD Duyệt', 'Phân GVPB', 'Nộp bài KLTN', 'Turnitin & Chấm',
    'Phân Hội đồng', 'Bảo vệ HD', 'Nộp bài chỉnh sửa', 'Hoàn tất'
  ];

  const currentStep = dashboard.currentStep;

  const handleUpload = async (fieldName) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          await api.uploadFile({
            emailSV: user.Email,
            name: `${user.MS}_${fieldName}.pdf`,
            base64,
            loaiDeTai: currentStep < 6 ? 'BCTT' : 'KLTN',
            fieldName
          });
          alert('Tải bài lên thành công!');
          onRefresh();
        } catch (err) { alert('Lỗi tải file!'); }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '1.8rem', fontWeight: '800' }}>Tiến độ thực hiện</h2>
      <div className="card-flat" style={{ padding: '50px 30px', overflowX: 'auto', marginBottom: '32px' }}>
        <div style={{ display: 'flex', minWidth: '1100px', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', height: '4px', background: '#e2e8f0', zIndex: 0 }}>
            <div style={{ width: `${(currentStep - 1) / (steps.length - 1) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'all 0.5s ease' }} />
          </div>
          {steps.map((step, idx) => {
             const active = idx + 1 <= currentStep;
             return (
              <div key={idx} style={{ flex: 1, zIndex: 1, textAlign: 'center' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto 12px',
                  background: idx + 1 < currentStep ? 'var(--success)' : (idx + 1 === currentStep ? 'var(--primary)' : '#cbd5e1'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold',
                  boxShadow: idx + 1 === currentStep ? '0 0 0 4px rgba(0,75,145,0.2)' : 'none'
                }}>
                  {idx + 1 < currentStep ? <CheckCircle size={18} /> : idx + 1}
                </div>
                <p style={{ fontSize: '0.65rem', fontWeight: '800', color: active ? 'var(--text-main)' : 'var(--text-muted)' }}>{step}</p>
              </div>
             );
          })}
        </div>
      </div>

      <div className="card-flat">
         <h3 style={{ marginBottom: '16px', fontWeight: '800' }}>NHIỆM VỤ HIỆN TẠI</h3>
         {currentStep === 3 && <div className="alert-info">Chờ Giảng viên hướng dẫn phê duyệt đề tài BCTT của bạn.</div>}
         {currentStep === 4 && (
            <div style={{ display: 'flex', gap: '20px' }}>
               <UploadBox label="Báo cáo Thực tập (PDF)" onClick={() => handleUpload('BCTT_Report')} active={dashboard.submissions.BCTT_Report} />
               <UploadBox label="Giấy xác nhận thực tập (PDF)" onClick={() => handleUpload('BCTT_Confirm')} active={dashboard.submissions.BCTT_Confirm} />
            </div>
         )}
         {currentStep === 9 && (
            <UploadBox label="Bản thảo Khóa luận (PDF)" onClick={() => handleUpload('KLTN_Full')} active={dashboard.submissions.KLTN_Full} />
         )}
         {currentStep === 13 && (
            <UploadBox label="Bài khóa luận chỉnh sửa (PDF)" onClick={() => handleUpload('KLTN_Revised')} active={dashboard.submissions.KLTN_Revised} />
         )}
         {currentStep === 14 && <div className="alert-success">Chúc mừng! Bạn đã hoàn thành toàn bộ chương trình Khóa luận tốt nghiệp.</div>}
         
         {currentStep !== 4 && currentStep !== 9 && currentStep !== 13 && (
            <p style={{ color: 'var(--text-muted)' }}>Hiện tại không có hành động nào cần thực hiện từ phía bạn.</p>
         )}
      </div>
    </div>
  );
}

const UploadBox = ({ label, onClick, active }) => (
  <div onClick={onClick} style={{ 
    flex: 1, padding: '30px', border: `2px dashed ${active ? 'var(--success)':'#cbd5e1'}`, 
    borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: active ? '#f0fdf4':'#f8fafc' 
  }}>
    <Upload size={32} style={{ color: active ? 'var(--success)':'var(--text-muted)', marginBottom: '12px' }} />
    <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{label}</p>
    {active && <p style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '8px', fontWeight: '800' }}>✓ ĐÃ TẢI LÊN</p>}
  </div>
);

function GradesView({ user, grades }) {
  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
       <h2 style={{ marginBottom: '24px', fontSize: '1.8rem', fontWeight: '800' }}>Kết quả học tập</h2>
       <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%' }}>
             <thead>
                <tr>
                   <th>Hạng mục</th>
                   <th>Điểm GVHD</th>
                   <th>Điểm GVPB</th>
                   <th>Điểm Hội đồng</th>
                   <th>Tổng kết</th>
                </tr>
             </thead>
             <tbody>
                {grades.map((g, idx) => (
                   <tr key={idx} className="table-row">
                      <td style={{ fontWeight: '800' }}>{g.Loai}</td>
                      <td>{g.Diem_GVHD || '---'}</td>
                      <td>{g.Diem_GVPB || '---'}</td>
                      <td>{g.Diem_HoiDong || '---'}</td>
                      <td style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '1.1rem' }}>
                         {((parseFloat(g.Diem_GVHD)||0) + (parseFloat(g.Diem_GVPB)||0) + (parseFloat(g.Diem_HoiDong)||0)) / 3 || '---'}
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

const FormBlock = ({ label, children }) => (
  <div>
    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</label>
    {children}
  </div>
);

const selectStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', color: '#0f172a' };
const inputStyle = { ...selectStyle, padding: '12px' };

export default StudentView;
