# BÁO CÁO: LUẬT BẢO MẬT REALTIME DATABASE – BÀI THỰC HÀNH 6

**Sinh viên:** …………………… **Lớp:** …………… **Mã SV:** …………… **Dự án Firebase:** `mychat-9d36c`

## 1. Nguyên tắc
Gốc dữ liệu đặt `".read": false, ".write": false`, tức **mặc định cấm tất cả**. Mỗi nhánh chỉ mở đúng quyền cần dùng và đều yêu cầu `auth != null`.

"Là thành viên" được kiểm tra bằng `conversations/{convId}/members/{auth.uid}`. Với một multi-path update, luật xét cả trạng thái **trước khi ghi** (`root…`) và **sau khi ghi** (`newData.parent()…`). Nhờ vậy một lệnh `update()` có thể vừa tạo nhóm vừa ghi tin hệ thống và `userChats` của các thành viên.

## 2. Các luật chính

| Yêu cầu | Luật (rút gọn) | Ý nghĩa |
|---|---|---|
| **Chỉ thành viên đọc/ghi tin** | `messages/$convId/.read`: `root.child('conversations/'+$convId+'/members/'+auth.uid).exists()`<br>`$msgId/.write`: `!data.exists() && newData.child('senderId').val() === auth.uid && <là thành viên>` | Người ngoài không đọc được, kể cả khi dùng query `limitToLast(20)`. Không gửi tin dưới tên người khác được. Không sửa hay xóa tin đã gửi |
| **Chỉ người gửi được thu hồi** | `recalled/.write`: `data.parent().child('senderId').val() === auth.uid`<br>`.validate`: `!data.exists() \|\| newData.val() === true`<br>`text, imageUrl, lat, lng/.write`: chỉ người gửi, chỉ được **xóa** và phải kèm `recalled = true` | Node tin không bị xóa, chỉ được đánh dấu `recalled: true` và không đặt lại `false` được |
| **Tự ghi trạng thái gõ của mình** | `typing/$convId/$uid/.write`: `auth.uid === $uid && <là thành viên>`, kiểu `boolean` | Không bật hoặc tắt "đang soạn tin" hộ người khác được |
| **Tự ghi cảm xúc của mình** | `messages/…/reactions/$uid/.write`: `auth.uid === $uid && <là thành viên>` | Mỗi người chỉ thả hoặc gỡ cảm xúc của chính mình |
| Số chưa đọc | `userChats/$uid/$convId/unread/.validate`: người khác chỉ được ghi `data.val() + 1` (đúng với `increment(1)`), chủ sở hữu được đặt về 0 | Không ai đặt số chưa đọc tùy ý được |
| Thông báo | `notifications/$uid`: chỉ chủ sở hữu đọc và đánh dấu đã đọc. Người khác chỉ được **tạo mới** với `fromUid === auth.uid` | Không đọc trộm, không giả mạo người gửi thông báo |
| Quản trị nhóm | `members/$id`: thành viên được thêm người. Chỉ trưởng nhóm (`createdBy`) được xóa người khác. Ai cũng tự rời nhóm được | Rời nhóm hoặc xóa thành viên đúng quyền |

## 3. Chứng minh thao tác bị từ chối

**a) Gọi thẳng vào database thật khi chưa đăng nhập (ngày 11/11/2026):**

```
GET https://mychat-9d36c-default-rtdb.asia-southeast1.firebasedatabase.app/messages.json
→ { "error" : "Permission denied" }

PUT …/messages/test/x.json   {"senderId":"hacker","type":"text",...}
→ { "error" : "Permission denied" }
```

**b) Rules Playground:** B thử đặt `recalled = true` cho tin do A gửi → **Denied**. Khi đổi UID thành A → **Allowed**.

> *(Dán ảnh `11-playground-thu-hoi-bi-tu-choi.png` vào đây)*

**c) Kiểm thử tự động trên Firebase Emulator** (`tools/rules-test`, log ở `docs/minh-chung/rules-test-log.txt`): **57 passed, 0 failed**. Các thao tác trái phép dưới đây đều bị `permission_denied`:
- C (người ngoài) đọc hoặc gửi tin vào cuộc trò chuyện A–B;
- B thu hồi tin của A;
- B ghi `typing` hoặc `reactions` của A;
- A sửa `unread` của B thành 50;
- D tự thêm mình vào nhóm;
- thành viên thường xóa người khác khỏi nhóm;
- người đã rời nhóm vẫn gửi tin.

**Kết luận:** luật đáp ứng đủ 3 yêu cầu của đề bài: chỉ thành viên đọc và ghi tin nhắn, chỉ người gửi thu hồi được tin, mỗi người chỉ ghi trạng thái đang gõ và cảm xúc của mình. Ngoài ra luật còn bảo vệ số chưa đọc, thông báo và quyền quản trị nhóm.
