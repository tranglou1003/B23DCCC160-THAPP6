# MyChat – Bài thực hành 6

Ứng dụng nhắn tin **React Native CLI + Firebase (Authentication + Realtime Database) + Cloudinary**.
Phát triển tiếp từ ứng dụng chat của Bài thực hành 5. Bài này bổ sung: chat nhóm, gửi ảnh, trạng thái "đang soạn tin" / "đã xem", thu hồi tin, thả cảm xúc và màn hình Thông báo dùng dữ liệu thật.

---

## 1. Chức năng

| Yêu cầu | Cách làm | File chính |
|---|---|---|
| **A1. "đang soạn tin…"** | Ghi `typing/{convId}/{uid}=true` khi gõ. Cờ tự tắt sau 3 giây không gõ, khi gửi tin (xóa trong cùng multi-path update) hoặc khi rời màn hình. `onDisconnect().remove()` xóa cờ khi app bị tắt đột ngột | `chatService.setTyping`, `ChatScreen` |
| **A1. Đã gửi / Đã xem** | `readStatus/{convId}/{uid}` = thời điểm đọc cuối. Tin cuối của mình hiện "✓ Đã gửi" hoặc "✓✓ Đã xem HH:mm"; trong nhóm hiện "Đã xem bởi …" | `ChatScreen` |
| **A1. "Hoạt động X phút trước"** | `status/{uid} = {state, lastChanged, activeConv}`, dùng `.info/connected` + `onDisconnect().set(offline)` | `presenceService.js` |
| **A2. Thu hồi / Sao chép / Cảm xúc** | Nhấn giữ một tin để mở menu: 👍 ❤️ 😂 😮 😢, Trả lời, Sao chép, Thu hồi (chỉ tin của mình). Thu hồi không xóa node mà đặt `recalled: true`. Nếu đó là tin cuối thì cập nhật luôn `lastMessage` ở Home | `MessageMenu`, `chatService.recallMessage/toggleReaction` |
| **A3. Gửi ảnh** | Nút 📷 cho chọn Chụp ảnh hoặc Thư viện (`react-native-image-picker`). App xin quyền camera, nếu bị từ chối thì báo cho người dùng. Ảnh được thu nhỏ (cạnh dài ≤ 1024px) rồi tải lên Cloudinary (unsigned preset). Trong lúc tải hiện bong bóng tạm có loading, lỗi thì có nút "Thử lại". Nhấn vào ảnh để xem toàn màn hình | `uploadService.js`, `MessageBubble`, `ImageViewer` |
| **A4. Chat nhóm** | Màn hình Tạo nhóm: nhập tên nhóm và chọn thành viên bằng checkbox (≥ 2 người ngoài bản thân). Trong nhóm, tin của người khác có tên người gửi. Tiêu đề hiện tên nhóm và số người đang online. Home hiện cả chat 1-1 và nhóm, sắp theo tin mới nhất, mỗi thành viên có số chưa đọc riêng | `CreateGroupScreen`, `groupService.js`, `HomeScreen` |
| **A5. Thông báo thật** | Ghi `notifications/{uid}` khi: có tin mới mà người nhận không mở cuộc trò chuyện đó (dựa vào `status/{uid}/activeConv`), được thêm vào nhóm, hoặc có người thả cảm xúc vào tin của mình. Tab có badge số chưa đọc. Nhấn vào thông báo thì mở đúng cuộc trò chuyện và đánh dấu đã đọc. Có nút "Đánh dấu tất cả đã đọc" | `notificationService.js`, `NotificationsScreen` |
| **C. Quản trị nhóm** | Đổi tên nhóm, thêm thành viên, xóa thành viên (chỉ trưởng nhóm), rời nhóm (tạo tin hệ thống "A đã rời nhóm") | `GroupInfoScreen`, `AddMembersScreen` |
| **C. Trả lời tin** | Lưu `replyTo` trong tin nhắn. Nhấn vào phần trích dẫn thì cuộn tới tin gốc, tự tải thêm trang cũ nếu tin gốc chưa được tải | `ChatScreen.jumpTo` |
| **C. Hồ sơ cá nhân** | Đổi họ tên và ảnh đại diện (lưu ở `users/{uid}`, Danh bạ, Home và Chat tự cập nhật) | `ProfileScreen` |
| **C. Thông báo cục bộ** | Dùng `@notifee/react-native` để hiện thông báo khi app chạy nền. Nhấn vào thì mở đúng cuộc trò chuyện | `localNotificationService.js` |
| **C. Tìm kiếm tin nhắn** | Nút 🔍 trong khung chat, tìm không phân biệt dấu. Nhấn vào kết quả thì cuộn tới tin đó | `chatService.searchMessages` |

