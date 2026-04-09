import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { lookupName } from '../../api';
import { Check, X, FileText, Clock, CheckCircle, Users, Mail, Search, Edit3, ShieldCheck, ClipboardCheck, AlertCircle, Upload, Eye } from 'lucide-react';
import { Document, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, HeadingLevel, WidthType, Packer } from 'docx';
import { saveAs } from 'file-saver';
function LecturerView({ user, activeTab }) {
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

useEffect(() => { fetchData(); }, [user.Email]);

const fetchData = async () => {
  setLoading(true);
  try { setMasterData(await api.getMasterData()); }
  catch { console.error('Error fetching data'); }
  finally { setLoading(false); }
};

if (loading) return <div style={{ padding: '2rem' }}>Đang tải dữ liệu...</div>;
if (!masterData) return <div style={{ color: 'red', padding: '2rem' }}>Lỗi tải dữ liệu.</div>;

const em = user.Email.toLowerCase();
const allReg = masterData.linkGiangvien || [];

// Lọc theo email GV và role
const hdStudents = allReg.filter(r => String(r.EmailGV).toLowerCase() === em && (r.Role === 'GVHD' || r.Role === 'BCTT' || r.Role === 'KLTN'));
const pbStudents = allReg.filter(r => String(r.EmailGV).toLowerCase() === em && r.Role === 'GVPB');
const councilStudents = allReg.filter(r => String(r.EmailGV).toLowerCase() === em && ['CTHD', 'TVHD1', 'TVHD2', 'ThukyHD'].includes(r.Role));
const cthdStudents = allReg.filter(r => String(r.EmailGV).toLowerCase() === em && r.Role === 'CTHD');
const thukyStudents = allReg.filter(r => String(r.EmailGV).toLowerCase() === em && r.Role === 'ThukyHD');

const pendingApproval = hdStudents.filter(s => {
  const end = String(s.End || '').trim();
  return end === 'Registered' || end === 'New' || !end;
});

return (
  <div className="animate-fade-in" style={{ width: '100%' }}>
    <AnimatePresence mode="wait">
      {activeTab === 'home' && <HomeView user={user} hd={hdStudents} pb={pbStudents} council={councilStudents} pending={pendingApproval.length} />}
      {activeTab === 'guidance' && <GuidanceView students={hdStudents} masterData={masterData} onRefresh={fetchData} user={user} />}
      {activeTab === 'reviewer' && <ReviewerView students={pbStudents} masterData={masterData} onRefresh={fetchData} />}
      {activeTab === 'council' && <CouncilView students={councilStudents} masterData={masterData} onRefresh={fetchData} />}
      {activeTab === 'president' && <PresidentView students={cthdStudents} masterData={masterData} user={user} onRefresh={fetchData} />}
      {activeTab === 'secretary' && <SecretaryView students={thukyStudents} masterData={masterData} onRefresh={fetchData} />}
      {activeTab === 'suggestion' && <SuggestionView />}
      {activeTab === 'grading' && (selectedStudent ? <GradingDetail student={selectedStudent} onBack={() => setSelectedStudent(null)} onRefresh={fetchData} masterData={masterData} /> : <GradingListView hd={hdStudents} pb={pbStudents} council={councilStudents} masterData={masterData} onSelect={setSelectedStudent} />)}
    </AnimatePresence>
  </div>
);
}

