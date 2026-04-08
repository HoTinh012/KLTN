import React, { useState, useEffect } from 'react';
import api, { lookupName } from '../../api';
import { Upload, CheckCircle, Clock, Link as LinkIcon, AlertCircle, User, FileText, Building, BookOpen, Send, Layout, ClipboardList } from 'lucide-react';

function StudentView({ user, activeTab }) {
  const [masterData, setMasterData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [user.Email]);

  const fetchData = async () => {
    setLoading(true);
    try { setMasterData(await api.getMasterData()); }
    catch (err) { console.error("Lỗi lấy dữ liệu:", err); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Đang kết nối hệ thống UniThesis...</div>;
  if (!masterData) return <div style={{ color: 'red', padding: '2rem' }}>Lỗi: Không thể kết nối Master Data!</div>;

  const em = user.Email.toLowerCase();
  const allReg = masterData.linkGiangvien || [];
  const allBn = masterData.linkBainop || [];

  const getTopicType = item => {
    const raw = item?.Loaidetai ?? item?.LoaiDeTai ?? item?.loaiDeTai ?? item?.loaidetai ?? item?.Link ?? '';
    const value = String(raw).trim();
    if (!value) return '';
    const normalized = value.toUpperCase();
    if (normalized.includes('BCTT')) return 'BCTT';
    if (normalized.includes('KLTN')) return 'KLTN';
    return normalized;
  };

  // Tìm bản ghi GVHD cho BCTT và KLTN
  const myBCTT_HD = allReg.find(r => String(r.EmailSV).toLowerCase() === em && r.Role === 'GVHD' && getTopicType(r) === 'BCTT');
  const myKLTN_HD = allReg.find(r => String(r.EmailSV).toLowerCase() === em && r.Role === 'GVHD' && getTopicType(r) === 'KLTN');

  // Fallback: tìm bằng Role cũ / kiểu đề tài cũ cho dữ liệu chưa chuẩn
  let myBCTT = myBCTT_HD || allReg.find(r => String(r.EmailSV).toLowerCase() === em && getTopicType(r) === 'BCTT');
  let myKLTN = myKLTN_HD || allReg.find(r => String(r.EmailSV).toLowerCase() === em && getTopicType(r) === 'KLTN');

  const mySubmissions_BCTT = (allBn || []).filter(s => String(s.EmailSV).toLowerCase() === em && getTopicType(s) === 'BCTT');
  const mySubmissions_KLTN = (allBn || []).filter(s => String(s.EmailSV).toLowerCase() === em && getTopicType(s) === 'KLTN');
  const myGrades = (masterData.diem || []).filter(g => String(g.EmailSV).toLowerCase() === em);

  const getFirstSubmissionField = (rows, field) => {
    const item = rows.find(r => r[field]);
    return item ? item[field] : rows[0]?.[field] || '';
  };

  if (!myBCTT && mySubmissions_BCTT.length > 0) {
    myBCTT = allReg.find(r => String(r.EmailSV).toLowerCase() === em && r.Role === 'GVHD');
  }
  if (!myKLTN && mySubmissions_KLTN.length > 0) {
    myKLTN = allReg.find(r => String(r.EmailSV).toLowerCase() === em && r.Role === 'GVHD');
  }

  const isUrlValue = (value) => typeof value === 'string' && /https?:\/\//.test(value);
  const hasBCTTUpload = mySubmissions_BCTT.some(s => isUrlValue(s.BCTT_Report) || isUrlValue(s.BCTT_Confirm) || isUrlValue(s.Linkbai));
  const hasKLTNFull = mySubmissions_KLTN.some(s => isUrlValue(s.KLTN_Full) || isUrlValue(s.Linkbai));
  const hasKLTNTurnitin = mySubmissions_KLTN.some(s => isUrlValue(s.KLTN_Turnitin) || isUrlValue(s.Linkbai));

  const mySubmissions_BCTT_Title = getFirstSubmissionField(mySubmissions_BCTT, 'Tendetai');
  const mySubmissions_KLTN_Title = getFirstSubmissionField(mySubmissions_KLTN, 'Tendetai');

  // GVPB + HĐ records cho KLTN
  const gvpbRecord = allReg.find(r => String(r.EmailSV).toLowerCase() === em && r.Role === 'GVPB');
  const councilRecord = allReg.find(r => String(r.EmailSV).toLowerCase() === em && ['CTHD', 'TVHD1', 'TVHD2', 'ThukyHD'].includes(r.Role));

  // === BCTT Steps (1-6) ===
  let bcttStep = 1;
  if (myBCTT) {
    bcttStep = 2; // Đã đăng ký
    const endVal = String(myBCTT.End || '').trim();
    if (endVal === 'Approved' || endVal === 'Yes') bcttStep = 3;
    if (hasBCTTUpload) bcttStep = 4; // Đã nộp báo cáo
    const grade = myGrades.find(g => String(g.Loai || g.LoaiDeTai || '').trim() === 'BCTT');
    if (grade && grade.Diem_GVHD) bcttStep = 5;
    if (endVal === 'Completed' || endVal === 'Pass') bcttStep = 6;
  }

  // === KLTN Steps (1-11) ===
  let kltnStep = 1;
  if (myKLTN) {
    kltnStep = 2;
    const endVal = String(myKLTN.End || '').trim();
    if (endVal === 'Approved' || endVal === 'Yes') kltnStep = 3;
    if (gvpbRecord) kltnStep = 4; // TBM đã phân GVPB
    if (hasKLTNFull) kltnStep = 5; // Đã nộp luận văn
    if (hasKLTNTurnitin) kltnStep = 6; // Upload Turnitin/Chấm
    if (councilRecord) kltnStep = 7; // Đã có hội đồng
    const grade = myGrades.find(g => String(g.Loai || g.LoaiDeTai || '').trim() === 'KLTN');
    if (grade && grade.Diem_HoiDong) kltnStep = 8; // Hội đồng chấm
    if (endVal === 'Revised') kltnStep = 9;
    if (endVal === 'Confirmed') kltnStep = 10;
    if (endVal === 'Completed' || endVal === 'Yes' || endVal === 'Pass') kltnStep = 11;
  }

  // === ROUTING ===
  if (activeTab === 'register') return <RegistrationForm user={user} masterData={masterData} onRefresh={fetchData} loai="BCTT" />;

  if (activeTab === 'register_kltn') {
    const isBCTTCompleted = bcttStep === 6;
    // Chỉ khóa nếu chưa hoàn thành BCTT VÀ chưa có đăng ký KLTN nào trước đó
    if (!isBCTTCompleted && !myKLTN) {
      return (
        <div className="animate-fade-in card-flat" style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={40} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Tính năng đang khóa</h3>
          <p style={{ maxWidth: '400px', color: '#64748b', lineHeight: '1.6' }}>
            Bạn cần <strong>hoàn thành Báo cáo Thực tập (BCTT)</strong> (đạt trạng thái "Hoàn tất") trước khi có thể đăng ký Khóa luận tốt nghiệp.
          </p>
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            Trạng thái hiện tại: <span style={{ fontWeight: '800', color: 'var(--primary)' }}>Bước {bcttStep} / 6</span>
          </div>
        </div>
      );
    }
    return <RegistrationForm user={user} masterData={masterData} onRefresh={fetchData} loai="KLTN" />;
  }
  if (activeTab === 'status') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <ProgressTracker title="TIẾN ĐỘ BÁO CÁO THỰC TẬP (BCTT)" user={user} currentStep={bcttStep} onRefresh={fetchData} loai="BCTT"
        steps={['Đăng ký', 'GVHD Duyệt', 'Nộp báo cáo', 'GVHD Chấm', 'Có điểm', 'Hoàn tất']} />
      <ProgressTracker title="TIẾN ĐỘ KHÓA LUẬN TỐT NGHIỆP (KLTN)" user={user} currentStep={kltnStep} onRefresh={fetchData} loai="KLTN"
        steps={['Đăng ký', 'GVHD Duyệt', 'Phân GVPB', 'Nộp luận văn', 'Turnitin/Chấm', 'Hội đồng', 'Bảo vệ', 'Chỉnh sửa', 'GVHD Xác nhận', 'Đang hoàn tất', 'Hoàn tất']} />
    </div>
  );
  if (activeTab === 'grades') return <GradesView user={user} grades={myGrades} />;

  // === HOME: Thông tin chung ===
  const gvhdName_BCTT = myBCTT ? lookupName(myBCTT.EmailGV, masterData.users) : '---';
  const gvhdName_KLTN = myKLTN ? lookupName(myKLTN.EmailGV, masterData.users) : '---';
  
  // TỰ ĐỘNG THông báo: KLTN vừa được mở sau khi BCTT hoàn tất
  const bcttCompleted = bcttStep === 6;
  const kltnJustActivated = kltnStep > 1;

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {bcttCompleted && kltnJustActivated && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          backgroundColor: '#d1fae5',
          border: '2px solid #10b981',
          borderRadius: '8px',
          color: '#065f46'
        }}>
          <strong style={{ fontSize: '1.1rem' }}>✓ Chúc mừng!</strong>
          <p style={{ margin: '8px 0 0 0' }}>BCTT của bạn đã hoàn tất. <strong>KLTN đã được tự động kích hoạt!</strong> Bạn có thể bắt đầu đăng ký và nộp bài KLTN ngay.</p>
        </div>
      )}
      <h2 style={{ marginBottom: '24px', fontSize: '1.8rem', fontWeight: '800' }}>Thông tin Sinh viên</h2>
      <div className="card-flat" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px' }}>
        <InfoItem label="HỌ VÀ TÊN" value={user.Ten} />
        <InfoItem label="MÃ SỐ SINH VIÊN" value={user.MS} />
        <InfoItem label="NGÀNH HỌC" value={user.Major} />
        <InfoItem label="HỆ ĐÀO TẠO" value={user.HeDaoTao || 'Đại trà'} />
      </div>

      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <StatusBadgeCard
          title="TRẠNG THÁI BCTT"
          step={bcttStep}
          sub={`GVHD: ${gvhdName_BCTT}`}
          loai="BCTT"
          user={user}
          onRefresh={fetchData}
        />

        <StatusBadgeCard
          title="TRẠNG THÁI KLTN"
          step={kltnStep}
          sub={`GVHD: ${gvhdName_KLTN}`}
          loai="KLTN"
          user={user}
          onRefresh={fetchData}
        />
      </div>
      {(myBCTT || myKLTN) && (
        <div className="card-flat" style={{ marginTop: '24px' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '16px', fontSize: '1rem' }}>ĐỀ TÀI ĐÃ ĐĂNG KÝ</h3>
          <table style={{ width: '100%' }}>
            <thead><tr><th>LOẠI</th><th>TÊN ĐỀ TÀI</th><th>GVHD</th><th>TRẠNG THÁI</th></tr></thead>
            <tbody>
              {myBCTT && <tr className="table-row">
                <td><span style={badgeStyle('#004b91')}>BCTT</span></td>
                <td style={{ fontWeight: '700' }}>{mySubmissions_BCTT_Title || '---'}</td>
                <td>{gvhdName_BCTT}</td>
                <td><EndBadge val={myBCTT.End} /></td>
              </tr>}
              {myKLTN && <tr className="table-row">
                <td><span style={badgeStyle('#059669')}>KLTN</span></td>
                <td style={{ fontWeight: '700' }}>{mySubmissions_KLTN_Title || '---'}</td>
                <td>{gvhdName_KLTN}</td>
                <td><EndBadge val={myKLTN.End} /></td>
              </tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// === SUB-COMPONENTS ===

const badgeStyle = (color) => ({ fontSize: '0.7rem', fontWeight: '800', background: `${color}15`, color, padding: '4px 10px', borderRadius: '4px' });

function EndBadge({ val }) {
  const v = String(val || 'Registered').trim();
  const colorMap = { Registered: '#64748b', Approved: '#2563eb', Graded: '#7c3aed', Completed: '#059669', Yes: '#059669', Pass: '#059669', Rejected: '#ef4444' };
  const color = colorMap[v] || '#64748b';
  return <span style={{ fontSize: '0.75rem', fontWeight: '800', color }}>{v}</span>;
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' }}>{label}</p>
      <p style={{ fontSize: '1rem', fontWeight: '700' }}>{value}</p>
    </div>
  );
}
function StatusBadgeCard({ title, step, sub, loai, user, onRefresh }) {

  const getStatus = () => {

    if (loai === "BCTT") {
      const map = {
        1: "Chưa đăng ký",
        2: "Đã đăng ký",
        3: "GVHD đã duyệt",
        4: "Đã nộp báo cáo",
        5: "Đã chấm điểm",
        6: "Hoàn tất"
      };
      return map[step] || "Chưa xác định";
    }

    if (loai === "KLTN") {
      const map = {
        1: "Chưa đăng ký",
        2: "Đã đăng ký",
        3: "GVHD đã duyệt",
        4: "Đã phân GVPB",
        5: "Đã nộp luận văn",
        6: "Đã chấm Turnitin",
        7: "Đã lập hội đồng",
        8: "Đã bảo vệ",
        9: "Đang chỉnh sửa",
        10: "GVHD xác nhận",
        11: "Hoàn tất"
      };
      return map[step] || "Chưa xác định";
    }
  };

  const status = getStatus();

  const handleUpload = async (fieldName) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf";

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];

        try {
          await api.uploadFile({
            emailSV: user.Email,
            name: `${user.MS}_${fieldName}.pdf`,
            base64,
            loaiDeTai: loai,
            fieldName
          });

          alert("Tải file thành công!");
          onRefresh();
        } catch {
          alert("Lỗi upload file!");
        }
      };

      reader.readAsDataURL(file);
    };

    fileInput.click();
  };

  return (
    <div className="card-flat" style={{ borderLeft: "6px solid #2563eb" }}>

      <p style={{
        fontSize: "0.75rem",
        fontWeight: "900",
        color: "#2563eb",
        marginBottom: "6px"
      }}>
        {title}
      </p>

      {sub && (
        <p style={{
          fontSize: "0.75rem",
          color: "#64748b",
          marginBottom: "12px"
        }}>
          {sub}
        </p>
      )}

      <div style={{
        fontSize: "1.2rem",
        fontWeight: "800",
        color: "#1e293b",
        marginBottom: "12px"
      }}>
        {status}
      </div>

      {/* ==== NÚT NỘP FILE ==== */}

      {/* BCTT: Chỉ hiện khi GVHD đã duyệt (step 3) và SV chưa nộp */}
      {loai === "BCTT" && step === 3 && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => handleUpload("BCTT_Report")} className="btn-primary">
            📄 Nộp Báo cáo TT
          </button>
          <button onClick={() => handleUpload("BCTT_Confirm")} className="btn-primary" style={{ background: "#7c3aed" }}>
            📋 Phiếu xác nhận TT
          </button>
        </div>
      )}

      {/* KLTN: Nộp luận văn khi TBM đã phân GVPB (step 4) */}
      {loai === "KLTN" && step === 4 && (
        <button onClick={() => handleUpload("KLTN_Full")} className="btn-primary">
          📄 Nộp Luận văn
        </button>
      )}

      {/* KLTN: Upload bản sửa sau khi Hội đồng chấm (step 8) */}
      {loai === "KLTN" && step === 8 && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => handleUpload("KLTN_Revised")} className="btn-primary">
            📝 Nộp bản sửa
          </button>
          <button onClick={() => handleUpload("KLTN_Explain")} className="btn-primary" style={{ background: "#7c3aed" }}>
            📋 BB Giải trình
          </button>
        </div>
      )}

    </div>
  );
}

