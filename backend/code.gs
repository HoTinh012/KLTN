const ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet() {
  return ContentService.createTextOutput(JSON.stringify(getMasterData()))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const res = JSON.parse(e.postData.contents);
    const action = res.action;
    const payload = res.payload;

    switch (action) {
      case 'register':         return createResponse(registerTopic(payload));
      case 'approveTopicBulk': return createResponse(approveTopicBulk(payload));
      case 'assignGVPB':       return createResponse(assignGVPB(payload));
      case 'createCouncil':    return createResponse(createCouncil(payload));
      case 'submitGrade':      return createResponse(submitGrade(payload));
      case 'updatePeriod':     return createResponse(updatePeriodStatus(payload));
      case 'updateQuota':      return createResponse(updateQuota(payload));
      case 'uploadFile':       return createResponse(handleFileUpload(payload));
      default: return createResponse({ error: 'Hành động không hợp lệ' });
    }
  } catch (err) {
    return createResponse({ error: err.message });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 
 * LẤY TOÀN BỘ DỮ LIỆU (MASTER DATA)
 */
function getMasterData() {
  return {
    users: getTableData("User"),
    dots: getTableData("Dot"),
    quotas: getTableData("Quota"),
    fields: getTableData("Field"),
    linkGiangvien: getTableData("LinkGiangvien"),
    linkBainop: getTableData("Linkbainop"),
    diem: getTableData("Điểm")
  };
}

/** 
 * ĐĂNG KÝ ĐỀ TÀI (BCTT / KLTN)
 * LinkGiangvien: EmailSV, EmailGV, Role, Diadiem, Diem, End, Link
 * Linkbainop: EmailSV, Tendetai, DotHK, Loaidetai, Linkbai
 */
function registerTopic(payload) {
  const { emailSV, emailGV, Tendetai, loaiDeTai, mangDeTai, congty, DotHK } = payload;
  
  const gvSheet = findSheetByKeywords("LinkGiangvien");
  const bnSheet = findSheetByKeywords("Linkbainop");
  if (!gvSheet || !bnSheet) return { error: "Không tìm thấy các tab cần thiết" };

  const gvData = gvSheet.getDataRange().getValues();

  // 0. Ràng buộc: Phải hoàn thành BCTT mới được đăng ký KLTN
  if (loaiDeTai === 'KLTN') {
    const bcttFound = gvData.some(row => {
      const isSV = cleanEmailStr(row[0]) === emailSV.toLowerCase();
      const isBCTT = String(row[6]).trim() === 'BCTT' || String(row[2]).trim() === 'BCTT';
      const isDone = ['Completed', 'Pass', 'Yes', 'Graded', 'Confirmed'].includes(String(row[5]).trim());
      return isSV && isBCTT && isDone;
    });
    if (!bcttFound) {
      return { error: "Bạn chưa đủ điều kiện đăng ký KLTN. Yêu cầu hoàn thành Báo cáo thực tập (BCTT) trước." };
    }
  }

  // 1. LinkGiangvien - Role = GVHD, End = Registered
  let foundGv = -1;
  for(let i=1; i<gvData.length; i++) {
    const cleanEmail = cleanEmailStr(gvData[i][0]);
    if(cleanEmail === emailSV.toLowerCase() && String(gvData[i][2]).trim() === 'GVHD') {
      foundGv = i + 1; break;
    }
  }
  // EmailSV, EmailGV, Role=GVHD, Diadiem=congty/mang, Diem="", End=Registered, Link=""
  const gvRow = [emailSV, emailGV, "GVHD", congty || mangDeTai || "", "", "Registered", loaiDeTai];
  if(foundGv > 0) gvSheet.getRange(foundGv, 1, 1, 7).setValues([gvRow]);
  else gvSheet.appendRow(gvRow);

  // 2. Linkbainop
  const bnData = bnSheet.getDataRange().getValues();
  let foundBn = -1;
  const targetLoai = String(loaiDeTai).trim();
  for(let i=1; i<bnData.length; i++) {
    const cleanEmail = cleanEmailStr(bnData[i][0]);
    if(cleanEmail === emailSV.toLowerCase() && String(bnData[i][3]).trim() === targetLoai) {
      foundBn = i + 1; break;
    }
  }
  const bnRow = [emailSV, Tendetai, DotHK || "", loaiDeTai, ""];
  if(foundBn > 0) bnSheet.getRange(foundBn, 1, 1, 5).setValues([bnRow]);
  else bnSheet.appendRow(bnRow);

  try { adjustQuota(emailGV, -1); } catch(e) {}
  return { success: true };
}

/**
 * GVHD PHÊ DUYỆT ĐỀ TÀI
 */
function approveTopicBulk(payload) {
  const { emailGV, svEmails, status, newTitle } = payload;
  const gvSheet = findSheetByKeywords("LinkGiangvien");
  const bnSheet = findSheetByKeywords("Linkbainop");

  svEmails.forEach(emailSV => {
    const gvData = gvSheet.getDataRange().getValues();
    for(let i=1; i<gvData.length; i++) {
      if(String(gvData[i][0]).toLowerCase() === emailSV.toLowerCase() && 
         String(gvData[i][1]).toLowerCase() === emailGV.toLowerCase() &&
         String(gvData[i][2]).trim() === 'GVHD') {
        gvSheet.getRange(i+1, 6).setValue(status); // End column
        if(status === 'Rejected') adjustQuota(emailGV, 1);
        break;
      }
    }
    if(newTitle && bnSheet) {
      const bnData = bnSheet.getDataRange().getValues();
      for(let i=1; i<bnData.length; i++) {
        if(String(bnData[i][0]).toLowerCase() === emailSV.toLowerCase()) {
          bnSheet.getRange(i+1, 2).setValue(newTitle);
          break;
        }
      }
    }
  });
  return { success: true };
}

/** 
 * TBM PHÂN CÔNG GVPB - Tạo ROW mới với Role=GVPB
 */
function assignGVPB(payload) {
  const { svEmail, reviewerEmail, loaiDeTai } = payload;
  const sheet = findSheetByKeywords("LinkGiangvien");
  
  // Kiểm tra đã có GVPB chưa
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]).toLowerCase() === svEmail.toLowerCase() && String(data[i][2]).trim() === 'GVPB') {
      // Cập nhật GVPB hiện tại
      sheet.getRange(i+1, 2).setValue(reviewerEmail);
      return { success: true };
    }
  }
  // Tạo row GVPB mới: EmailSV, EmailGV, Role=GVPB, Diadiem=Online, Diem="", End="", Link=""
  sheet.appendRow([svEmail, reviewerEmail, "GVPB", "Online", "", "", ""]);
  return { success: true };
}

