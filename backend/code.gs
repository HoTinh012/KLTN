const ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet() {
  return ContentService.createTextOutput("UniThesis Backend - Access Restricted")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  // Handle CORS preflight
  if (e.parameter && e.parameter.method === 'OPTIONS') {
    return ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const res = JSON.parse(e.postData.contents);
    const action = res.action;
    const payload = res.payload;

    switch (action) {
      case 'login':           return createResponse(handleLogin(payload));
      case 'getMasterData':   return createResponse(getMasterData());
      case 'register':         return createResponse(registerTopic(payload));
      case 'approveTopicBulk': return createResponse(approveTopicBulk(payload));
      case 'assignGVPB':       return createResponse(assignGVPB(payload));
      case 'createCouncil':    return createResponse(createCouncil(payload));
      case 'submitGrade':      return createResponse(submitGrade(payload));
      case 'activateKLTN':     return createResponse(activateKLTN(payload));
      case 'updatePeriod':     return createResponse(updatePeriodStatus(payload));
      case 'updateQuota':      return createResponse(updateQuota(payload));
      case 'approveLecturerQuota': return createResponse(approveLecturerQuota(payload));
      case 'approveFinalRevision': return createResponse(approveFinalRevision(payload));
      case 'uploadFile':       return createResponse(handleFileUpload(payload));
      default: return createResponse({ error: 'Hành động không hợp lệ: ' + action });
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
 * HELPER: Tìm sheet theo keyword
 */
function findSheetByKeywords(keyword) {
  const sheets = ss.getSheets();
  for (let sheet of sheets) {
    if (sheet.getName().toLowerCase().includes(keyword.toLowerCase())) {
      return sheet;
    }
  }
  return null; // Hoặc ss.getSheetByName(keyword) nếu chính xác
}

/** 
 * XỬ LÝ ĐĂNG NHẬP
 */
function handleLogin(payload) {
  const { email } = payload;
  const users = getTableData("User");
  const user = users.find(u => 
    String(u.Email).toLowerCase().trim() === String(email).toLowerCase().trim()
  );
  
  if (user) {
    return { success: true, user };
  }
  return { success: false, message: "Email không tồn tại trong hệ thống!" };
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

  // --- RIÊNG KLTN: Bắt buộc hoàn thành BCTT trước ---
  if (String(loaiDeTai).toUpperCase().includes("KLTN")) {
    const bcttDone = gvData.slice(1).some(row => {
      const emailMatch = cleanEmailStr(row[0]) === emailSV.toLowerCase();
      const typeMatch = String(row[6]).toUpperCase().includes("BCTT");
      const statusMatch = ["Completed", "Pass", "Yes"].includes(String(row[5]).trim());
      return emailMatch && typeMatch && statusMatch;
    });
    if (!bcttDone) {
      return { error: "Bạn cần hoàn thành Báo cáo thực tập (BCTT) trước khi đăng ký Khóa luận!" };
    }
  }

  // 1. LinkGiangvien - Role = GVHD, End = Registered
  const targetLoai = String(loaiDeTai).trim().toUpperCase();
  let foundGv = -1;
  
  for(let i=1; i<gvData.length; i++) {
    const cleanEmail = cleanEmailStr(gvData[i][0]);
    const rowLoai = String(gvData[i][6]).trim().toUpperCase();
    const isGVHD = String(gvData[i][2]).trim() === 'GVHD';
    
    // Chỉ ghi đè nếu trùng cả EmailSV, Role=GVHD và cùng một loại đề tài (BCTT/KLTN)
    if(cleanEmail === emailSV.toLowerCase() && isGVHD && rowLoai === targetLoai) {
      foundGv = i + 1; 
      break;
    }
  }
  
  // EmailSV, EmailGV, Role=GVHD, Diadiem=congty/mang, Diem="", End=Registered, Link=loaiDeTai
  const gvRow = [emailSV, emailGV, "GVHD", congty || mangDeTai || "", "", "Registered", loaiDeTai];
  if(foundGv > 0) gvSheet.getRange(foundGv, 1, 1, 7).setValues([gvRow]);
  else gvSheet.appendRow(gvRow);

  // 2. Linkbainop
  const bnData = bnSheet.getDataRange().getValues();
  const bnHeaders = bnData[0].map(h => String(h).trim());
  const normalizedBnHeaders = bnHeaders.map(h => String(h).toLowerCase().replace(/[_\s]+/g, ''));

  const fileTypeLabels = {
    BCTT: ["Bài làm", "Phiếu Xác nhận TT"],
    KLTN: ["Link bài sau khi xong KLTN", "Link bài Turnitin KLTN", "Link bài chỉnh sửa sau khi bảo vệ", "Link Biên bản giải trình chỉnh sửa sau khi bảo vệ"]
  };

  const usesWideSchema = [
    'bctt_report', 'bctt_confirm', 'kltn_full', 'kltn_turnitin', 'kltn_revised', 'kltn_explain'
  ].some(h => normalizedBnHeaders.includes(h));

  if (usesWideSchema) {
    let foundBn = -1;
    for (let i = 1; i < bnData.length; i++) {
      const cleanEmail = cleanEmailStr(bnData[i][0]);
      if (cleanEmail === emailSV.toLowerCase() && String(bnData[i][3]).trim().toUpperCase() === targetLoai) {
        foundBn = i + 1;
        break;
      }
    }
    const bnRow = [emailSV, Tendetai, DotHK || "", loaiDeTai, "", "", "", "", "", "", "", ""];
    if (foundBn > 0) bnSheet.getRange(foundBn, 1, 1, bnRow.length).setValues([bnRow]);
    else bnSheet.appendRow(bnRow);
  } else {
    const labels = fileTypeLabels[targetLoai] || ["Linkbai"];
    const existingRows = bnData.slice(1);
    const normalizedExisting = existingRows.map(row => String(row[4] || '').trim().toLowerCase());
    labels.forEach(label => {
      const labelNormalized = label.trim().toLowerCase();
      let found = false;
      for (let i = 1; i < bnData.length; i++) {
        const cleanEmail = cleanEmailStr(bnData[i][0]);
        if (cleanEmail === emailSV.toLowerCase() && String(bnData[i][3]).trim() === targetLoai) {
          const existingLabel = String(bnData[i][4] || '').trim().toLowerCase();
          if (existingLabel === labelNormalized) {
            found = true;
            break;
          }
        }
      }
      if (!found) {
        const row = [emailSV, Tendetai, DotHK || "", loaiDeTai, label];
        bnSheet.appendRow(row);
      }
    });
  }

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

    for (let i = 1; i < gvData.length; i++) {

      const svEmail = String(gvData[i][0]).trim().toLowerCase();
      const gvEmail = String(gvData[i][1]).trim().toLowerCase();
      const role = String(gvData[i][2]).trim();
      const rowLoai = String(gvData[i][6]).trim().toUpperCase();

      // Chỉ phê duyệt đúng dòng của sinh viên đó và đúng vai trò GVHD
      // Chúng ta so sánh EmailSV và EmailGV
      if (svEmail === emailSV.toLowerCase() &&
          gvEmail === emailGV.toLowerCase() &&
          role === "GVHD") {

        // Cập nhật trạng thái
        gvSheet.getRange(i + 1, 6).setValue(status);

        if (status === "Rejected") {
          adjustQuota(emailGV, 1);
        }

        // ===== AUTO MỞ KLTN =====
        // Kiểm tra xem BCTT này đã có loaiDeTai chưa (đọc từ column G - index 6)
        let loaiDeTai = String(gvData[i][6] || "").trim().toUpperCase();
        
        // Nếu loaiDeTai trống, kiểm tra trong LinkBainop
        if(loaiDeTai === "" && bnSheet) {
          const bnData = bnSheet.getDataRange().getValues();
          for(let j = 1; j < bnData.length; j++) {
            const bnEmail = cleanEmailStr(bnData[j][0]);
            const bnLoai = String(bnData[j][3] || '').trim().toUpperCase();
            if(bnEmail === emailSV.toLowerCase() && (bnLoai === 'BCTT' || bnLoai === '')) {
              loaiDeTai = 'BCTT';
              break;
            }
          }
        }

        // ✓ Mở KLTN khi BCTT được Approved HOẶC Completed (đảm bảo chỉ mở khi BCTT thực sự xong)
        if ((status === "Approved" || status === "Completed") && loaiDeTai === "BCTT") {
          try {
            activateKLTN({
              emailSV: emailSV,
              emailGV: emailGV
            });
            Logger.log("Auto activated KLTN for: " + emailSV);
          } catch (e) {
            Logger.log("Warning: Không thể auto-activate KLTN: " + e.message);
          }
        }

        break;
      }
    }

    // Update tiêu đề bài nộp
    if (newTitle && bnSheet) {
      const bnData = bnSheet.getDataRange().getValues();

      for (let i = 1; i < bnData.length; i++) {
        if (String(bnData[i][0]).toLowerCase() === emailSV.toLowerCase()) {
          bnSheet.getRange(i + 1, 2).setValue(newTitle);
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
  const targetLoai = String(loaiDeTai || "KLTN").trim().toUpperCase();
  
  // Kiểm tra đã có GVPB cho loại đề tài này chưa
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    const rowLoai = String(data[i][6]).trim().toUpperCase();
    if(String(data[i][0]).toLowerCase() === svEmail.toLowerCase() && 
       String(data[i][2]).trim() === 'GVPB' &&
       rowLoai === targetLoai) {
      // Cập nhật GVPB hiện tại
      sheet.getRange(i+1, 2).setValue(reviewerEmail);
      return { success: true };
    }
  }
  // Tạo row GVPB mới: EmailSV, EmailGV, Role=GVPB, Diadiem=Online, Diem="", End="", Link=loaiDeTai
  sheet.appendRow([svEmail, reviewerEmail, "GVPB", "Online", "", "", loaiDeTai || "KLTN"]);
  return { success: true };
}

/**
 * TBM TẠO HỘI ĐỒNG - Tạo 4 rows: CTHD, TVHD1, TVHD2, ThukyHD
 */
function createCouncil(payload) {
  const { svEmail, cthd, tvhd1, tvhd2, thuky, diadiem, loaiDeTai } = payload;
  const sheet = findSheetByKeywords("LinkGiangvien");
  const targetLoai = String(loaiDeTai || "KLTN").trim().toUpperCase();
  
  // Xóa hội đồng cũ của loại đề tài này nếu có
  const data = sheet.getDataRange().getValues();
  const councilRoles = ['CTHD', 'TVHD1', 'TVHD2', 'ThukyHD'];
  for(let i=data.length-1; i>=1; i--) {
    const rowLoai = String(data[i][6]).trim().toUpperCase();
    if(String(data[i][0]).toLowerCase() === svEmail.toLowerCase() && 
       councilRoles.includes(String(data[i][2]).trim()) &&
       rowLoai === targetLoai) {
      sheet.deleteRow(i+1);
    }
  }
  
  // Tạo 4 rows mới
  const loc = diadiem || "Online";
  const type = loaiDeTai || "KLTN";
  if(cthd)  sheet.appendRow([svEmail, cthd,  "CTHD",    loc, "", "", type]);
  if(tvhd1) sheet.appendRow([svEmail, tvhd1, "TVHD1",   loc, "", "", type]);
  if(tvhd2) sheet.appendRow([svEmail, tvhd2, "TVHD2",   loc, "", "", type]);
  if(thuky) sheet.appendRow([svEmail, thuky, "ThukyHD",  loc, "", "", type]);
  
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
      const targetLoai = String(loaiDeTai).trim().toUpperCase();
      for(let i=1; i<gvData.length; i++) {
        const rowLoai = String(gvData[i][6]).trim().toUpperCase();
        if(String(gvData[i][0]).toLowerCase() === emailSV.toLowerCase() && 
           String(gvData[i][2]).trim() === 'GVHD' && 
           rowLoai === targetLoai) {
          const currentEnd = String(gvData[i][5]).trim();
          if(currentEnd === 'Approved') gvSheet.getRange(i+1, 6).setValue('Graded');
          break;
        }
      }
    }
    
    // TỰ ĐỘNG: Khi GVHD chấm BCTT xong → Mở KLTN (chỉ khi loaiDeTai rõ ràng là BCTT)
    let loaiDeTaiCheck = String(loaiDeTai || '').trim().toUpperCase();
    
    // Nếu loaiDeTai trống, kiểm tra trong LinkGiangvien xem có BCTT không
    if(loaiDeTaiCheck === '') {
      const gvSheet2 = findSheetByKeywords("LinkGiangvien");
      if(gvSheet2) {
        const gvData2 = gvSheet2.getDataRange().getValues();
        for(let j = 1; j < gvData2.length; j++) {
          const gvEmail2 = cleanEmailStr(gvData2[j][0]);
          if(gvEmail2 === emailSV.toLowerCase() && String(gvData2[j][2]).trim() === 'GVHD') {
            const storedLoai = String(gvData2[j][6] || '').trim().toUpperCase();
            if(storedLoai === 'BCTT') {
              loaiDeTaiCheck = 'BCTT';
              break;
            }
          }
        }
      }
    }
    
    // ✓ Chỉ mở KLTN khi loaiDeTai rõ ràng là BCTT
    if(loaiDeTaiCheck === 'BCTT') {
      const gvSheet = findSheetByKeywords("LinkGiangvien");
      let emailGV = '';
      if(gvSheet) {
        const gvData = gvSheet.getDataRange().getValues();
        for(let i=1; i<gvData.length; i++) {
          if(String(gvData[i][0]).toLowerCase() === emailSV.toLowerCase() && String(gvData[i][2]).trim() === 'GVHD') {
            const currentLoai = String(gvData[i][6] || '').trim().toUpperCase();
            if(currentLoai === 'BCTT') {
              emailGV = String(gvData[i][1]).toLowerCase().trim();
              break;
            }
          }
        }
      }
      if(emailGV) {
        try {
          activateKLTN({ emailSV, emailGV });
        } catch(e) {
          Logger.log("Warning: Không thể auto-activate KLTN: " + e.message);
        }
      }
    }
  }
  return { success: true };
}

/**
 * TỰ ĐỘNG MỞ KLTN KHI BCTT HOÀN TẤT
 * Gọi từ submitGrade khi BCTT được chấm
 */
function activateKLTN(payload) {
  const { emailSV, emailGV } = payload;
  
  const gvSheet = findSheetByKeywords("LinkGiangvien");
  const bnSheet = findSheetByKeywords("Linkbainop");
  if (!gvSheet || !bnSheet) return { error: "Không tìm thấy các tab cần thiết" };
  
  // 1. Kiểm tra KLTN đã có chưa (kiểm tra toàn bộ sheet)
  const gvData = gvSheet.getDataRange().getValues();
  let kltnExists = false;
  for(let i=1; i<gvData.length; i++) {
    const cleanEmail = cleanEmailStr(gvData[i][0]);
    const loaiDeTai = String(gvData[i][6] || '').trim().toUpperCase();
    
    if(cleanEmail === emailSV.toLowerCase() && String(gvData[i][2]).trim() === 'GVHD') {
      if(loaiDeTai === 'KLTN') {
        kltnExists = true;
        break;
      }
    }
  }
  
  if(kltnExists) {
    return { already_exists: true };
  }
  
  // 2. Tìm thông tin BCTT: Tên đề tài, DotHK
  const bnData = bnSheet.getDataRange().getValues();
  let bcttTitle = '';
  let bcttDotHK = '';
  
  // Tìm BCTT bằng loaiDeTai hoặc fallback tìm bất kỳ bản ghi nào cho student
  for(let i=1; i<bnData.length; i++) {
    const cleanEmail = cleanEmailStr(bnData[i][0]);
    const loaiDeTaiCheck = String(bnData[i][3] || '').trim().toUpperCase();
    const linkContent = String(bnData[i][4] || '').toUpperCase();
    
    if(cleanEmail === emailSV.toLowerCase()) {
      // Ưu tiên BCTT được ghi rõ
      if(loaiDeTaiCheck === 'BCTT') {
        bcttTitle = String(bnData[i][1] || '').trim();
        bcttDotHK = String(bnData[i][2] || '').trim();
        break;
      }
      // Fallback: nếu không có BCTT, lấy bản ghi đầu tiên (có thể là BCTT cũ)
      if(bcttTitle === '' && (loaiDeTaiCheck === '' || linkContent.includes('BCTT'))) {
        bcttTitle = String(bnData[i][1] || '').trim();
        bcttDotHK = String(bnData[i][2] || '').trim();
      }
    }
  }
  
  // 3. Tạo bản ghi KLTN ở LinkGiangvien
  // [EmailSV, EmailGV, Role=GVHD, Diadiem=Online, Diem="", End=Pending, Link=KLTN]
  const kltnGvRow = [emailSV, emailGV, "GVHD", "Online", "", "Pending", "KLTN"];
  gvSheet.appendRow(kltnGvRow);
  
  // 4. Tạo bản ghi KLTN ở Linkbainop
  // [EmailSV, Tendetai, DotHK, Loaidetai, Linkbai=""]
  const kltnBnRow = [emailSV, bcttTitle, bcttDotHK, "KLTN", ""];
  bnSheet.appendRow(kltnBnRow);
  
  // 5. Điều chỉnh quota cho GV
  try { adjustQuota(emailGV, -1); } catch(e) {}
  
  return { success: true, message: "KLTN đã được mở" };
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
 * DUYỆT QUOTA GIẢNG VIÊN (Mở slot đăng ký)
 */
function approveLecturerQuota(payload) {
  const { emailGV, status } = payload; // status: 'Approved' | 'Pending'
  const sheet = findSheetByKeywords("Quota");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]).toLowerCase().trim() === emailGV.toLowerCase().trim()) {
      sheet.getRange(i+1, 5).setValue(status); // Column 5: Status
      return { success: true };
    }
  }
  return { error: "Không tìm thấy GV" };
}

