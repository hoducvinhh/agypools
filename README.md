<div align="center">

# AgyPool - Antigravity Account Pool & Quota Manager

### Smart Multi-Account Pool & Quota Manager for Google Antigravity
**Tác giả: hoducvinhh (Hồ Đức Vinh)**

[![License](https://img.shields.io/badge/License-MIT-00b4d8?style=flat-square)](LICENSE)

<p>Hệ thống quản lý nhóm tài khoản Google thông minh trên Antigravity, tự động chuyển sang tài khoản có hạn ngạch (quota) cao nhất tuyệt đối, đồng bộ hóa tức thời với Antigravity IDE và theo dõi chi tiết giới hạn của từng model AI theo chu kỳ 5 giờ và hàng tuần.</p>

</div>

---

## Tính Năng Nổi Bật

- **Tự Động Switch Sang Tài Khoản Có Quota Cao Nhất Tuyệt Đối**: Luôn ưu tiên tài khoản có hạn ngạch lớn nhất để tối ưu hiệu suất làm việc.
- **Đồng Bộ Hóa Ngay Lập Tức Với Antigravity IDE**: Cập nhật trực tiếp vào Unified State Sync (USS) và Language Server để IDE chuyển đổi tài khoản theo thời gian thực.
- **Theo Dõi Hạn Ngạch Chi Tiết Theo Từng Model**:
  - Gemini Models: 5-Hour Limit, Weekly Limit & Thời gian reset đếm ngược.
  - Claude Models (Sonnet, Haiku, GPT-4o): 5-Hour Limit, Weekly Limit & Thời gian reset đếm ngược.
  - Theo dõi chi tiết từng model cụ thể: `Gemini 2.5 Pro`, `Gemini 2.5 Flash`, `Claude 3.5 Sonnet`, `Claude 3.7 Sonnet`.
- **1-Click Manual Switch**: Nút chuyển đổi nhanh trực tiếp trên từng thẻ tài khoản.
- **Huy Hiệu 👑 MAX QUOTA**: Tự động đánh dấu tài khoản đang có hạn ngạch cao nhất.
- **Phân Tích Tiêu Thụ Token Trực Quan**: Biểu đồ phân tích chi tiết lượng token (Input, Output, Thinking, Cache Hit Rate) theo Ngày, Tuần, Tháng.
- **Bảo Mật Cao**: Token OAuth được lưu trữ an toàn trong Secret Storage của hệ thống.

---

## Hướng Dẫn Sử Dụng

1. Mở tab **Account Pool** trên thanh Activity Bar của Antigravity IDE.
2. Tài khoản đang đăng nhập trong IDE sẽ được tự động nhận diện.
3. Bấm nút **+ Add** để đăng nhập thêm các tài khoản Google khác qua trình duyệt.
4. Hệ thống sẽ tự động luân chuyển tài khoản có hạn ngạch cao nhất trước mỗi lượt prompt.
5. Bạn cũng có thể bấm vào mục trên Status Bar để xem nhanh trạng thái hoặc chuyển đổi tài khoản thủ công.

---

## Giấy Phép

[MIT License](LICENSE) © **hoducvinhh**