### Yêu cầu kỹ thuật (Phần B)

- **Multi-path update:** `chatService.buildMessageUpdates()` gom vào **một** lệnh `update(ref(db), updates)` các đường dẫn: tin nhắn, `lastMessage`/`updatedAt` của mọi thành viên, `unread` của các thành viên khác (`increment(1)`, không đọc giá trị cũ), thông báo, xóa cờ typing và cập nhật readStatus. Tạo nhóm, thêm/xóa thành viên và rời nhóm cũng dùng một update duy nhất.
- **Phân trang:** lần đầu `get(query(orderByKey(), limitToLast(20)))`. Khi kéo lên đầu danh sách thì tải 20 tin cũ hơn bằng `endBefore(oldestKey) + limitToLast(20)`. Danh sách là `FlatList inverted`, tin cũ được nối vào cuối mảng dữ liệu nên vị trí cuộn không bị nhảy.
- **Service:** toàn bộ code Firebase và Cloudinary nằm trong `src/services/`.
- **Listener:** mọi `onValue/onChildAdded/...` đều trả về hàm hủy và được gọi trong cleanup của `useEffect`.
- **Bảo mật Cloudinary:** chỉ dùng *unsigned upload preset*, mã nguồn không chứa API secret.

---

## 2. Cấu trúc thư mục

```text
ChatApp/
├─ App.js, index.js
├─ database.rules.json         ← Luật bảo mật Realtime Database
├─ firebase.json               ← dùng cho `firebase deploy --only database`
├─ src/
│  ├─ config/appConfig.js      ← ĐIỀN cấu hình Firebase + Cloudinary
│  ├─ services/
│  │  ├─ firebase.js           khởi tạo app, auth (lưu phiên bằng AsyncStorage), db
│  │  ├─ authService.js        đăng ký, đăng nhập, đổi hồ sơ
│  │  ├─ presenceService.js    online/offline, onDisconnect, activeConv
│  │  ├─ userService.js        danh bạ, trạng thái
│  │  ├─ chatService.js        gửi tin (multi-path), phân trang, thu hồi, cảm xúc, typing, đã xem, tìm kiếm
│  │  ├─ groupService.js       tạo nhóm, đổi tên, thêm/xóa thành viên, rời nhóm
│  │  ├─ uploadService.js      thu nhỏ ảnh + upload Cloudinary
│  │  ├─ notificationService.js  notifications/{uid}
│  │  └─ localNotificationService.js  notifee
│  ├─ context/                 AuthContext, DataContext (users, status, chats, notifications)
│  ├─ navigation/              Stack + Bottom Tabs (badge)
│  ├─ components/              Avatar, Header, MessageBubble, MessageMenu, ImageViewer, MemberPicker
│  ├─ screens/                 Login, Register, Home, Contacts, Notifications, Profile,
│  │                           Chat, CreateGroup, GroupInfo, AddMembers
│  └─ utils/                   định dạng thời gian, preview tin nhắn
└─ tools/rules-test/           Kiểm thử luật bảo mật bằng Firebase Emulator
```

### Cấu trúc dữ liệu

```text
users/{uid}:                 { displayName, email, avatarUrl, createdAt }
status/{uid}:                { state: "online"|"offline", lastChanged, activeConv }
conversations/{convId}:      { type: "direct"|"group", name, members: {uid: true}, createdBy, createdAt }
messages/{convId}/{msgId}:   { senderId, senderName, type: "text"|"image"|"location"|"system",
                               text, imageUrl, imageWidth, imageHeight, lat, lng,
                               replyTo: {id, senderId, senderName, preview},
                               createdAt, recalled, reactions: {uid: "❤️"} }
userChats/{uid}/{convId}:    { lastMessage, lastMessageType, lastMessageId, lastSenderId,
                               lastSenderName, updatedAt, unread }
readStatus/{convId}/{uid}:   thời điểm đọc cuối (timestamp)
typing/{convId}/{uid}:       true
notifications/{uid}/{id}:    { type: "message"|"group_added"|"reaction", convId, fromUid, text, createdAt, read }
```

- Chat 1-1 có `convId = uidNhỏ_uidLớn`, nên hai người luôn ra cùng một id. Nhóm dùng id do `push()` sinh ra (bắt đầu bằng `-`).

---

## 3. Cài đặt và chạy