/**
 * DUYỆT BẢN SỬA SAU BẢO VỆ (GVHD & CTHD)
 */
function approveFinalRevision(payload) {
  const { emailSV, role, status } = payload; // role: 'GVHD' | 'CTHD', status: 'Agree' | 'Disagree'
  const sheet = findSheetByKeywords("LinkGiangvien");
  const data = sheet.getDataRange().getValues();
  
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]).toLowerCase() === emailSV.toLowerCase() && String(data[i][2]) === role) {
      sheet.getRange(i+1, 8).setValue(status); // Column 8 will store the revision approval status
      return { success: true };
    }
  }
  return { error: "Không tìm thấy bản ghi tương ứng" };
}

/** 
 * UPLOAD FILE DRIVE
 */
function handleFileUpload(payload) {
  const { emailSV, name, base64, loaiDeTai, fieldName } = payload;
  Logger.log("=== UPLOAD START ===");
  Logger.log("emailSV: " + emailSV + ", loaiDeTai: " + loaiDeTai + ", fieldName: " + fieldName);
  
  // Upload file to Google Drive
  const folder = DriveApp.getRootFolder();
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = file.getUrl().replace('/edit', '/view');
  Logger.log("File uploaded to Drive: " + url);
  
  // Get sheet
  const sheet = findSheetByKeywords("Linkbainop");
  if (!sheet) {
    Logger.log("ERROR: Không tìm thấy tab Linkbainop");
    return { error: "Không tìm thấy tab Linkbainop" };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log("ERROR: Linkbainop không có dữ liệu");
    return { error: "Linkbainop không có dữ liệu" };
  }

  // Map fieldName -> label
  const uploadLabelMap = {
    'bctt_report': 'Bài làm',
    'bctt_confirm': 'Phiếu Xác nhận TT',
    'kltn_full': 'Link bài sau khi xong KLTN',
    'kltn_turnitin': 'Link bài Turnitin KLTN',
    'turnitin_report': 'Link bài Turnitin KLTN',
    'kltn_revised': 'Link bài chỉnh sửa sau khi bảo vệ',
    'kltn_explain': 'Link Biên bản giải trình chỉnh sửa sau khi bảo vệ'
  };
/** 
 * Hàm tiện ích: Dọn dẹp dữ liệu rác trong Sheet LinkGiangvien
 * Cách dùng: Mở Apps Script Editor -> Chọn hàm này -> Bấm Run (Chạy)
 */
function cleanLinkGiangvien() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetByKeywords("Link", "Giangvien");
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowsToKeep = [headers];
  
  for (let i = 1; i < data.length; i++) {
    const emailSV = String(data[i][0]).toLowerCase();
    // Bỏ qua các dòng bị lỗi (Email chứa định dạng ngày tháng hoặc không chứa @)
    if (emailSV.includes("gmt") || !emailSV.includes("@")) {
      Logger.log("Đã loại bỏ dòng lỗi: " + emailSV);
      continue;
    }
    rowsToKeep.push(data[i]);
  }
  
  if (rowsToKeep.length < data.length) {
    sheet.clearContents();
    sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
    Logger.log("Đã dọn dẹp xong. Giữ lại " + rowsToKeep.length + " dòng.");
  } else {
    Logger.log("Không tìm thấy dòng lỗi nào để dọn dẹp.");
  }
}

  const normalizedField = normalizeFieldName(fieldName || '');
  const label = uploadLabelMap[normalizedField];
  const targetLoai = String(loaiDeTai).trim();
  
  Logger.log("Normalized field: " + normalizedField + ", label: " + label + ", targetLoai: " + targetLoai);

  // Get Linkbai column (column E = index 4)
  const linkColIdx = 5; // Column E (1-indexed)
  
  // Find matching row by email + loai + label
  let foundRow = -1;
  let firstMatchRow = -1;

  for (let i = 1; i < data.length; i++) {
    const rowEmail = cleanEmailStr(data[i][0]);
    const rowLoai = String(data[i][3]).trim();
    
    if (rowEmail === emailSV.toLowerCase() && rowLoai === targetLoai) {
      if (firstMatchRow < 0) firstMatchRow = i + 1;
      
      const currentLabel = String(data[i][4] || '').trim();
      Logger.log("Row " + (i+1) + ": email=" + rowEmail + ", loai=" + rowLoai + ", label='" + currentLabel + "'");
      
      // If label matches, update this row
      if (label && normalizeFieldName(currentLabel) === normalizeFieldName(label)) {
        foundRow = i + 1;
        Logger.log("✓ LABEL MATCH found at row: " + foundRow);
        break;
      }
    }
  }

  // If no exact label match, use first matching row
  if (foundRow <= 0) {
    foundRow = firstMatchRow;
    Logger.log("No label match, using first matching row: " + foundRow);
  }

  // Update sheet
  if (foundRow > 0) {
    sheet.getRange(foundRow, linkColIdx).setValue(url);
    Logger.log("✓ Updated row " + foundRow + ", col " + linkColIdx + " with URL");
    Logger.log("=== UPLOAD END - SUCCESS ===");
    return { success: true, url };
  }

  Logger.log("✗ ERROR: Không tìm thấy row khớp với email=" + emailSV + ", loai=" + targetLoai);
  Logger.log("=== UPLOAD END - FAILED ===");
  return { error: "Không tìm thấy bản ghi nộp bài cho email: " + emailSV };
}

