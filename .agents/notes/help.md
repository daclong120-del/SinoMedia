# 1. Reset DB (áp dụng tất cả migration)
cd expo-supabase-ai-template
npx supabase db reset

# 2. Chạy Dashboard
cd dashboard
npm run dev

# 3. Chạy Queue Worker (terminal khác)
cd crawler-pipeline
npm run worker:dev

# 4. Mở Dashboard → Chiến dịch & Nhiệm vụ cào → Tạo nhiệm vụ
#    Quan sát task xuất hiện live trên bảng, worker nhận task, logs stream realtime.
