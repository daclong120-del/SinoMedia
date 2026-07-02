# Sổ Tay Nghiệp Vụ: Mobile/Frontend — Expo (React Native)
> Dự án: expo-supabase-ai-template | Đối tượng: Dev/Agent làm việc trực tiếp trên codebase
> Nguyên tắc viết: mỗi mục có **kiến thức nền**, **tình huống thực chiến**, **mẹo/tip**, **bẫy hay gặp** — không lý thuyết suông.

---

## Cách dùng sổ tay này
Khi gặp một tính năng/bug liên quan đến Mobile-Frontend, tra đúng mục bên dưới trước khi tự đoán giải pháp. Nếu tình huống chưa có trong sổ tay, xử lý xong thì **bổ sung ngược lại** vào đây (giống tinh thần `learnings/` của agent) để lần sau không phải nghĩ lại từ đầu.

---

## 1. Expo Router — File-based routing, layout groups, nested navigation

### Kiến thức nền
- Mỗi file trong `src/app/` = 1 route. `_layout.tsx` quyết định các route con được bọc bởi `Stack`, `Tabs`, hay `Drawer`.
- `(group)` — thư mục có ngoặc đơn **không** xuất hiện trong URL, dùng để tổ chức code theo domain mà không ảnh hưởng đường dẫn thực tế.
- `[id].tsx` = dynamic route, `[...slug].tsx` = catch-all route.
- Root `_layout.tsx` là nơi duy nhất nên đặt logic quyết định "vào app hay vào auth" — không rải rác check auth ở từng màn.

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| App có vùng cần login và vùng public (feed xem không cần đăng nhập) | Tách `(public)` và `(protected)`. Guard đặt trong `_layout.tsx` của `(protected)`: check session Supabase, null thì `router.replace(...)`. Không check auth ở từng screen lẻ — dễ sót. |
| Tab bar nhưng 1 tab cần nested stack (Tab "Video" → detail → profile người đăng) | Đặt `Stack` lồng trong `Tabs`: `(tabs)/video/_layout.tsx` là Stack riêng để push/pop không làm mất tab bar. |
| Deep link mở thẳng vào 1 video cụ thể (từ notification/share) | Route `[videoId].tsx` + cấu hình `scheme` trong `app.json`. Bắt buộc test riêng 2 case: app cold start vs app đã mở sẵn — navigation state chưa sẵn sàng lúc cold start, cần đợi router mount xong mới `push`. |
| Nháy màn hình lúc mở app (flash login → flash home) | Giữ `SplashScreen.preventAutoHideAsync()` ở root layout cho tới khi resolve xong session, mới quyết định render nhánh nào. |
| URL đẹp nhưng vẫn muốn tổ chức file theo module | Dùng `(group)` lồng nhau, tối đa 2-3 cấp — quá sâu thì debug path sẽ rối, review code cũng khó theo dõi. |

### Mẹo / Kinh nghiệm khôn khéo
- **Dùng `router.replace` chứ không `router.push`** cho mọi hành động "đổi trạng thái" (login xong, logout, onboarding xong) — nếu dùng `push`, user bấm back sẽ quay lại màn hình không còn hợp lệ (VD: quay lại màn login sau khi đã đăng nhập).
- Đặt 1 file `_layout.tsx` để tự **redirect** thay vì conditional render (`{isLoggedIn ? <A/> : <B/>}`) trong component cha — redirect giữ navigation stack sạch, conditional render dễ để lại "bóng ma" component cũ trong stack.
- Với route cần params phức tạp (object, không chỉ string id), đừng nhét qua URL — lưu vào React Query cache trước, route chỉ truyền `id`, màn đích tự fetch/lấy từ cache.

### Bẫy hay gặp
- Quên rằng `(group)` không phải segment thật — dev mới hay nhầm tưởng phải có `/group/` trong URL khi deep link, dẫn đến deep link luôn fail.
- Đặt logic side-effect (analytics, fetch data) trực tiếp trong `_layout.tsx` mà không cleanup — layout re-mount nhiều lần hơn dev tưởng (mỗi lần đổi tab trong `Tabs` không remount, nhưng đổi stack thì có).

---

## 2. NativeWind / Tailwind cho React Native

