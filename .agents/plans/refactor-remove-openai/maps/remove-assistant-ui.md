# Map — Gỡ bỏ giao diện AI Assistant

## Deliverables & Tasks

- [x] Gỡ màn hình `openai.tsx` ✅
  - à, nghĩa là xóa file `src/app/(tabs)/openai.tsx` hoàn toàn.
- [x] Gỡ cấu hình tab `openai` trong `_layout.tsx` ✅
  - à, nghĩa là sửa `src/app/(tabs)/_layout.tsx` và xóa block `<Tabs.Screen name="openai" ... />`.
- [x] Gỡ route type trong `navigation.ts` ✅
  - à, nghĩa là xóa `openai: undefined;` trong `TabParamList` ở `src/types/navigation.ts`.
- [x] Gỡ các link và giới thiệu trên Home Screen `index.tsx` ✅
  - à, nghĩa là xóa block `<Link href="/(tabs)/openai" ...>` và card tương ứng.
  - à, nghĩa là xóa dòng checklist "AI assistant powered by OpenAI".