Yêu cầu: Node ≥ 22, JDK 17, Android Studio / Android SDK ([hướng dẫn môi trường](https://reactnative.dev/docs/set-up-your-environment)).

```sh
cd ChatApp
npm install
npm start            # terminal 1: Metro
npm run android      # terminal 2: build và cài lên máy ảo / điện thoại
```

iOS (macOS): `cd ios && bundle install && bundle exec pod install && cd .. && npm run ios`.

> Trước khi chạy, **phải** điền cấu hình ở `src/config/appConfig.js` (mục 4 và 5).

---

## 4. Cấu hình Firebase

1. Vào <https://console.firebase.google.com> → **Add project** (có thể tắt Google Analytics).
2. **Authentication** → *Get started* → tab *Sign-in method* → bật **Email/Password**.
3. **Realtime Database** → *Create database* → chọn vùng (ví dụ `asia-southeast1` Singapore) → *Start in locked mode*.
4. **Project settings** (bánh răng) → *Your apps* → bấm biểu tượng **Web `</>`** → đặt tên → *Register app*. Sao chép object `firebaseConfig` vào `src/config/appConfig.js`:

   ```js
   export const firebaseConfig = {
     apiKey: 'AIza…',
     authDomain: 'ten-du-an.firebaseapp.com',
     databaseURL: 'https://ten-du-an-default-rtdb.asia-southeast1.firebasedatabase.app',
     projectId: 'ten-du-an',
     storageBucket: 'ten-du-an.appspot.com',
     messagingSenderId: '…',
     appId: '1:…:web:…',
   };
   ```

   > Phải có `databaseURL`. Lấy URL này ở đầu tab *Data* của Realtime Database.
   > App dùng **Firebase JS SDK** nên **không cần** `google-services.json`.

5. **Đưa luật bảo mật lên Firebase** (chọn một trong hai cách):
   - Vào Console → Realtime Database → tab **Rules**, dán toàn bộ nội dung `database.rules.json` rồi bấm **Publish**.
   - Hoặc dùng CLI: `npm i -g firebase-tools`, `firebase login`, `firebase use --add`, rồi `firebase deploy --only database`.

6. Chạy app, đăng ký ít nhất **3 tài khoản** (để tạo nhóm cần ≥ 2 người ngoài bản thân).

---

## 5. Cấu hình Cloudinary (unsigned upload)

1. Đăng ký tài khoản miễn phí tại <https://cloudinary.com>. Ở **Dashboard**, ghi lại **Cloud name**.
2. **Settings** (bánh răng) → **Upload** → *Upload presets* → **Add upload preset**:
   - **Signing mode: `Unsigned`** (bắt buộc).
   - Asset folder (tùy chọn): `chat-app`.
   - Có thể thêm *Incoming transformation* `c_limit,w_1024,h_1024` để chắc chắn ảnh không vượt quá 1024px.
   - Bấm **Save** và ghi lại **tên preset**.
3. Điền vào `src/config/appConfig.js`:

   ```js
   export const cloudinaryConfig = {
     cloudName: 'ten-cloud-cua-ban',
     uploadPreset: 'ten-preset-unsigned',
     folder: 'chat-app',
   };
   ```

> ⚠️ **Không** đưa *API Key* hay *API Secret* của Cloudinary vào mã nguồn. Unsigned preset chỉ cần `cloud_name` và `upload_preset`.

Cách thu nhỏ ảnh: `react-native-image-picker` được gọi với `maxWidth: 1024, maxHeight: 1024, quality: 0.8` (xem `IMAGE_PICKER_OPTIONS` trong `uploadService.js`). Thư viện tự thu nhỏ giữ nguyên tỉ lệ và nén JPEG trên máy trước khi tải lên. Realtime Database chỉ lưu `secure_url`, `imageWidth`, `imageHeight`.

---

## 6. Luật bảo mật (tóm tắt)

| Nhánh | Đọc | Ghi |
|---|---|---|
| `users/{uid}` | người đã đăng nhập | chỉ chính chủ |
| `status/{uid}` | người đã đăng nhập | chỉ chính chủ |
| `conversations/{id}` | chỉ thành viên (chat 1-1 thì người có uid nằm trong id cũng đọc được để kiểm tra trước khi tạo) | tạo mới: `createdBy == auth.uid` và người tạo là thành viên. `name`: thành viên nhóm. `members/{x}`: thành viên được thêm người, chỉ trưởng nhóm được xóa người khác, ai cũng tự rời được |
| `messages/{convId}` | chỉ thành viên | tạo tin: thành viên và `senderId == auth.uid`. Không ai được xóa hoặc sửa node tin. `recalled`, xóa `text/imageUrl/lat/lng`: **chỉ người gửi**. `reactions/{uid}`: **chỉ chính uid đó** |
| `userChats/{uid}` | chỉ chính chủ | thành viên của cuộc trò chuyện ghi cho thành viên khác. `unread` của người khác chỉ được tăng đúng 1 (increment) |
| `readStatus`, `typing` `/{convId}/{uid}` | thành viên | chỉ chính uid đó và phải là thành viên |
| `notifications/{uid}` | chỉ chính chủ | chủ sở hữu (đánh dấu đã đọc). Người khác chỉ được **tạo mới** với `fromUid == auth.uid` |

Trong một multi-path update, các luật dùng `newData.parent()…` để thấy dữ liệu **sau khi ghi**. Nhờ vậy tạo nhóm (ghi conversation, tin hệ thống và userChats cùng lúc) và rời nhóm (gửi tin "A đã rời nhóm" rồi tự xóa mình) đều qua được luật.

### Kiểm thử luật bằng Emulator (57 kịch bản)

```sh
cd tools/rules-test
npm install
npm test
```

Kết quả mẫu: `57 passed, 0 failed`. Các dòng `FIREBASE WARNING … permission_denied` là các thao tác **cố ý bị từ chối** (dùng cho báo cáo). Có thể chụp kết quả này, hoặc thử trong **Rules Playground** trên Console, ví dụ:
*Simulation type: set, Location: `/messages/A_B/m1/recalled`, Data: `true`, Authenticated (uid = B)* → **Denied** (B không phải người gửi).

---

## 7. Kịch bản quay video (2–3 phút, 3 máy hoặc 2 máy và đổi tài khoản)

1. Máy A tạo nhóm với B và C → B, C thấy nhóm xuất hiện ngay trên Home, tab Thông báo có badge "được thêm vào nhóm".
2. A gõ → tiêu đề ở B hiện "A đang soạn tin…". A dừng gõ 3 giây thì trạng thái tự tắt.
3. A gửi tin khi B đang ở Home → số chưa đọc của B tăng, badge Thông báo tăng. B mở chat → số chưa đọc về 0, A thấy "✓✓ Đã xem HH:mm".
4. Nhấn giữ một tin → thả ❤️ → tin có cảm xúc kèm số lượng. Người gửi nhận thông báo cảm xúc.
5. Thu hồi tin cuối → mọi máy hiện "Tin nhắn đã được thu hồi", dòng cuối ở Home cũng đổi theo.
6. Gửi ảnh (chụp hoặc chọn từ thư viện) → bong bóng loading → ảnh hiện ở mọi máy. Home hiện "📷 Hình ảnh". Nhấn vào ảnh để xem toàn màn hình.
7. Tab Thông báo → nhấn một thông báo → mở đúng chat, badge giảm. Bấm "Đánh dấu tất cả đã đọc".

## 8. Nộp bài

Không kèm `node_modules`, `android/build`, `android/app/build`, `ios/Pods`. Lệnh nén mẫu trên Windows (chạy trong thư mục cha của `ChatApp`, cần Git Bash có `zip` hoặc dùng 7-Zip):

```sh
zip -r ChatApp.zip ChatApp -x "*/node_modules/*" "*/android/build/*" "*/android/app/build/*" "*/android/.gradle/*" "*/ios/Pods/*"
```

## 9. Ghi chú / xử lý sự cố

- **Không đăng nhập được, lỗi `auth/invalid-api-key`**: chưa điền `firebaseConfig`.
- **`PERMISSION_DENIED` khi dùng app**: chưa Publish `database.rules.json`, hoặc tài khoản tạo trước khi bật luật không có node `users/{uid}`. Trường hợp này hãy đăng ký tài khoản mới.
- **Upload lỗi "Upload preset must be whitelisted for unsigned uploads"**: preset chưa đặt *Signing mode = Unsigned*.
- **Máy ảo không chụp được ảnh**: vào AVD → *Advanced settings* → Camera Back = *Emulated / VirtualScene*.
- **Thông báo cục bộ (notifee)**: Android 13+ sẽ hỏi quyền thông báo lần đầu. Thông báo hiện khi app chạy nền mà tiến trình JS vẫn còn sống. Nếu thư viện notifee gây lỗi build, có thể `npm uninstall @notifee/react-native`. App vẫn chạy vì module được `require` trong `try/catch`.
