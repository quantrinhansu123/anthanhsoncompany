/**
 * Google Apps Script to export contract data to a Google Doc template.
 * Deploy this as a Web App to receive data from the frontend.
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Replace with your Google Doc template ID
    const TEMPLATE_ID = 'YOUR_TEMPLATE_ID_HERE'; 
    const FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // Optional: Folder to save generated docs
    
    const docFile = DriveApp.getFileById(TEMPLATE_ID);
    const folder = FOLDER_ID ? DriveApp.getFolderById(FOLDER_ID) : DriveApp.getRootFolder();
    
    // Create a copy of the template
    const newDocName = `Hợp đồng - ${data.soHopDong} - ${data.tenGoiThau}`;
    const newDocFile = docFile.makeCopy(newDocName, folder);
    
    // Set sharing: Anyone with the link can edit
    newDocFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    
    const newDocId = newDocFile.getId();
    const doc = DocumentApp.openById(newDocId);
    const body = doc.getBody();
    
    // Replace placeholders with data using the @ numbering format in the template
    const placeholders = {
      '1@': data.soHopDong || '',
      '2@': data.tenGoiThau || '',
      '3@': data.projectName || '',
      '4@': Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"),
      '5@': data.tenDayDuChuDauTu || '',
      '6@': data.tenGoiThau || '',
      '7@': data.projectName || '',
      '8@': data.tenDayDuChuDauTu || '',
      '9@': data.tenDayDuChuDauTu || '',
      '10@': data.tenGoiThau || '',
      '11@': data.projectName || '',
      '12@': data.soHopDong || '',
      // Extra fields available for generic use
      '{{soHopDong}}': data.soHopDong || '',
      '{{tenGoiThau}}': data.tenGoiThau || '',
      '{{projectName}}': data.projectName || '',
      '{{tenDayDuChuDauTu}}': data.tenDayDuChuDauTu || '',
      '{{daiDienBenA}}': data.daiDienBenA || '',
      '{{chucVuDaiDienA}}': data.chucVuDaiDienA || '',
      '{{mst}}': data.mst || '',
      '{{diaChiTaiThoiDiemKy}}': data.diaChiTaiThoiDiemKy || '',
      '{{giaTriHD}}': formatCurrency(data.giaTriHD),
      '{{giaTriQT}}': formatCurrency(data.giaTriQT),
      '{{ngayKyHD}}': data.ngayKyHD || '',
      '{{nhanSuTen}}': data.nhanSuTen || '',
    };
    
    for (let key in placeholders) {
      body.replaceText(key, placeholders[key]);
    }
    
    doc.saveAndClose();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      documentUrl: newDocFile.getUrl(),
      documentId: newDocId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatCurrency(amount) {
  if (!amount) return '0';
  return Number(amount).toLocaleString('vi-VN') + ' đ';
}
