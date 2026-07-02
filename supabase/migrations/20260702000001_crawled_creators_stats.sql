-- Bổ sung trường thông tin creator chi tiết vào bảng crawled_authors
-- Ánh xạ từ ChinaMediaCrawler models.py: DyCreator, XhsCreator, WeiboCreator, TiebaCreator, ZhihuCreator

ALTER TABLE public.crawled_authors
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS follows_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fans_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interaction_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS videos_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ip_location text;

-- Cấp quyền cho service_role ghi dữ liệu
GRANT INSERT, UPDATE ON public.crawled_authors TO service_role;
GRANT INSERT, UPDATE ON public.crawled_posts TO service_role;
GRANT INSERT, UPDATE ON public.crawled_comments TO service_role;
