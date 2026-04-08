const API_URL = 'https://script.google.com/macros/s/AKfycbxAGAEh6snWjMFtnPSP_tjz0eD6yqp7LkjheEvasDxg_p7JwCH2Ly81X9-AqkFi-_B0/exec';

// === HELPER: Tra cứu tên SV/GV từ danh sách users ===
function lookupName(email, users) {
  if (!email || !users) return email || '---';
  const u = users.find(u => String(u.Email).toLowerCase().trim() === String(email).toLowerCase().trim());
  return u ? u.Ten : email;
}

const api = {
  getMasterData: async () => {
    try {
      const response = await fetch(API_URL);
      return await response.json();
    } catch (err) {
      console.error("Lỗi getMasterData:", err);
      throw err;
    }
  },

  login: async (email) => {
    try {
      const data = await api.getMasterData();
      const user = data.users.find(u =>
        String(u.Email).toLowerCase().trim() === String(email).toLowerCase().trim()
      );
      if (user) return { success: true, user };
      return { success: false, message: "Email không tồn tại trong danh sách User!" };
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      throw err;
    }
  },

  // SV đăng ký đề tài (BCTT / KLTN)
  registerTopic: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi registerTopic:", err); throw err; }
  },

  // GVHD phê duyệt đề tài
  approveTopicBulk: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approveTopicBulk', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi approveTopicBulk:", err); throw err; }
  },

  // TBM phân công GVPB (tạo row mới Role=GVPB)
  assignGVPB: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assignGVPB', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi assignGVPB:", err); throw err; }
  },

  // TBM tạo hội đồng (4 rows: CTHD, TVHD1, TVHD2, ThukyHD)
  createCouncil: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createCouncil', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi createCouncil:", err); throw err; }
  },

  // Chấm điểm (GVHD / GVPB / HĐ)
  submitGrade: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submitGrade', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi submitGrade:", err); throw err; }
  },

  // TBM cập nhật quota
  updateQuota: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateQuota', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi updateQuota:", err); throw err; }
  },

  // Admin quản lý đợt
  updatePeriod: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePeriod', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi updatePeriod:", err); throw err; }
  },

  approveLecturerQuota: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approveLecturerQuota', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi approveLecturerQuota:", err); throw err; }
  },

  approveFinalRevision: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approveFinalRevision', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi approveFinalRevision:", err); throw err; }
  },

  // Upload file lên Drive
  uploadFile: async (payload) => {
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uploadFile', payload })
      });
      return { success: true };
    } catch (err) { console.error("Lỗi uploadFile:", err); throw err; }
  }
};

export { lookupName };
export default api;
