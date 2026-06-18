/**
 * Google Apps Script — upload file vào thư mục Google Drive.
 *
 * Thư mục mặc định: fileAnthanhson
 * https://drive.google.com/drive/folders/1bFKgBpAr6iDRnykOsmQ5MZkJ1RQFFOhG
 *
 * Cài đặt:
 * 1. Mở https://script.google.com → Dự án mới → dán file này.
 * 2. (Tuỳ chọn) Script properties → UPLOAD_SECRET = chuỗi bí mật (khớp GOOGLE_DRIVE_UPLOAD_SECRET trên server).
 * 3. Triển khai → Triển khai dưới dạng ứng dụng web:
 *    - Thực thi với tư cách: Tôi
 *    - Ai có quyền truy cập: Bất kỳ ai (hoặc Anyone with Google account)
 * 4. Copy URL Web App → đặt vào server/.env:
 *    GOOGLE_DRIVE_UPLOAD_URL=<url>
 *    GOOGLE_DRIVE_FOLDER_ID=1bFKgBpAr6iDRnykOsmQ5MZkJ1RQFFOhG
 */

var DEFAULT_FOLDER_ID = '1bFKgBpAr6iDRnykOsmQ5MZkJ1RQFFOhG';

/** Mở URL trên trình duyệt để kiểm tra script đã triển khai. */
function doGet() {
  return jsonResponse({
    success: true,
    message: 'Google Drive upload API đang hoạt động. Server gửi POST action=uploadFile.',
    folderId: DEFAULT_FOLDER_ID,
  });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action !== 'uploadFile') {
      return jsonResponse({ success: false, error: 'Unknown action: ' + data.action });
    }

    var expectedSecret = PropertiesService.getScriptProperties().getProperty('UPLOAD_SECRET') || '';
    if (expectedSecret && data.secret !== expectedSecret) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    var folderId = data.folderId || DEFAULT_FOLDER_ID;
    var fileName = String(data.fileName || 'upload').trim() || 'upload';
    var mimeType = data.mimeType || 'application/octet-stream';
    var base64 = data.fileBase64;

    if (!base64) {
      return jsonResponse({ success: false, error: 'Missing fileBase64' });
    }

    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);

    // Cho phép xem qua link (thư mục đã share thì có thể bỏ qua)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Bỏ qua nếu không đủ quyền đổi sharing
    }

    var fileId = file.getId();
    return jsonResponse({
      success: true,
      fileId: fileId,
      fileUrl: file.getUrl(),
      viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error && error.toString ? error.toString() : String(error),
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** Chạy thử trong editor: Upload → Chọn hàm testUpload */
function testUpload() {
  var folder = DriveApp.getFolderById(DEFAULT_FOLDER_ID);
  Logger.log('Folder OK: ' + folder.getName());
}