/**
 * TBM TẠO HỘI ĐỒNG - Tạo 4 rows: CTHD, TVHD1, TVHD2, ThukyHD
 */
function createCouncil(payload) {
  const { svEmail, cthd, tvhd1, tvhd2, thuky, diadiem, loaiDeTai } = payload;
  const sheet = findSheetByKeywords("LinkGiangvien");
  
  // Xóa hội đồng cũ nếu có
  const data = sheet.getDataRange().getValues();
  const councilRoles = ['CTHD', 'TVHD1', 'TVHD2', 'ThukyHD'];
  for(let i=data.length-1; i>=1; i--) {
    if(String(data[i][0]).toLowerCase() === svEmail.toLowerCase() && councilRoles.includes(String(data[i][2]).trim())) {
      sheet.deleteRow(i+1);
    }
  }
  
  // Tạo 4 rows mới
  const loc = diadiem || "Online";
  if(cthd)  sheet.appendRow([svEmail, cthd,  "CTHD",    loc, "", "", ""]);
  if(tvhd1) sheet.appendRow([svEmail, tvhd1, "TVHD1",   loc, "", "", ""]);
  if(tvhd2) sheet.appendRow([svEmail, tvhd2, "TVHD2",   loc, "", "", ""]);
  if(thuky) sheet.appendRow([svEmail, thuky, "ThukyHD",  loc, "", "", ""]);
  
  return { success: true };
}

/** 
 * CHẤM ĐIỂM (GVHD / GVPB / HĐ)
 */