### Kiến thức nền
- NativeWind compile `className` thành object `StyleSheet` **tại build time** — không có cascade CSS thật như web.
- Không có `:hover` thật (mobile không hover) — chỉ có `active:`, `focus:` cho input/pressable.
- Có prefix platform riêng: `ios:`, `android:`, `web:` — dùng khi 1 thuộc tính cần khác nhau giữa nền tảng (shadow iOS dùng `shadow-*`, Android cần `elevation-*` vì khác render engine).

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| Class động theo state (badge màu theo trạng thái: draft/published/banned) | **Không nội suy chuỗi** kiểu `` `text-${color}-500` `` — JIT compiler của NativeWind không nhận diện được string ghép động. Dùng object map trả về class đầy đủ tĩnh: `{draft:"bg-gray-400", published:"bg-green-500", banned:"bg-red-500"}[status]`. |
| Dark mode theo lựa chọn user (không chỉ theo system) | NativeWind hỗ trợ `dark:` qua `useColorScheme`, nhưng nếu app cho user tự chọn theme (lưu trong Supabase user preference), cần Context override giá trị colorScheme thay vì để NativeWind tự đọc system. |
| Safe area (notch, status bar, home indicator) | Tailwind/NativeWind **không biết gì về safe area**. Vẫn phải dùng `react-native-safe-area-context` (`useSafeAreaInsets`) rồi set padding qua inline style hoặc style động, NativeWind chỉ lo phần còn lại của UI. |
| Animation phức tạp (like nảy, swipe card kiểu TikTok) | NativeWind chỉ style tĩnh. Animation thật dùng `react-native-reanimated` + `Animated.View`; NativeWind chỉ style phần không animate của component đó. |
| List dài, nhiều conditional class trong `renderItem` | Compile-time cost gần như 0, nhưng nếu tính toán object class phức tạp trong hàm lặp lại, vẫn nên `useMemo` để tránh tính lại mỗi lần re-render. |

### Mẹo / Kinh nghiệm khôn khéo
- Định nghĩa **design tokens** (màu, spacing, font-size) ngay trong `tailwind.config.js` thay vì hardcode giá trị lẻ tẻ khắp nơi — khi rebrand hoặc đổi theme chỉ sửa 1 chỗ.
- Với component dùng chung nhiều nơi (Button, Card), tạo biến thể qua `variant` prop + object map class, không viết `className` dài dòng lặp lại ở từng nơi gọi.
- Test trên **cả điện thoại thật lẫn simulator** cho phần shadow/elevation — simulator Android đôi khi render elevation sai lệch so với máy thật.

### Bẫy hay gặp
- Copy nguyên `className` từ project Tailwind web sang mà quên rằng nhiều utility (`grid`, `float`, `hover`) không tồn tại/không có tác dụng trong NativeWind.
- Quên rebuild/clear cache Metro sau khi sửa `tailwind.config.js` — class mới không áp dụng, tưởng nhầm là code sai.

---

## 3. State Management (Zustand / Redux / Context)

### Nguyên tắc chọn lựa — luôn phân loại state trước khi chọn tool
| Loại state | Nên dùng | Lý do |
|---|---|---|
| Server state (video list, comments, profile — dữ liệu từ Supabase) | **React Query / TanStack Query** | Có sẵn cache, refetch, stale-while-revalidate, retry. Tự viết lại bằng Redux là tốn công và dễ lệch dữ liệu. |
| Client state toàn cục nhẹ (theme, tab hiện tại, filter đang chọn) | **Zustand** | Không cần Provider bọc, ít boilerplate, chỉ re-render component subscribe đúng slice qua selector. |
| State cực phức tạp, cần time-travel debug, team đã quen sẵn | **Redux Toolkit** | Chỉ chọn khi có lý do rõ ràng — với app cỡ vừa, Redux thường là over-engineering. |
| State cục bộ 1-2 component gần nhau (form input, modal open/close) | **useState/useReducer local** | Đừng đẩy lên global chỉ vì tiện — global state dư thừa là nguồn re-render lan tràn khó debug. |