function StatusCard({ title, step, total, theme, sub }) {
  return (
    <div className="card-flat" style={{ borderLeft: `6px solid ${theme}` }}>
      <p style={{ fontSize: '0.75rem', fontWeight: '900', color: theme, marginBottom: '4px' }}>{title}</p>
      {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{sub}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span style={{ fontSize: '1.8rem', fontWeight: '900' }}>{step} <span style={{ fontSize: '1rem', color: '#cbd5e1' }}>/ {total}</span></span>
        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>{Math.round(step / total * 100)}%</span>
      </div>
      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', marginTop: '16px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, step / total * 100)}%`, height: '100%', background: theme, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function RegistrationForm({ user, masterData, onRefresh, loai }) {
  const [form, setForm] = useState({ Tendetai: '', mangDeTai: '', congty: '', emailGV: '', DotHK: '', loaiDeTai: loai });
  const [submitting, setSubmitting] = useState(false);

  const filteredLecturers = (masterData.users || []).filter(u => {
    const r = (u.Role || '').toLowerCase();
    const isGV = r.includes('giangvien') || r.includes('lecturer') || r === 'tbm';
    if (!isGV) return false;
    const uM = String(user.Major || '').toLowerCase().trim();
    const gM = String(u.Major || '').toLowerCase().trim();
    return !gM || gM === uM || gM.includes(uM) || uM.includes(gM);
  });

  const filteredDots = (masterData.dots || []).filter(d => {
    const dM = String(d.Major || '').toLowerCase().trim();
    const uM = String(user.Major || '').toLowerCase().trim();
    const dL = String(d.Loaidetai || d.Loai || '').toLowerCase().trim();
    const isActive = String(d.Active || d.Trangthai || '').toLowerCase().trim() === 'yes' || d.Active === true;
    return (!dM || dM === uM) && (dL === loai.toLowerCase()) && isActive;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.registerTopic({ ...form, emailSV: user.Email });
      alert('Gửi đăng ký thành công!');
      onRefresh();
    } catch { alert('Lỗi khi gửi đăng ký!'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card-flat" style={{ padding: '0', overflow: 'hidden', border: 'none' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '42px', height: '42px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
            <FileText size={20} color="#64748b" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Đăng ký {loai}</h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b' }}>Hệ thống quản lý {loai} HCMUTE</p>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
            <div style={{ gridColumn: 'span 2' }}><FormBlock label="Tên đề tài dự kiến *">
              <input type="text" value={form.Tendetai} onChange={e => setForm({ ...form, Tendetai: e.target.value })} required className="input-field-custom" placeholder="Nhập tên đề tài..." />
            </FormBlock></div>

            <FormBlock label="Đợt đăng ký">
              <select value={form.DotHK} onChange={e => setForm({ ...form, DotHK: e.target.value })} required className="input-field-custom">
                <option value="">-- Chọn đợt --</option>
                {filteredDots.map(d => <option key={d.Dot} value={d.Dot}>{d.Dot}</option>)}
              </select>
            </FormBlock>

            <FormBlock label="Giảng viên hướng dẫn">
              <select value={form.emailGV} onChange={e => setForm({ ...form, emailGV: e.target.value })} required className="input-field-custom">
                <option value="">-- Chọn Giảng viên --</option>
                {filteredLecturers.map(l => <option key={l.Email} value={l.Email}>{l.Ten} ({l.Email})</option>)}
              </select>
            </FormBlock>

            {loai === 'BCTT' && (
              <div style={{ gridColumn: 'span 2' }}>
                <FormBlock label="Công ty thực tập *">
                  <input type="text" value={form.congty} onChange={e => setForm({ ...form, congty: e.target.value })} required className="input-field-custom" placeholder="Nhập tên công ty thực tập..." />
                </FormBlock>
              </div>
            )}
            {loai === 'KLTN' && (
              <div style={{ gridColumn: 'span 2' }}>
                <FormBlock label="Mảng đề tài / Lĩnh vực">
                  <input type="text" value={form.mangDeTai} onChange={e => setForm({ ...form, mangDeTai: e.target.value })} className="input-field-custom" placeholder="VD: Web, Mobile, AI, IoT..." />
                </FormBlock>
              </div>
            )}

            <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
              <button type="submit" className="btn-primary-blue" disabled={submitting}>
                <Send size={18} /> {submitting ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ NGAY'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProgressTracker({ title, user, currentStep, onRefresh, loai, steps }) {
  const handleUpload = async (fieldName) => {
    console.log('📤 handleUpload triggered:', fieldName, 'loai:', loai, 'user:', user.Email);
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.pdf';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0]; 
      if (!file) { console.log('❌ No file selected'); return; }
      console.log('📁 File selected:', file.name, file.size, 'bytes');
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        console.log('✅ Base64 ready, size:', base64.length);
        try {
          console.log('🚀 Calling api.uploadFile with:', { emailSV: user.Email, fieldName, loai });
          await api.uploadFile({ emailSV: user.Email, name: `${user.MS}_${fieldName}.pdf`, base64, loaiDeTai: loai, fieldName });
          console.log('✅ Upload success!');
          alert('Tải bài lên thành công!'); 
          onRefresh();
        } catch (err) {
          console.error('❌ Upload error:', err);
          alert('Lỗi tải file!');
        }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  };

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ClipboardList size={18} /> {title}
      </h3>
      <div className="card-flat" style={{ padding: '40px 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: '900px', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '14px', left: '20px', right: '20px', height: '2px', background: '#e2e8f0', zIndex: 0 }}>
            <div style={{ width: `${Math.min(100, ((currentStep - 1) / (steps.length - 1)) * 100)}%`, height: '100%', background: 'var(--primary)', transition: 'all 0.5s ease' }} />
          </div>
          {steps.map((step, idx) => {
            const isPassed = idx + 1 < currentStep;
            const isCurrent = idx + 1 === currentStep;
            return (
              <div key={idx} style={{ flex: 1, zIndex: 1, textAlign: 'center' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 10px',
                  background: isPassed ? 'var(--success)' : (isCurrent ? 'var(--primary)' : '#cbd5e1'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.8rem'
                }}>
                  {isPassed ? <CheckCircle size={16} /> : idx + 1}
                </div>
                <p style={{ fontSize: '0.65rem', fontWeight: '800', color: (isPassed || isCurrent) ? '#1e293b' : '#94a3b8', maxWidth: '80px', margin: '0 auto' }}>{step}</p>

                {isCurrent && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                    {loai === 'BCTT' && idx === 2 && <>
                      <button onClick={() => handleUpload('BCTT_Report')} className="btn-primary" style={{ fontSize: '0.6rem', padding: '4px 8px' }}>Nộp Báo cáo</button>
                      <button onClick={() => handleUpload('BCTT_Confirm')} className="btn-primary" style={{ fontSize: '0.6rem', padding: '4px 8px', background: '#7c3aed' }}>Phiếu xác nhận TT</button>
                    </>}
                    {loai === 'KLTN' && idx === 3 && <button onClick={() => handleUpload('KLTN_Full')} className="btn-primary" style={{ fontSize: '0.6rem', padding: '4px 8px' }}>Nộp Luận văn</button>}
                    {loai === 'KLTN' && idx === 7 && <>
                      <button onClick={() => handleUpload('KLTN_Revised')} className="btn-primary" style={{ fontSize: '0.6rem', padding: '4px 8px' }}>Nộp Bản sửa</button>
                      <button onClick={() => handleUpload('KLTN_Explain')} className="btn-primary" style={{ fontSize: '0.6rem', padding: '4px 8px', background: '#7c3aed' }}>BB Giải trình</button>
                    </>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GradesView({ grades }) {
  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '1.8rem', fontWeight: '800' }}>Kết quả học tập</h2>
      <div className="card-flat" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr><th>HẠNG MỤC</th><th>ĐIỂM GVHD</th><th>ĐIỂM GVPB</th><th>ĐIỂM HỘI ĐỒNG</th><th>TRUNG BÌNH</th></tr>
          </thead>
          <tbody>
            {grades.map((g, idx) => {
              const dHD = parseFloat(g.Diem_GVHD) || 0;
              const dPB = parseFloat(g.Diem_GVPB) || 0;
              const dHoi = parseFloat(g.Diem_HoiDong) || 0;
              const count = [dHD, dPB, dHoi].filter(v => v > 0).length;
              const avg = count > 0 ? ((dHD + dPB + dHoi) / count).toFixed(1) : '---';
              return (
                <tr key={idx} className="table-row">
                  <td style={{ fontWeight: '800' }}>{g.Loai || g.LoaiDeTai}</td>
                  <td>{g.Diem_GVHD || '---'}</td>
                  <td>{g.Diem_GVPB || '---'}</td>
                  <td>{g.Diem_HoiDong || '---'}</td>
                  <td style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '1.1rem' }}>{avg}</td>
                </tr>
              );
            })}
            {grades.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Chưa có dữ liệu điểm.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const FormBlock = ({ label, children }) => (
  <div style={{ marginBottom: '4px' }}>
    <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{label}</label>
    {children}
  </div>
);

export default StudentView;