// ===================== HOME =====================
function HomeView({ user, hd, pb, council, pending }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Chào mừng, GV {user.Ten}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Hệ thống quản lý UniThesis - Phân hệ Giảng viên</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <StatCard title="HƯỚNG DẪN" val={hd.length} icon={Users} color="#004b91" />
        <StatCard title="PHẢN BIỆN" val={pb.length} icon={ShieldCheck} color="#059669" />
        <StatCard title="HỘI ĐỒNG" val={council.length} icon={Users} color="#7c3aed" />
        <StatCard title="CHỜ DUYỆT" val={pending} icon={Clock} color="#ea580c" />
      </div>
      {pending > 0 && (
        <div className="card-flat" style={{ borderLeft: '4px solid #ea580c' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#ea580c" />
            <span style={{ fontWeight: '800' }}>Bạn có <strong style={{ color: '#ea580c' }}>{pending}</strong> đề tài chờ phê duyệt.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== GUIDANCE (Hướng dẫn) =====================
function GuidanceView({ students, masterData, onRefresh, user }) {
  const [editingTitle, setEditingTitle] = useState({});
  const [uploading, setUploading] = useState(null);
  const users = masterData.users || [];

  const handleApprove = async (emailSV, status, loai) => {
    const title = editingTitle[emailSV] || '';
    const labels = { Approved: 'Duyệt', Rejected: 'Từ chối', Completed: 'Xác nhận Hoàn tất', Graded: 'Duyệt vào Hội đồng', Confirmed: 'Xác nhận bản sửa' };
    try {
      await api.approveTopicBulk({ emailGV: user.Email, svEmails: [emailSV], status, newTitle: title, loaiDeTai: loai });
      alert(`✓ Đã ${labels[status] || status}!`);
      onRefresh();
    } catch { alert('Lỗi thao tác!'); }
  };

  const handleUploadTurnitin = async (emailSV) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.pdf';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      setUploading(emailSV);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          await api.uploadFile({ emailSV, name: `Turnitin_${emailSV}.pdf`, base64, loaiDeTai: 'KLTN', fieldName: 'Turnitin_Report' });
          alert('✓ Đã tải Turnitin!'); onRefresh();
        } catch { alert('Lỗi tải file!'); }
        finally { setUploading(null); }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  };

  return (
    <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ fontWeight: '800' }}>Phê duyệt & Hướng dẫn Đề tài ({students.length})</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Quản lý toàn bộ quy trình hướng dẫn BCTT và KLTN</p>
      </div>
      <table style={{ width: '100%' }}>
        <thead><tr><th>SINH VIÊN</th><th>LOẠI</th><th>ĐỀ TÀI / ĐỢT</th><th>BÀI NỘP</th><th style={{ textAlign: 'right' }}>THAO TÁC WORKFLOW</th></tr></thead>
        <tbody>
          {students.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có sinh viên nào đăng ký.</td></tr>}
          {students.map((s, idx) => {
            const loai = String(s.Link || s.Role || '').trim();
            const sub = (masterData.linkBainop || []).find(b =>
              String(b.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase() &&
              String(b.Loaidetai || '').trim() === loai
            ) || (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase()) || {};
            const endVal = String(s.End || '').trim();
            const isNew = endVal === 'Registered' || endVal === 'New' || !endVal;
            const isApproved = endVal === 'Approved' || endVal === 'Yes';
            const isRevised = endVal === 'Revised';
            const hasReport = !!sub.Linkbai;
            const svName = lookupName(s.EmailSV, users);
            const isDone = endVal === 'Completed' || endVal === 'Pass';
            const isRejected = endVal === 'Rejected';
            const isGraded = endVal === 'Graded';
            const isConfirmed = endVal === 'Confirmed';
            return (
              <tr key={idx} className="table-row">
                <td>
                  <div style={{ fontWeight: '700' }}>{svName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.EmailSV}</div>
                </td>
                <td>
                  <span style={{ fontSize: '0.7rem', fontWeight: '800', background: loai === 'KLTN' ? '#dcfce7' : '#eff6ff', color: loai === 'KLTN' ? '#166534' : '#1e40af', padding: '4px 8px', borderRadius: '4px' }}>
                    {loai || s.Role}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>{sub.Tendetai || '---'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub.DotHK || '---'}</div>
                </td>
                <td>
                  {hasReport
                    ? <a href={sub.Linkbai} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}><Eye size={12} /> Xem file</a>
                    : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Chưa nộp</span>}
                </td>
                <td style={{ textAlign: 'right', minWidth: '260px' }}>

                  {/* CASE 1: Mới đăng ký → GV duyệt lần đầu */}
                  {isNew && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <input type="text" placeholder="Đổi tên..." style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.75rem', width: '140px' }}
                        onChange={(e) => setEditingTitle({ ...editingTitle, [s.EmailSV]: e.target.value })} />
                      <button className="btn-success" onClick={() => handleApprove(s.EmailSV, 'Approved', loai)} title="Duyệt"><Check size={16} /></button>
                      <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }} onClick={() => handleApprove(s.EmailSV, 'Rejected', loai)} title="Từ chối"><X size={16} /></button>
                    </div>
                  )}

                  {/* CASE 2: BCTT – đã duyệt + SV đã nộp BC → GV duyệt kết quả TT */}
                  {loai === 'BCTT' && isApproved && hasReport && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: '700', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>SV đã nộp BC thực tập</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-success" style={{ fontSize: '0.75rem', padding: '6px 14px' }} onClick={() => handleApprove(s.EmailSV, 'Completed', loai)}>✓ Hoàn tất BCTT</button>
                        <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => handleApprove(s.EmailSV, 'Rejected', loai)}>✕ Từ chối</button>
                      </div>
                    </div>
                  )}

                  {/* CASE 3: KLTN – đã duyệt + SV đã nộp LV → Upload Turnitin + Duyệt HĐ / Từ chối */}
                  {loai === 'KLTN' && isApproved && hasReport && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: '700', background: '#f3e8ff', padding: '2px 8px', borderRadius: '4px' }}>SV đã nộp LV – Kiểm tra Turnitin</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleUploadTurnitin(s.EmailSV)} disabled={uploading === s.EmailSV}>
                          <Upload size={12} /> {uploading === s.EmailSV ? '...' : 'Turnitin'}
                        </button>
                        <button className="btn-success" style={{ fontSize: '0.7rem', padding: '6px 10px' }} onClick={() => handleApprove(s.EmailSV, 'Graded', loai)}>✓ Duyệt HĐ</button>
                        <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => handleApprove(s.EmailSV, 'Rejected', loai)}>✕ Trượt</button>
                      </div>
                    </div>
                  )}

                  {/* CASE 4: KLTN – SV đã upload bản sửa → GVHD xem 3 link + duyệt */}
                  {loai === 'KLTN' && isRevised && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: '700', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>SV đã nộp bản sửa – Chờ GVHD Duyệt</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: '4px' }}>
                        {sub.BienBan_HD && <a href={sub.BienBan_HD} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: '0.62rem', padding: '4px 8px', background: '#475569' }}><FileText size={10} /> BB Hội đồng</a>}
                        {sub.KLTN_Revised && <a href={sub.KLTN_Revised} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: '0.62rem', padding: '4px 8px', background: '#1e40af' }}><Edit3 size={10} /> Bản sửa</a>}
                        {sub.KLTN_Explain && <a href={sub.KLTN_Explain} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: '0.62rem', padding: '4px 8px', background: '#7c3aed' }}><ClipboardCheck size={10} /> Giải trình</a>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-success" style={{ fontSize: '0.72rem', padding: '6px 12px' }} onClick={() => handleApprove(s.EmailSV, 'Confirmed', loai)}>Đồng ý chỉnh sửa</button>
                        <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.72rem' }} onClick={() => handleApprove(s.EmailSV, 'Revised', loai)}>Không đồng ý</button>
                      </div>
                    </div>
                  )}

                  {/* CASE 5: Trạng thái khác – badge thông báo */}
                  {!isNew && !(loai === 'BCTT' && isApproved && hasReport) && !(loai === 'KLTN' && isApproved && hasReport) && !isRevised && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {sub.BienBan_HD && <a href={sub.BienBan_HD} target="_blank" rel="noreferrer" style={{ fontSize: '0.6rem', color: 'var(--primary)' }}>BB Hội đồng</a>}
                        {sub.KLTN_Revised && <a href={sub.KLTN_Revised} target="_blank" rel="noreferrer" style={{ fontSize: '0.6rem', color: 'var(--primary)' }}>Bản sửa</a>}
                      </div>
                      <span style={{ fontWeight: '800', fontSize: '0.8rem', color: isRejected ? '#ef4444' : isDone ? '#059669' : isGraded ? '#7c3aed' : isConfirmed ? '#2563eb' : 'var(--success)' }}>
                        {isDone ? '✓ HOÀN TẤT' : isRejected ? '✕ ĐÃ TỪ CHỐI' : isGraded ? '✓ Qua Turnitin – Chờ HĐ' : isConfirmed ? '✓ Đã XN sửa – Chờ CT HĐ' : `✓ ${endVal}`}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===================== REVIEWER (Phản biện) =====================
function ReviewerView({ students, masterData, onRefresh }) {
  const [gradingEmail, setGradingEmail] = useState(null);
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const users = masterData.users || [];

  const handleSubmitPB = async (emailSV) => {
    try {
      await api.submitGrade({ emailSV, role: 'GVPB', grade: score, comment, loaiDeTai: 'KLTN' });
      alert('Đã lưu điểm phản biện!');
      setGradingEmail(null); setScore(''); setComment('');
      onRefresh();
    } catch { alert('Lỗi lưu điểm!'); }
  };

  return (
    <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ fontWeight: '800' }}>Sinh viên Phản biện ({students.length})</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Đọc báo cáo, nhập nhận xét và điểm phản biện</p>
      </div>
      <table style={{ width: '100%' }}>
        <thead><tr><th>SINH VIÊN</th><th>ĐỀ TÀI</th><th>BÀI NỘP</th><th style={{ textAlign: 'right' }}>CHẤM ĐIỂM PB</th></tr></thead>
        <tbody>
          {students.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa được phân công phản biện.</td></tr>}
          {students.map((s, idx) => {
            const sub = (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase() && String(b.Loaidetai).trim() === 'KLTN') || {};
            const svName = lookupName(s.EmailSV, users);
            const isGrading = gradingEmail === s.EmailSV;
            return (
              <React.Fragment key={idx}>
                <tr className="table-row">
                  <td>
                    <div style={{ fontWeight: '700' }}>{svName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.EmailSV}</div>
                  </td>
                  <td style={{ fontWeight: '700', fontSize: '0.88rem' }}>{sub.Tendetai || '---'}</td>
                  <td>
                    {sub.Linkbai ? <a href={sub.Linkbai} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}><Eye size={14} /> Xem bài</a> : <span style={{ color: '#94a3b8' }}>Chưa nộp</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {s.Diem ? <span style={{ color: 'var(--success)', fontWeight: '800' }}>Đã chấm: {s.Diem}</span> : (
                      <button className="btn-primary-blue" style={{ fontSize: '0.75rem', padding: '8px 16px' }} onClick={() => setGradingEmail(isGrading ? null : s.EmailSV)}>
                        {isGrading ? 'Đóng' : 'Nhập điểm PB'}
                      </button>
                    )}
                  </td>
                </tr>
                {isGrading && (
                  <tr><td colSpan="4" style={{ background: '#f8fafc', padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '16px', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', marginBottom: '6px' }}>ĐIỂM PHẢN BIỆN</label>
                        <input type="number" step="0.1" min="0" max="10" value={score} onChange={e => setScore(e.target.value)} className="input-field-custom" placeholder="0 - 10" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', marginBottom: '6px' }}>NHẬN XÉT</label>
                        <input type="text" value={comment} onChange={e => setComment(e.target.value)} className="input-field-custom" placeholder="Nhập nhận xét phản biện..." />
                      </div>
                      <button className="btn-success" style={{ padding: '12px 24px' }} onClick={() => handleSubmitPB(s.EmailSV)}>Lưu điểm</button>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===================== COUNCIL (Hội đồng) =====================
function CouncilView({ students, masterData, onRefresh }) {
  const users = masterData.users || [];
  const [gradingEmail, setGradingEmail] = useState(null);
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmitHD = async (emailSV) => {
    try {
      await api.submitGrade({ emailSV, role: 'HỘI ĐỒNG', grade: score, comment, loaiDeTai: 'KLTN' });
      alert('Đã lưu điểm hội đồng!');
      setGradingEmail(null); setScore(''); setComment('');
      onRefresh();
    } catch { alert('Lỗi!'); }
  };

  return (
    <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ fontWeight: '800' }}>Hội đồng chấm ({students.length})</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Danh sách SV trong hội đồng mà bạn tham gia</p>
      </div>
      <table style={{ width: '100%' }}>
        <thead><tr><th>SINH VIÊN</th><th>VAI TRÒ</th><th>ĐỊA ĐIỂM</th><th>BÀI NỘP</th><th style={{ textAlign: 'right' }}>HÀNH ĐỘNG</th></tr></thead>
        <tbody>
          {students.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa tham gia hội đồng nào.</td></tr>}
          {students.map((s, idx) => {
            const sub = (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase() && String(b.Loaidetai).trim() === 'KLTN') || {};
            const svName = lookupName(s.EmailSV, users);
            const isGrading = gradingEmail === s.EmailSV;
            const roleLabel = { CTHD: 'Chủ tịch', TVHD1: 'Thành viên 1', TVHD2: 'Thành viên 2', ThukyHD: 'Thư ký' }[s.Role] || s.Role;
            return (
              <React.Fragment key={idx}>
                <tr className="table-row">
                  <td><div style={{ fontWeight: '700' }}>{svName}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.EmailSV}</div></td>
                  <td><span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#f3e8ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '4px' }}>{roleLabel}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>{s.Diadiem || '---'}</td>
                  <td>{sub.Linkbai ? <a href={sub.Linkbai} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}><Eye size={14} /> Xem</a> : 'Chưa nộp'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {s.Diem ? <span style={{ color: 'var(--success)', fontWeight: '800' }}>Đã chấm: {s.Diem}</span> : (
                      <button className="btn-primary-blue" style={{ fontSize: '0.72rem', padding: '6px 14px' }} onClick={() => setGradingEmail(isGrading ? null : s.EmailSV)}>Nhập điểm HĐ</button>
                    )}
                  </td>
                </tr>
                {isGrading && (
                  <tr><td colSpan="5" style={{ background: '#f8fafc', padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '16px', alignItems: 'end' }}>
                      <div><label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', marginBottom: '6px' }}>ĐIỂM HỘI ĐỒNG</label>
                        <input type="number" step="0.1" min="0" max="10" value={score} onChange={e => setScore(e.target.value)} className="input-field-custom" /></div>
                      <div><label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', marginBottom: '6px' }}>NHẬN XÉT</label>
                        <input type="text" value={comment} onChange={e => setComment(e.target.value)} className="input-field-custom" placeholder="Nhận xét..." /></div>
                      <button className="btn-success" style={{ padding: '12px 24px' }} onClick={() => handleSubmitHD(s.EmailSV)}>Lưu</button>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===================== PRESIDENT (Chủ tịch) =====================
function PresidentView({ students, masterData, user, onRefresh }) {
  const users = masterData.users || [];
  const allReg = masterData.linkGiangvien || [];

  const handleConfirm = async (emailSV, status) => {
    try {
      await api.approveTopicBulk({ emailGV: user.Email, svEmails: [emailSV], status: status, newTitle: '' });
      alert(status === 'Completed' ? '✓ Đã chốt hoàn tất KLTN!' : '✓ Đã yêu cầu chỉnh sửa lại!');
      onRefresh();
    } catch { alert('Lỗi!'); }
  };

  return (
    <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ fontWeight: '800' }}>Vai trò Chủ tịch Hội đồng ({students.length})</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Chốt hoàn tất sau khi GVHD đã xác nhận bản sửa của SV</p>
      </div>
      <table style={{ width: '100%' }}>
        <thead><tr><th>SINH VIÊN</th><th>ĐỀ TÀI</th><th>ĐỊA ĐIỂM</th><th>GVHD XÁC NHẬN</th><th style={{ textAlign: 'right' }}>THAO TÁC</th></tr></thead>
        <tbody>
          {students.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Bạn chưa được phân làm Chủ tịch HĐ nào.</td></tr>}
          {students.map((s, idx) => {
            const sub = (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase()) || {};
            const svName = lookupName(s.EmailSV, users);
            const endVal = String(s.End || '').trim();
            const isDone = endVal === 'Yes' || endVal === 'Completed';
            // Kiểm tra GVHD đã xác nhận bản sửa chưa
            const gvhdRecord = allReg.find(r =>
              String(r.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase() &&
              (r.Role === 'GVHD' || r.Role === 'KLTN')
            );
            const gvhdEnd = String(gvhdRecord?.End || '').trim();
            const isGVHDConfirmed = gvhdEnd === 'Confirmed' || gvhdEnd === 'Completed' || gvhdEnd === 'Yes';
            return (
              <tr key={idx} className="table-row">
                <td><div style={{ fontWeight: '700' }}>{svName}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.EmailSV}</div></td>
                <td style={{ fontWeight: '700', fontSize: '0.88rem' }}>{sub.Tendetai || '---'}</td>
                <td>{s.Diadiem || '---'}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {isGVHDConfirmed
                      ? <span style={{ color: '#059669', fontWeight: '800', fontSize: '0.78rem' }}>✓ GVHD đã đồng ý</span>
                      : <span style={{ color: '#f59e0b', fontWeight: '700', fontSize: '0.78rem' }}>⏳ Chờ GVHD xác nhận</span>}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {sub.BienBan_HD && <a href={sub.BienBan_HD} target="_blank" rel="noreferrer" style={{ fontSize: '0.62rem', color: 'var(--primary)' }}>BB Hội đồng</a>}
                      {sub.KLTN_Revised && <a href={sub.KLTN_Revised} target="_blank" rel="noreferrer" style={{ fontSize: '0.62rem', color: 'var(--primary)' }}>Bản sửa</a>}
                      {sub.KLTN_Explain && <a href={sub.KLTN_Explain} target="_blank" rel="noreferrer" style={{ fontSize: '0.62rem', color: 'var(--primary)' }}>Giải trình</a>}
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {isDone
                    ? <span style={{ color: 'var(--success)', fontWeight: '800' }}>✓ HOÀN TẤT KLTN</span>
                    : (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-success"
                          disabled={!isGVHDConfirmed}
                          style={{ fontSize: '0.72rem', padding: '8px 16px', opacity: isGVHDConfirmed ? 1 : 0.5, cursor: isGVHDConfirmed ? 'pointer' : 'not-allowed' }}
                          onClick={() => handleConfirm(s.EmailSV, 'Completed')}>
                          Đồng ý & Hoàn tất
                        </button>
                        <button
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '0.72rem', opacity: isGVHDConfirmed ? 1 : 0.5, cursor: isGVHDConfirmed ? 'pointer' : 'not-allowed' }}
                          disabled={!isGVHDConfirmed}
                          onClick={() => handleConfirm(s.EmailSV, 'Revised')}>
                          Không đồng ý
                        </button>
                      </div>
                    )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===================== SECRETARY (Thư ký) =====================
function SecretaryView({ students, masterData, onRefresh }) {
  const users = masterData.users || [];

  const handleUploadBienBan = async (emailSV) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.pdf,.docx';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          await api.uploadFile({ emailSV, name: `BienBan_HD_${emailSV}.pdf`, base64, loaiDeTai: 'KLTN', fieldName: 'BienBan_HD' });
          alert('Đã tải biên bản hội đồng!'); onRefresh();
        } catch { alert('Lỗi tải file!'); }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  };
  const handleExportBienBan = async (s, sub, svName) => {
    const allReg = masterData.linkGiangvien || [];
    const allGrades = allReg.filter(r =>
      String(r.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase()
    );
    const roleLabel = { GVHD: 'GV Hướng dẫn', GVPB: 'GV Phản biện', CTHD: 'Chủ tịch HĐ', TVHD1: 'Thành viên 1', TVHD2: 'Thành viên 2', ThukyHD: 'Thư ký' };

    const cell = (text, bold = false, fill = 'FFFFFF', alignRight = false) =>
      new TableCell({
        shading: { fill },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({ text: String(text ?? '---'), bold, size: 22 })],
        })],
      });

    const gradeRows = allGrades
      .filter(r => r.Role !== 'ThukyHD')
      .map(r => new TableRow({
        children: [
          cell(roleLabel[r.Role] || r.Role, false, 'F8FAFC'),
          cell(lookupName(r.EmailGV, users), false, 'F8FAFC'),
          cell(r.Diem ? String(r.Diem) : '', !!r.Diem, r.Diem ? 'F0FDF4' : 'FEF3C7', true),
        ],
      }));

    const avgScore = (() => {
      const graded = allGrades.filter(r => r.Diem && r.Role !== 'ThukyHD');
      if (!graded.length) return '';
      const avg = graded.reduce((a, r) => a + Number(r.Diem), 0) / graded.length;
      return avg.toFixed(1);
    })();

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BIÊN BẢN HỘI ĐỒNG CHẤM KHÓA LUẬN TỐT NGHIỆP', bold: true, size: 28, color: '7C3AED' })],
          }),
          new Paragraph({ text: '' }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [cell('Họ và tên SV', true, 'EDE9FE'), cell(svName, false, 'EDE9FE')] }),
              new TableRow({ children: [cell('Email', true, 'F5F3FF'), cell(s.EmailSV)] }),
              new TableRow({ children: [cell('Tên đề tài', true, 'EDE9FE'), cell(sub.Tendetai || '---', false, 'EDE9FE')] }),
              new TableRow({ children: [cell('Đợt / Học kỳ', true, 'F5F3FF'), cell(sub.DotHK || '---')] }),
              new TableRow({ children: [cell('Địa điểm bảo vệ', true, 'EDE9FE'), cell(s.Diadiem || '---', false, 'EDE9FE')] }),
            ],
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [new TextRun({ text: 'BẢNG ĐIỂM CÁC THÀNH VIÊN HỘI ĐỒNG', bold: true, size: 24, color: '6D28D9' })],
          }),
          new Paragraph({ text: '' }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  cell('VAI TRÒ', true, 'DDD6FE'),
                  cell('HỌ VÀ TÊN GIẢNG VIÊN', true, 'DDD6FE'),
                  cell('ĐIỂM', true, 'DDD6FE', true),
                ],
              }),
              ...gradeRows,
              new TableRow({
                children: [
                  cell('', false, 'FEF9C3'),
                  cell('ĐIỂM TRUNG BÌNH', true, 'FEF9C3'),
                  cell(avgScore, true, 'FEF9C3', true),
                ],
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [new TextRun({ text: 'Nhận xét chung: ', bold: true, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '..............................................................................................................', size: 22, color: 'CBD5E1' })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '..............................................................................................................', size: 22, color: 'CBD5E1' })],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Ngày lập biên bản: ${new Date().toLocaleDateString('vi-VN')}`, italics: true, size: 20, color: '64748B' })],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `BienBan_HD_${s.EmailSV}.docx`);
  };

  return (
    <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ fontWeight: '800' }}>Vai trò Thư ký Hội đồng ({students.length})</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Nhập biên bản hội đồng</p>
      </div>
      <table style={{ width: '100%' }}>
        <thead><tr><th>SINH VIÊN</th><th>ĐỀ TÀI</th><th>ĐỊA ĐIỂM</th><th style={{ textAlign: 'right' }}>BIÊN BẢN</th></tr></thead>
        <tbody>
          {students.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Bạn chưa được phân làm Thư ký HĐ nào.</td></tr>}
          {students.map((s, idx) => {
            const sub = (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase()) || {};
            const svName = lookupName(s.EmailSV, users);
            return (
              <tr key={idx} className="table-row">
                <td><div style={{ fontWeight: '700' }}>{svName}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.EmailSV}</div></td>
                <td style={{ fontWeight: '700', fontSize: '0.88rem' }}>{sub.Tendetai || '---'}</td>
                <td>{s.Diadiem || '---'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleExportBienBan(s, sub, svName)}
                      style={{ fontSize: '0.72rem', padding: '8px 14px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileText size={13} /> Xuất Biên bản
                    </button>
                    <button className="btn-primary-blue" style={{ fontSize: '0.72rem', padding: '8px 16px' }} onClick={() => handleUploadBienBan(s.EmailSV)}>
                      <Upload size={14} /> Tải Biên bản
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===================== SUGGESTION =====================
function SuggestionView() {
  return (
    <div className="card-flat">
      <h3 style={{ marginBottom: '24px', fontWeight: '800' }}>Gợi ý Đề tài mẫu</h3>
      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px' }}>
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px' }}>TÊN ĐỀ TÀI GỢI Ý</span>
          <input type="text" className="input-field-custom" placeholder="Ví dụ: Ứng dụng AI trong nhận diện..." />
        </label>
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px' }}>MÔ TẢ / YÊU CẦU</span>
          <textarea className="input-field-custom" rows="4" placeholder="Mô tả ngắn gọn..."></textarea>
        </label>
        <button className="btn-primary-blue">Đăng gợi ý</button>
      </div>
    </div>
  );
}

// ===================== GRADING LIST =====================
function GradingListView({ hd, pb, council, masterData, onSelect }) {
  const users = masterData.users || [];
  const allStudents = [
    ...hd.map(s => ({ ...s, gradingRole: 'GVHD' })),
    ...pb.map(s => ({ ...s, gradingRole: 'GVPB' })),
    ...council.map(s => ({ ...s, gradingRole: 'HỘI ĐỒNG' })),
  ];

  return (
    <div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '32px' }}>Chấm điểm đề tài</h2>
      {allStudents.length === 0 && <div className="card-flat" style={{ textAlign: 'center', color: '#94a3b8' }}>Chưa có sinh viên cần chấm điểm.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {allStudents.map((s, idx) => {
          const sub = (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(s.EmailSV).toLowerCase()) || {};
          const svName = lookupName(s.EmailSV, users);
          const roleColors = { GVHD: '#004b91', GVPB: '#059669', 'HỘI ĐỒNG': '#7c3aed' };
          return (
            <div key={idx} className="card-flat" style={{ padding: '24px', cursor: 'pointer', borderTop: `4px solid ${roleColors[s.gradingRole] || '#64748b'}` }} onClick={() => onSelect(s)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>{svName}</span>
                <span style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', background: `${roleColors[s.gradingRole]}15`, color: roleColors[s.gradingRole], fontWeight: '800' }}>{s.gradingRole}</span>
              </div>
              <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '4px' }}>{sub.Tendetai || '---'}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{s.EmailSV}</p>
              <button className="btn-primary-blue" style={{ width: '100%', fontSize: '0.8rem' }}>Nhập điểm & Turnitin</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== GRADING DETAIL =====================
function GradingDetail({ student, onBack, onRefresh, masterData }) {
  const [scores, setScores] = useState({ t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, t6: 0, t7: 0, t8: 0 });
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const users = masterData.users || [];

  const totalCriteria = Object.values(scores).reduce((a, b) => Number(a) + Number(b), 0);
  const officialScore = totalCriteria.toFixed(1);
  const svName = lookupName(student.EmailSV, users);
  const sub = (masterData.linkBainop || []).find(b => String(b.EmailSV).toLowerCase() === String(student.EmailSV).toLowerCase()) || {};
  const gradingRole = student.gradingRole || student.role || 'GVHD';

  // Xác định loaiDeTai từ submission (Linkbainop) hoặc từ student record
  const loaiDeTai = sub.Loaidetai || String(student.Link || student.Role || 'KLTN').trim();

  const handleUploadTurnitin = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.pdf';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          await api.uploadFile({ emailSV: student.EmailSV, name: `Turnitin_${student.EmailSV}.pdf`, base64, loaiDeTai: 'KLTN', fieldName: 'Turnitin_Report' });
          alert('Đã tải báo cáo Turnitin!'); onRefresh();
        } catch { alert('Lỗi!'); }
        finally { setUploading(false); }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  };

  const handleSubmit = async () => {
    try {
      await api.submitGrade({ emailSV: student.EmailSV, role: gradingRole, grade: officialScore, comment, loaiDeTai });
      alert('Đã lưu điểm!'); onBack(); onRefresh();
    } catch { alert('Lỗi lưu điểm!'); }
  };
  const handleExportDocx = async () => {
    const criteriaLabels = [
      'Tiêu chí 1 (1đ)', 'Tiêu chí 2 (1đ)', 'Tiêu chí 3 (2đ)',
      'Tiêu chí 4 (2đ)', 'Tiêu chí 5 (1đ)', 'Tiêu chí 6 (1đ)',
      'Tiêu chí 7 (1đ)', 'Tiêu chí 8 (1đ)',
    ];
    const scoreKeys = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'];

    const cell = (text, bold = false, fill = 'FFFFFF') =>
      new TableCell({
        shading: { fill },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(text ?? '---'), bold, size: 22 })],
        })],
      });

    const infoRows = [
      ['Họ và tên', svName],
      ['Email', student.EmailSV],
      ['Đề tài', sub.Tendetai || '---'],
      ['Vai trò chấm', gradingRole],
      ['Loại đề tài', loaiDeTai],
    ].map(([label, val]) =>
      new TableRow({ children: [cell(label, true, 'EFF6FF'), cell(val)] })
    );

    const scoreRows = scoreKeys.map((k, i) =>
      new TableRow({ children: [cell(criteriaLabels[i], false, 'F8FAFC'), cell(scores[k])] })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BẢNG ĐIỂM', bold: true, size: 28, color: '004B91' })],
          }),
          new Paragraph({ text: '' }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: infoRows,
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [new TextRun({ text: 'ĐIỂM CHI TIẾT THEO TIÊU CHÍ', bold: true, size: 24, color: '1E40AF' })],
          }),
          new Paragraph({ text: '' }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [cell('TIÊU CHÍ', true, 'DBEAFE'), cell('ĐIỂM', true, 'DBEAFE')],
              }),
              ...scoreRows,
              new TableRow({
                children: [cell('TỔNG ĐIỂM', true, 'FEF9C3'), cell(`${officialScore} / 10`, true, 'FEF9C3')],
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({ text: 'NHẬN XÉT: ', bold: true, size: 22 }),
              new TextRun({ text: comment || '(Không có nhận xét)', size: 22 }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, italics: true, size: 20, color: '64748B' })],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `BangDiem_${gradingRole}_${student.EmailSV}.docx`);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} className="btn-flat" style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}><X size={24} /></button>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Chấm điểm {gradingRole} — {svName}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        <div>
          <div className="card-flat" style={{ borderTop: '4px solid var(--primary)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <ClipboardCheck color="var(--primary)" />
              <h3 style={{ fontWeight: '800' }}>Bảng điểm & Đánh giá</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <CriteriaInput label="Tiêu chí 1 (1đ)" val={scores.t1} onChange={v => setScores({ ...scores, t1: v })} />
              <CriteriaInput label="Tiêu chí 2 (1đ)" val={scores.t2} onChange={v => setScores({ ...scores, t2: v })} />
              <CriteriaInput label="Tiêu chí 3 (2đ)" val={scores.t3} onChange={v => setScores({ ...scores, t3: v })} />
              <CriteriaInput label="Tiêu chí 4 (2đ)" val={scores.t4} onChange={v => setScores({ ...scores, t4: v })} />
              <CriteriaInput label="Tiêu chí 5 (1đ)" val={scores.t5} onChange={v => setScores({ ...scores, t5: v })} />
              <CriteriaInput label="Tiêu chí 6 (1đ)" val={scores.t6} onChange={v => setScores({ ...scores, t6: v })} />
              <CriteriaInput label="Tiêu chí 7 (1đ)" val={scores.t7} onChange={v => setScores({ ...scores, t7: v })} />
              <CriteriaInput label="Tiêu chí 8 (1đ)" val={scores.t8} onChange={v => setScores({ ...scores, t8: v })} />
            </div>

            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '12px', marginBottom: '32px' }}>
              <p style={{ fontWeight: '800' }}>TỔNG ĐIỂM: {totalCriteria}/10 ➜ ĐIỂM QUY ĐỔI: <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{officialScore}</span></p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px' }}>NHẬN XÉT CHI TIẾT</span>
                <textarea className="input-field-custom" rows="4" value={comment} onChange={e => setComment(e.target.value)} placeholder="Nhập nhận xét..."></textarea>
              </label>
            </div>

  {
    !sub.Linkbai && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
        <AlertCircle size={16} color="#d97706" />
        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e' }}>Sinh viên chưa nộp bài — không thể lưu kết quả chấm điểm.</span>
      </div>
    )
  }
  <div style={{ display: 'flex', gap: '12px' }}>
    <button
      onClick={handleExportDocx}
      style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', color: '#334155' }}
    >
      <FileText size={16} color="#334155" /> Xuất DOCX
    </button>
    <button
      className="btn-primary-blue"
      onClick={handleSubmit}
      disabled={!sub.Linkbai}
      style={{ flex: 1, opacity: sub.Linkbai ? 1 : 0.45, cursor: sub.Linkbai ? 'pointer' : 'not-allowed' }}
    >
      LƯU KẾT QUẢ CHẤM ĐIỂM
    </button>
            </div>
          </div>
        </div >

    <aside>
      <div className="card-flat" style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '16px' }}>THÔNG TIN SINH VIÊN</h4>
        <p style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '4px' }}>{svName}</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{student.EmailSV}</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Đề tài: {sub.Tendetai || '---'}</p>
        <hr style={{ margin: '16px 0', border: '0', borderTop: '1px solid #eee' }} />
        {sub.Linkbai ? <a href={sub.Linkbai} target="_blank" rel="noreferrer" className="btn-primary" style={{ width: '100%', display: 'inline-block', textAlign: 'center' }}>Xem file bài nộp</a> : <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>SV chưa nộp bài</p>}
      </div>

      {gradingRole === 'GVHD' && (
        <div className="card-flat" style={{ border: '1px dashed var(--primary)' }}>
          <h4 style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '8px' }}>TURNITIN</h4>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '16px' }}>GVHD upload báo cáo Turnitin trước khi hội đồng chấm.</p>
          <button className="btn-primary-blue" onClick={handleUploadTurnitin} disabled={uploading}>
            <Upload size={16} /> {uploading ? 'ĐANG TẢI...' : 'TẢI FILE TURNITIN'}
          </button>
        </div>
      )}
    </aside>
      </div>
    </div>
  );
}

// ===================== SHARED COMPONENTS =====================
const CriteriaInput = ({ label, val, onChange }) => (
  <div>
    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>{label}</span>
    <input type="number" step="0.1" value={val} onChange={e => onChange(e.target.value)} className="input-field-custom" />
  </div>
);

const StatCard = ({ title, val, icon, color }) => {
  const Icon = icon;
  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color, marginBottom: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></div>
        <span style={{ fontWeight: '800', fontSize: '0.7rem', letterSpacing: '1px' }}>{title}</span>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>{val}</div>
    </div>
  );
};

export default LecturerView;