### Tình huống thực chiến
- **Context re-render hell**: dùng `React Context` cho state đổi liên tục (video đang phát, progress bar) khiến MỌI component con re-render dù không dùng giá trị đó → tách Context nhỏ theo domain, hoặc chuyển sang Zustand (chỉ re-render đúng component subscribe selector).
- **Persist state qua app restart** (tab cuối, volume video): dùng `zustand/middleware` (`persist`) kết hợp `react-native-mmkv` — MMKV nhanh hơn AsyncStorage khoảng 30 lần, nên ưu tiên cho app có nhiều state cần persist.
- **Đồng bộ server state với global state** (like video → cập nhật cả list lẫn màn chi tiết): dùng `queryClient.setQueryData` của React Query để update cache ở mọi nơi đang subscribe cùng key, không tự lưu duplicate data vào Zustand.

### Mẹo / Kinh nghiệm khôn khéo
- Luôn dùng **selector** khi đọc Zustand store (`useStore(state => state.x)`) thay vì destructure cả object — destructure cả object khiến component re-render mỗi khi BẤT KỲ field nào trong store đổi.
- Bật Zustand devtools middleware chỉ ở môi trường dev, tắt ở production để tránh leak performance/security.
- Với state cần chia sẻ giữa nhiều màn hình nhưng chỉ sống trong 1 luồng thao tác (VD: wizard tạo bài đăng nhiều bước), cân nhắc dùng Zustand store riêng cho luồng đó rồi **reset khi luồng kết thúc**, tránh để state cũ rò rỉ sang lần dùng sau.

### Bẫy hay gặp
- Lưu dữ liệu từ server (video, comment) trực tiếp vào Zustand thay vì React Query — dẫn đến 2 nguồn sự thật (source of truth) không đồng bộ, sửa 1 chỗ quên chỗ kia.
- Quên rằng Zustand store là singleton toàn app — nếu không reset khi logout, dữ liệu user cũ có thể "rò" sang phiên đăng nhập mới trên cùng thiết bị (rủi ro bảo mật thật sự, không chỉ là bug UI).

---

## 4. Data Fetching & Caching với Supabase (realtime, optimistic update)

> Đây là mảng **dễ ra bug production nhất** trong toàn bộ Frontend — cần cẩn trọng nhất.

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| Subscribe realtime (đếm like/comment tăng live) nhưng quên unsubscribe khi unmount | Memory leak + nhận event cho screen đã rời đi → luôn `channel.unsubscribe()` trong cleanup của `useEffect`. Nên bọc thành custom hook `useRealtimeChannel()` để không ai quên. |
| Mất mạng giữa chừng (mobile hay gặp hơn web) | Supabase realtime tự reconnect nhưng **không replay lại event đã miss** trong lúc mất kết nối → khi `onReconnect`, gọi `refetch` REST 1 lần để đồng bộ lại trạng thái thật, không chỉ tin vào realtime. |
| Like button — cần phản hồi ngay, không chờ round-trip server | **Optimistic update**: update UI ngay (tăng số like, đổi icon) → gọi Supabase → lỗi (mất mạng, RLS reject) thì rollback + toast lỗi. Pattern chuẩn: `onMutate` / `onError` / `onSettled` của React Query. |
| Feed video dài cần infinite scroll | Không load hết 1 lần. Dùng `.range(from, to)` của Supabase kết hợp `useInfiniteQuery`. Tránh `offset` lớn (Postgres chậm khi offset cao) — ưu tiên **cursor-based pagination** (dựa `created_at` + `id` làm cursor). |
| Query "chạy được", không lỗi, nhưng trả về mảng rỗng | Bẫy kinh điển của RLS — policy chặn ngầm chứ không phải lỗi code. Debug bằng cách test trực tiếp trên Supabase SQL editor với `set role` giả lập user, không đoán mò từ client. |
| Nhiều màn cùng cache 1 danh sách nhưng bị lệch dữ liệu (xoá ở màn A, màn B vẫn hiện) | `queryKey` cấu trúc rõ ràng (`['videos', filter, page]`) + `invalidateQueries` đúng pattern sau mọi mutation, thay vì mỗi màn tự fetch riêng không liên quan gì tới cache chung. |

