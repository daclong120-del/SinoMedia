-- 1. Revoke default privileges in schema public from anon and public
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- 2. Revoke existing privileges from anon and public on all current public schema objects
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 3. Ensure anon and authenticated can usage schema public (critical for REST API initialization)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 4. Enable RLS on crawler output tables
ALTER TABLE public.crawled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawled_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_ads ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent duplication
DROP POLICY IF EXISTS "Allow read for authenticated users on crawled_posts" ON public.crawled_posts;
DROP POLICY IF EXISTS "Allow read for authenticated users on crawled_authors" ON public.crawled_authors;
DROP POLICY IF EXISTS "Allow read for authenticated users on creative_advertisers" ON public.creative_advertisers;
DROP POLICY IF EXISTS "Allow read for authenticated users on creative_ads" ON public.creative_ads;

-- 6. Create SELECT policies for authenticated users on crawler output tables
CREATE POLICY "Allow read for authenticated users on crawled_posts" ON public.crawled_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users on crawled_authors" ON public.crawled_authors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users on creative_advertisers" ON public.creative_advertisers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users on creative_ads" ON public.creative_ads
  FOR SELECT TO authenticated USING (true);

-- 7. Grant explicit execute rights back to authenticated and service_role for required functions
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_crawler_tasks(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_crawler_task() TO service_role;
