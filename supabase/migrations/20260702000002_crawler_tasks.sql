-- Create crawler_tasks table for task queue
CREATE TABLE IF NOT EXISTS public.crawler_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    command TEXT NOT NULL,
    target TEXT NOT NULL,
    max_count INTEGER DEFAULT 20,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create crawler_logs table for real-time log streaming
CREATE TABLE IF NOT EXISTS public.crawler_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id UUID REFERENCES public.crawler_tasks(id) ON DELETE CASCADE,
    level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crawler_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawler_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & service_role access (you can restrict this based on your user policy)
CREATE POLICY "Allow all access to crawler_tasks" ON public.crawler_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to crawler_logs" ON public.crawler_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.crawler_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crawler_logs;
