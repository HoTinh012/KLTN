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
      case 'register': return createResponse(registerTopic(payload));
      case 'approveTopicBulk': return createResponse(approveTopicBulk(payload));
      case 'assignTBM': return createResponse(assignTBM(payload));
      case 'submitGrade': return createResponse(submitGrade(payload));
      case 'updatePeriod': return createResponse(updatePeriodStatus(payload));
      case 'uploadFile': return createResponse(handleFileUpload(payload));
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
 */
function registerTopic(payload) {
  const { emailSV, emailGV, tenDeTai, loaiDeTai, mangDeTai, congty } = payload;
  
  const gvSheet = findSheetByKeywords("LinkGiangvien");
  const bnSheet = findSheetByKeywords("Linkbainop");
  if (!gvSheet || !bnSheet) return { error: "Không tìm thấy các tab cần thiết" };

  // 1. Cập nhật LinkGiangvien
  const gvData = gvSheet.getDataRange().getValues();
  let foundGv = -1;
  for(let i=1; i<gvData.length; i++) {
    if(String(gvData[i][1]).toLowerCase() === emailSV.toLowerCase() && gvData[i][3] === loaiDeTai) {
      foundGv = i + 1; break;
    }
  }
  const gvRow = [NgayHienTai(), emailSV, emailGV, loaiDeTai, "New", "", ""];
  if(foundGv > 0) gvSheet.getRange(foundGv, 1, 1, 7).setValues([gvRow]);
  else gvSheet.appendRow(gvRow);

  // 2. Cập nhật Linkbainop
  const bnData = bnSheet.getDataRange().getValues();
  let foundBn = -1;
  for(let i=1; i<bnData.length; i++) {
    if(String(bnData[i][1]).toLowerCase() === emailSV.toLowerCase() && bnData[i][4] === loaiDeTai) {
      foundBn = i + 1; break;
    }
  }
  const bnRow = [NgayHienTai(), emailSV, tenDeTai, "", loaiDeTai, mangDeTai||"", congty||""];
  if(foundBn > 0) bnSheet.getRange(foundBn, 1, 1, 7).setValues([bnRow]);
  else bnSheet.appendRow(bnRow);

  try { adjustQuota(emailGV, -1); } catch(e) {}
  return { success: true };
}

/**
 * GVHD PHÊ DUYỆT (CÓ THỂ ĐỔI TÊN ĐỀ TÀI)
 */
function approveTopicBulk(payload) {
  const { emailGV, svEmails, status, newTitle } = payload;
  const gvSheet = findSheetByKeywords("LinkGiangvien");
  const bnSheet = findSheetByKeywords("Linkbainop");

  svEmails.forEach(emailSV => {
    const gvData = gvSheet.getDataRange().getValues();
    for(let i=1; i<gvData.length; i++) {
      if(String(gvData[i][1]).toLowerCase() === emailSV.toLowerCase() && String(gvData[i][2]).toLowerCase() === emailGV.toLowerCase()) {
        gvSheet.getRange(i+1, 5).setValue(status);
        if(status === 'Rejected') adjustQuota(emailGV, 1);
        break;
      }
    }
    if(newTitle && bnSheet) {
      const bnData = bnSheet.getDataRange().getValues();
      for(let i=1; i<bnData.length; i++) {
        if(String(bnData[i][1]).toLowerCase() === emailSV.toLowerCase()) {
          bnSheet.getRange(i+1, 3).setValue(newTitle);
          break;
        }
      }
    }
  });
  return { success: true };
}

/** 
 * TRƯỞNG BỘ MÔN PHÂN CÔNG (GVPB & HỘI ĐỒNG)
 */
function assignTBM(payload) {
  const { svEmail, reviewerEmail, councilID, loaiDeTai } = payload;
  const sheet = findSheetByKeywords("LinkGiangvien");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][1]).toLowerCase() === svEmail.toLowerCase() && data[i][3] === loaiDeTai) {
      sheet.getRange(i+1, 6).setValue(reviewerEmail);
      sheet.getRange(i+1, 7).setValue(councilID);
      return { success: true };
    }
  }
  return { error: "Không tìm thấy bản ghi" };
}

/** 
 * CHẤM ĐIỂM 3 BÊN
 */
function submitGrade(payload) {
  const { emailSV, role, grade, comment, loaiDeTai, councilMinutes } = payload;
  const sheet = findSheetByKeywords("Điểm");
  if(!sheet) return { error: "Tab Điểm không tồn tại" };
  
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  for(let i=1; i<data.length; i++) {
    if(String(data[i][1]).toLowerCase() === emailSV.toLowerCase() && data[i][2] === loaiDeTai) {
      rowIdx = i + 1; break;
    }
  }

  if(rowIdx > 0) {
    if (role === 'GVHD') sheet.getRange(rowIdx, 4).setValue(grade);
    if (role === 'GVPB') sheet.getRange(rowIdx, 5).setValue(grade);
    if (role === 'HD') {
      sheet.getRange(rowIdx, 6).setValue(grade);
      sheet.getRange(rowIdx, 8).setValue(councilMinutes);
    }
    sheet.getRange(rowIdx, 7).setValue(comment);
  } else {
    const newRow = [NgayHienTai(), emailSV, loaiDeTai, role==='GVHD'?grade:"", role==='GVPB'?grade:"", role==='HD'?grade:"", comment, councilMinutes||""];
    sheet.appendRow(newRow);
  }
  return { success: true };
}

/** 
 * QUẢN LÝ ĐỢT (ADMIN)
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
 * XỬ LÝ UPLOAD FILE CHUYÊN BIỆT
 */
function handleFileUpload(payload) {
  const { emailSV, name, base64, loaiDeTai, fieldName } = payload; // fieldName: Linkbai, BCTT_Report, etc.
  const folder = DriveApp.getRootFolder();
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const url = file.getUrl();
  const sheet = findSheetByKeywords("Linkbainop");
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const colIdx = headers.indexOf(fieldName) + 1 || 4; // Mặc định cột 4 nếu không tìm thấy

  for(let i=1; i<data.length; i++) {
    if(String(data[i][1]).toLowerCase() === emailSV.toLowerCase() && data[i][4] === loaiDeTai) {
      sheet.getRange(i+1, colIdx).setValue(url);
      return { success: true, url };
    }
  }
  return { error: "Không tìm thấy bản ghi nộp bài" };
}

// --- HÀM HỖ TRỢ (UTILITIES) ---
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
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx]);
    return obj;
  });
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