function normalizeFieldName(text) {
  return String(text || '').toLowerCase().replace(/[_\s]+/g, '');
}

function findLinkbainopRowIndex(data, emailSV, loaiDeTai) {
  for (let i = 1; i < data.length; i++) {
    if (cleanEmailStr(data[i][0]) === emailSV.toLowerCase() && String(data[i][3]).trim() === loaiDeTai) {
      return i + 1;
    }
  }
  return -1;
}

function createLinkbainopRow(sheet, columnCount, emailSV, loaiDeTai, label, url, existingData) {
  let title = '';
  let dotHK = '';
  for (let i = 1; i < existingData.length; i++) {
    if (cleanEmailStr(existingData[i][0]) === emailSV.toLowerCase() && String(existingData[i][3]).trim() === loaiDeTai) {
      title = String(existingData[i][1] || '').trim();
      dotHK = String(existingData[i][2] || '').trim();
      break;
    }
  }
  const row = new Array(columnCount).fill('');
  row[0] = emailSV;
  row[1] = title;
  row[2] = dotHK;
  row[3] = loaiDeTai;
  row[4] = url;
  sheet.appendRow(row);
  return true;
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
      const cleanKey = String(h).trim().replace(/\s+/g, '');
      const lowerCamelKey = cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1);
      const lowerKey = cleanKey.toLowerCase();
      obj[cleanKey] = val;
      obj[lowerCamelKey] = val;
      obj[lowerKey] = val;
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