function submitGrade(payload) {
  const { emailSV, role, grade, comment, loaiDeTai, councilMinutes } = payload;
  const sheet = findSheetByKeywords("Điểm");
  if(!sheet) return { error: "Tab Điểm không tồn tại" };
  
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  for(let i=1; i<data.length; i++) {
    if(String(data[i][1]).toLowerCase() === emailSV.toLowerCase() && String(data[i][2]).trim() === loaiDeTai) {
      rowIdx = i + 1; break;
    }
  }

  if(rowIdx > 0) {
    if (role === 'GVHD') sheet.getRange(rowIdx, 4).setValue(grade);
    if (role === 'GVPB') sheet.getRange(rowIdx, 5).setValue(grade);
    if (role === 'HD' || role === 'HỘI ĐỒNG') {
      sheet.getRange(rowIdx, 6).setValue(grade);
      if(councilMinutes) sheet.getRange(rowIdx, 8).setValue(councilMinutes);
    }
    if(comment) sheet.getRange(rowIdx, 7).setValue(comment);
  } else {
    const newRow = [NgayHienTai(), emailSV, loaiDeTai, 
      role==='GVHD'?grade:"", role==='GVPB'?grade:"", (role==='HD'||role==='HỘI ĐỒNG')?grade:"", 
      comment||"", councilMinutes||""];
    sheet.appendRow(newRow);
  }
  
  // Nếu là GVHD chấm KLTN xong → cập nhật End = Graded
  if(role === 'GVHD') {
    const gvSheet = findSheetByKeywords("LinkGiangvien");
    if(gvSheet) {
      const gvData = gvSheet.getDataRange().getValues();
      for(let i=1; i<gvData.length; i++) {
        if(String(gvData[i][0]).toLowerCase() === emailSV.toLowerCase() && String(gvData[i][2]).trim() === 'GVHD') {
          const currentEnd = String(gvData[i][5]).trim();
          if(currentEnd === 'Approved') gvSheet.getRange(i+1, 6).setValue('Graded');
          break;
        }
      }
    }
  }
  return { success: true };
}

/** 
 * QUẢN LÝ ĐỢT
 */
function updatePeriodStatus(payload) {
  const { periodName, major, type, isActive } = payload;
  const sheet = findSheetByKeywords("Dot");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === periodName && String(data[i][1]) === major && String(data[i][2]) === type) {
      sheet.getRange(i+1, 4).setValue(isActive ? "Yes" : "No");
      return { success: true };
    }
  }
  return { error: "Không tìm thấy đợt" };
}

/**
 * CẬP NHẬT QUOTA
 */
function updateQuota(payload) {
  const { emailGV, quota } = payload;
  const sheet = findSheetByKeywords("Quota");
  if(!sheet) return { error: "Tab Quota không tồn tại" };
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]).toLowerCase().trim() === emailGV.toLowerCase().trim()) {
      sheet.getRange(i+1, 4).setValue(Number(quota)); // Quota column
      return { success: true };
    }
  }
  return { error: "Không tìm thấy GV" };
}

/** 
 * UPLOAD FILE DRIVE
 */
function handleFileUpload(payload) {
  const { emailSV, name, base64, loaiDeTai, fieldName } = payload; 
  const folder = DriveApp.getRootFolder();
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const url = file.getUrl();
  const sheet = findSheetByKeywords("Linkbainop");
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const colIdx = headers.indexOf(fieldName) + 1;

  if (colIdx <= 0) return { error: `Không tìm thấy cột ${fieldName} trong Linkbainop` };

  const targetLoai = String(loaiDeTai).trim();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]).toLowerCase() === emailSV.toLowerCase() && String(data[i][3]).trim() === targetLoai) {
      sheet.getRange(i+1, colIdx).setValue(url);
      return { success: true, url };
    }
  }
  return { error: "Không tìm thấy bản ghi nộp bài" };
}

// --- UTILITIES ---

function findSheetByKeywords(kw) {
  const all = ss.getSheets();
  for (let s of all) {
    if (s.getName().toLowerCase().includes(kw.toLowerCase())) return s;
  }
  return null;
}

function getTableData(kw) {
  const sheet = findSheetByKeywords(kw);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim().replace(/\s+/g, ''));
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      if (h.toLowerCase().includes('email')) val = cleanEmailStr(val);
      obj[h] = val;
    });
    return obj;
  });
}

function cleanEmailStr(val) {
  if (!val) return "";
  const match = String(val).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase().trim() : String(val).toLowerCase().trim();
}

function adjustQuota(emailGV, amount) {
  const sheet = findSheetByKeywords("Quota");
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === emailGV.toLowerCase().trim()) {
      sheet.getRange(i + 1, 4).setValue(Number(data[i][3]) + amount);
      return;
    }
  }
}

function NgayHienTai() { return new Date().toLocaleDateString('vi-VN'); }