### Mẹo / Kinh nghiệm khôn khéo
- Set `staleTime` hợp lý cho từng loại data — data ít đổi (profile user) để `staleTime` dài, data hay đổi (comment realtime) để ngắn hoặc để React Query tự invalidate qua realtime event, tránh gọi API thừa vô ích.
- Với optimistic update, luôn giữ **bản backup state cũ** trong `onMutate` (return context) để `onError` rollback chính xác, không rollback bằng cách refetch lại toàn bộ (chậm và giật UI).
- Với RLS, viết sẵn 1 file test SQL mẫu (`set local role authenticated; set local request.jwt.claims = ...`) để tái sử dụng mỗi lần debug policy — đỡ mất thời gian dựng lại từ đầu.

### Bẫy hay gặp
- Tin tưởng tuyệt đối vào optimistic update mà không xử lý case race condition (2 request optimistic liên tiếp, request đầu fail sau khi request sau đã thành công) — cần đảm bảo rollback đúng thứ tự, không ghi đè nhầm state mới hơn.
- Không phân biệt lỗi "network" và lỗi "RLS reject" khi catch — 2 loại lỗi cần thông báo khác nhau cho user (network thì retry được, RLS reject thường là logic sai/thiếu quyền, retry vô ích).

---

## 5. Platform-specific Code (iOS / Android / Web)

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| UI khác nhỏ giữa nền tảng (shadow, safe area, tab bar height) | Ưu tiên `Platform.select({ios:..., android:..., default:...})` cho logic đơn giản; tách file `.ios.tsx` / `.android.tsx` riêng khi khác biệt lớn về structure, không chỉ style. |
| Xin quyền camera/thư viện ảnh để đăng video | iOS cần khai `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` trong `app.json` → `ios.infoPlist`; Android cần khai `CAMERA`, `READ_MEDIA_VIDEO` trong `AndroidManifest`. Thiếu 1 trong 2 → bị Apple/Google reject khi submit, **không phải lỗi runtime** nên rất dễ bị bỏ sót lúc dev. |
| Web build (`react-native-web`) không hỗ trợ đủ native module (`expo-camera`, `react-native-video` full feature) | Có fallback UI cho web, hoặc ẩn hẳn tính năng đó. Check `Platform.OS === 'web'` ngay từ đầu component — không để crash lúc runtime vì module native không tồn tại trên web. |
| Keyboard che input khi nhập comment | iOS/Android xử lý `KeyboardAvoidingView` khác nhau: `behavior="padding"` hợp iOS, Android thường cần `behavior="height"` hoặc set `android:windowSoftInputMode` ở native config. Lỗi UI hay bị QA report nhất. |
| Video autoplay khi scroll (kiểu TikTok feed) | Android giới hạn số video decoder hoạt động đồng thời nghiêm ngặt hơn iOS → không pause video ngoài viewport sẽ **crash trên Android dù iOS chạy mượt**. Dùng `onViewableItemsChanged` của FlatList để chỉ play đúng 1 video đang visible. |

### Mẹo / Kinh nghiệm khôn khéo
- Luôn test permission flow trên **thiết bị thật**, không chỉ simulator/emulator — hành vi xin quyền (đặc biệt Android theo từng version OS) khác biệt đáng kể so với môi trường ảo.
- Khi build production lần đầu cho 1 tính năng dùng native module mới, build thử EAS Build (development client) sớm — nhiều lỗi chỉ xuất hiện ở build native, không xuất hiện trong Expo Go.
- Với sự khác biệt UI nhỏ lặp lại nhiều lần (spacing, font rendering), gom vào 1 file `platform-constants.ts` chung thay vì rải `Platform.select` khắp codebase.

### Bẫy hay gặp
- Dev trên máy Mac chỉ test iOS kỹ, bỏ quên Android cho tới sát ngày release — 2 nền tảng lệch hành vi nhiều hơn dev tưởng, đặc biệt về media, permission, và keyboard.
- Quên rằng Expo Go **không hỗ trợ mọi native module** — code chạy tốt trên Expo Go nhưng crash khi build thật (development/production build) vì module cần custom native code (config plugin).

---

## 6. Performance — FlatList/FlashList, image/video caching

