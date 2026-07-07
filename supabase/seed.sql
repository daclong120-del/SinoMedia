-- Seed file for development
-- This file contains sample data for crawler schema

-- 1. Seed crawled_authors
INSERT INTO public.crawled_authors (id, platform_uid, nickname, platform, gender, description, fans_count, follows_count, ip_location, avatar_url, created_at, updated_at)
VALUES 
('author_douyin_1', 'uid_dy_1', 'KOL Douyin Foodie', 'douyin', 'female', 'Chuyên gia review đồ ăn Bắc Kinh siêu chất lượng', 1500000, 120, 'Bắc Kinh', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', now() - interval '10 days', now() - interval '1 day'),
('author_bilibili_1', 'uid_bili_1', 'Anime Reviewer', 'bilibili', 'male', 'Review Anime & Manga hot nhất hệ mặt trời', 850000, 320, 'Thượng Hải', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', now() - interval '15 days', now() - interval '2 days'),
('author_xhs_1', 'uid_xhs_1', 'Fashion Blogger', 'xhs', 'female', 'Phong cách sống & xu hướng thời trang trẻ trung', 620000, 50, 'Quảng Châu', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', now() - interval '8 days', now() - interval '12 hours');

-- 2. Seed crawled_posts
INSERT INTO public.crawled_posts (id, platform, author_id, platform_id, caption, cover_url, media_urls, stats, raw, published_at, crawled_at)
VALUES 
('post_dy_1', 'douyin', 'author_douyin_1', 'pid_dy_1', 'Review quán ăn hot nhất khu phố cổ Bắc Kinh siêu ngon 🍲', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400', ARRAY['https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800'], '{"play_count": 520000, "view_count": 520000, "like_count": 48000, "comment_count": 3200, "share_count": 1500}'::jsonb, '{}'::jsonb, now() - interval '1 day', now()),
('post_dy_2', 'douyin', 'author_douyin_1', 'pid_dy_2', 'Cách làm bánh bao xá xíu mềm thơm chuẩn vị tại nhà cực kỳ dễ làm 🥟', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400', ARRAY['https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=800'], '{"play_count": 310000, "view_count": 310000, "like_count": 22000, "comment_count": 1100, "share_count": 800}'::jsonb, '{}'::jsonb, now() - interval '2 days', now()),
('post_bili_1', 'bilibili', 'author_bilibili_1', 'pid_bili_1', 'Top 10 bộ Anime không thể bỏ lỡ trong mùa hè 2026 này 🎬', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400', ARRAY['https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800'], '{"play_count": 780000, "view_count": 780000, "like_count": 92000, "comment_count": 5400, "share_count": 6200}'::jsonb, '{}'::jsonb, now() - interval '3 days', now()),
('post_xhs_1', 'xhs', 'author_xhs_1', 'pid_xhs_1', 'OOTD: Phối đồ mùa hè cực mát mẻ và trendy cho các bạn nữ 👗', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', ARRAY['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'], '{"play_count": 240000, "view_count": 240000, "like_count": 18000, "comment_count": 920, "share_count": 450}'::jsonb, '{}'::jsonb, now() - interval '4 days', now());

-- 3. Seed crawler_tasks
INSERT INTO public.crawler_tasks (id, platform, command, target, max_count, status, priority, scheduled_at, created_at, updated_at)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d401', 'douyin', 'search', 'quán ăn Bắc Kinh', 50, 'completed', 'normal', NULL, now() - interval '1 hour', now() - interval '45 minutes'),
('f47ac10b-58cc-4372-a567-0e02b2c3d402', 'bilibili', 'creator', 'uid_bili_1', 100, 'running', 'high', NULL, now() - interval '10 minutes', now()),
('f47ac10b-58cc-4372-a567-0e02b2c3d403', 'xhs', 'comments', 'pid_xhs_1', 50, 'pending', 'normal', NULL, now(), now());

-- 4. Seed crawler_accounts
INSERT INTO public.crawler_accounts (id, platform, username, cookie_data, status, failure_count, last_used_at)
VALUES 
('e47ac10b-58cc-4372-a567-0e02b2c3d501', 'douyin', 'douyin_acc_1', 'dummy_cookie_content', 'active', 0, now() - interval '15 minutes'),
('e47ac10b-58cc-4372-a567-0e02b2c3d502', 'bilibili', 'bili_acc_1', 'dummy_cookie_content', 'active', 0, now() - interval '20 minutes'),
('e47ac10b-58cc-4372-a567-0e02b2c3d503', 'xhs', 'xhs_acc_1', 'dummy_cookie_content', 'expired', 2, now() - interval '1 hour');