import type { AppError, ErrorCode } from '../../shared/errors/appError';
const messages: Partial<Record<ErrorCode, string>> = {
  MIGRATION_FAILED: 'Chưa nâng cấp được dữ liệu cũ. Dữ liệu vẫn được giữ nguyên; nhật ký tạm thời chưa mở được. Không xóa dữ liệu ứng dụng.',
  EXPLANATION_INVALID: 'Dùng giải thích mẫu từ dữ liệu đã tính.',
  CAPABILITY_UNAVAILABLE: 'Tính năng trực tuyến chưa khả dụng. Bạn vẫn có thể thao tác trên thiết bị.',
  INVALID_INPUT: 'Thông tin chưa hợp lệ. Kiểm tra lại các trường.',
  INVALID_IMAGE:
    'Ảnh không đọc được hoặc không được hỗ trợ. Chọn JPEG, PNG hoặc WebP.',
  IMAGE_TOO_LARGE: 'Ảnh quá lớn. Chọn ảnh nhỏ hơn.',
  NETWORK_UNAVAILABLE:
    'Không kết nối được. Thử lại, dùng mẫu hoặc nhập thủ công.',
  AI_TIMEOUT: 'Phân tích phản hồi quá lâu. Bạn có thể thử lại hoặc dùng mẫu.',
  AI_RATE_LIMITED: 'Dịch vụ đang giới hạn lượt gọi. Thử lại sau hoặc dùng mẫu.',
  AI_UNAVAILABLE:
    'Phân tích trực tiếp chưa khả dụng. Dùng mẫu hoặc nhập thủ công.',
  AI_INVALID_RESPONSE:
    'Kết quả tự động không dùng được. Bạn có thể nhập thủ công.',
  AI_UPSTREAM_ERROR: 'Dịch vụ phân tích gặp lỗi. Thử lại hoặc dùng mẫu.',
  STORAGE_WRITE_FAILED:
    'Chưa lưu được dữ liệu. Nội dung vẫn được giữ để thử lại.',
  STORAGE_READ_FAILED:
    'Không đọc được dữ liệu đã lưu. Thử lại; đây không phải nhật ký trống.',
};
export const errorPresenter = (error: AppError) =>
  messages[error.code] ?? 'Không hoàn tất được thao tác. Vui lòng thử lại.';