### Tình huống thực chiến
| Tình huống | Cách xử lý |
|---|---|
| Feed video dài (TikTok/Douyin style) dùng `FlatList` bị giật, tốn RAM | Chuyển sang **FlashList** (Shopify) — cell recycling thật (tái sử dụng view thay vì mount/unmount liên tục). Phải khai đúng `estimatedItemSize`; sai lệch quá xa thực tế thì hiệu năng còn tệ hơn FlatList. |
| `renderItem` khai báo inline function | Mỗi lần parent re-render, `renderItem` bị tạo lại → toàn bộ list re-render dù data không đổi. Luôn `useCallback` cho `renderItem` + `React.memo` cho item component + `keyExtractor` ổn định (dùng `id` thật, không dùng index). |
| Ảnh/video load chậm, nhấp nháy khi scroll | Dùng `expo-image` thay `Image` mặc định — có disk cache + memory cache built-in, hỗ trợ blurhash placeholder (ảnh mờ hiện trước khi ảnh thật load xong, giảm cảm giác giật). |
| Video trong list dài gây leak RAM/crash sau vài phút scroll | Không giữ video player sống cho item ngoài viewport — unmount hẳn `<Video>` (không chỉ pause) khi item cách xa vùng nhìn thấy 2-3 item, chỉ mount lại khi gần tới. |
| List có search/filter realtime, gõ tới đâu re-render/gọi API tới đó | Debounce input (~300ms) trước khi trigger query — vừa tốn quota Supabase vừa giật UI nếu gọi mỗi keystroke. |
| Cần optimize thực tế thay vì đoán | Dùng React DevTools Profiler + Flipper (hoặc `react-native-performance`) để xác định chính xác component nào re-render thừa — không optimize cảm tính. |

### Mẹo / Kinh nghiệm khôn khéo
- Với thao tác nặng ngay sau khi màn hình mount (fetch lớn, xử lý ảnh), dùng `InteractionManager.runAfterInteractions` để defer công việc đó tới sau khi animation chuyển màn hoàn tất — tránh giật lúc transition.
- Với ảnh thumbnail nhỏ lặp lại nhiều (avatar trong list comment), preload + cache ở kích thước đã resize sẵn từ server/CDN (Cloudflare R2 có thể serve ảnh đã resize qua URL params) — đừng tải ảnh full-size rồi resize ở client, vừa tốn băng thông vừa tốn CPU.
- Đo bằng số liệu thật (frame drop, thời gian mount) trước và sau khi đổi FlatList → FlashList để chứng minh cải thiện, đừng chỉ "cảm thấy mượt hơn" — dễ báo cáo sai khi review với team.

### Bẫy hay gặp
- Đặt `estimatedItemSize` cố định cho FlashList trong khi item có chiều cao động (caption dài ngắn khác nhau) — gây giật lúc scroll nhanh. Cần đo kích thước trung bình thực tế, hoặc dùng `overrideItemLayout` khi cần chính xác cao.
- Dùng `React.memo` cho item nhưng vẫn truyền callback inline (`onPress={() => doSomething(item.id)}`) — `memo` vô tác dụng vì prop callback đổi tham chiếu mỗi lần render. Phải `useCallback` cả callback truyền xuống item.

---

## Checklist nhanh trước khi ship 1 tính năng Mobile-Frontend
- [ ] Đã test cả iOS lẫn Android trên thiết bị thật (không chỉ simulator/emulator)?
- [ ] Đã kiểm tra RLS trả đúng dữ liệu cho từng role (không chỉ test bằng service key)?
- [ ] Realtime subscription có unsubscribe đúng khi unmount?
- [ ] Optimistic update có rollback đúng khi lỗi network/RLS?
- [ ] List dài có dùng FlashList + `useCallback`/`memo` đúng cách chưa?
- [ ] Video/ảnh ngoài viewport có được pause/unmount, tránh leak RAM?
- [ ] Đã khai đủ permission (camera, media) cho cả iOS lẫn Android trong `app.json`?
- [ ] Đã build thử qua EAS development build (không chỉ Expo Go) nếu có native module mới?
- [ ] Zustand store nhạy cảm (data user) có được reset khi logout?

---

*Ghi chú: sổ tay này tập trung mảng Mobile/Frontend. Các mảng Backend/Supabase, Storage R2, Crawler & Anti-bot, Pháp lý, DevOps sẽ là các file skill riêng tiếp theo — giữ nguyên tinh thần: kiến thức nền + tình huống thực chiến + mẹo + bẫy, không lý thuyết suông.*