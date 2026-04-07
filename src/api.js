const API_URL = 'https://script.google.com/macros/s/AKfycbwWbPoqE-6llHXUJlvzbm8p53dfgSqVsxVHjsncsOaeMYXcETSgaNtihz2QqS3wefX1oA/exec'; // HÃY THAY BẰNG URL DEPLOY MỚI CỦA BẠN

const api = {
  // Lấy toàn bộ dữ liệu (Master Data)
  getMasterData: async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Lỗi getMasterData:", err);
      throw err;
    }
  },

  // Đăng nhập (Xác thực qua Email)
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

  // Đăng ký đề tài (BCTT / KLTN)
  registerTopic: async (payload) => {
    try {
      // payload: { emailSV, emailGV, tenDeTai, nganh, dot, loaiDeTai, mangDeTai, congty }
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', payload })
      });
      return { success: true };
    } catch (err) {
      console.error("Lỗi registerTopic:", err);
      throw err;
    }
  },

  // GVHD Phê duyệt (Có thể đổi tên đề tài)
  approveTopicBulk: async (payload) => {
    try {
      // payload: { emailGV, svEmails: [], status: 'Approved'/'Rejected', newTitle: '' }
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approveTopicBulk', payload })
      });
      return { success: true };
    } catch (err) {
      console.error("Lỗi approveTopicBulk:", err);
      throw err;
    }
  },

  // Trưởng bộ môn phân công (GVPB & Hội đồng)
  assignTBM: async (payload) => {
    try {
      // payload: { svEmail, reviewerEmail, councilID, loaiDeTai }
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assignTBM', payload })
      });
      return { success: true };
    } catch (err) {
      console.error("Lỗi assignTBM:", err);
      throw err;
    }
  },

  // Chấm điểm (GVHD, GVPB, Hội đồng)
  submitGrade: async (payload) => {
    try {
      // payload: { emailSV, role: 'GVHD'/'GVPB'/'HD', grade, comment, loaiDeTai, councilMinutes: '' }
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submitGrade', payload })
      });
      return { success: true };
    } catch (err) {
      console.error("Lỗi submitGrade:", err);
      throw err;
    }
  },

  // Admin quản lý đợt
  updatePeriod: async (payload) => {
    try {
      // payload: { periodName, major, type, isActive: true/false }
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePeriod', payload })
      });
      return { success: true };
    } catch (err) {
      console.error("Lỗi updatePeriod:", err);
      throw err;
    }
  },

  // Tải file lên Drive và lưu link vào Sheet
  uploadFile: async (payload) => {
    try {
      // payload: { emailSV, name, base64, loaiDeTai, fieldName } 
      // fieldName: BCTT_Report, BCTT_Confirm, KLTN_Full, KLTN_Revised, etc.
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uploadFile', payload })
      });
      return { success: true };
    } catch (err) {
      console.error("Lỗi uploadFile:", err);
      throw err;
    }
  }
};

export default api;
