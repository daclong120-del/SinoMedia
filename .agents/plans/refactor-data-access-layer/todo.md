# TODO — Phase 1: Foundation

## Repositories
- [x] `lib/repositories/post.repo.ts`
- [x] `lib/repositories/author.repo.ts`
- [x] `lib/repositories/task.repo.ts`
- [x] `lib/repositories/account.repo.ts`
- [x] `lib/repositories/proxy.repo.ts`
- [x] `lib/repositories/audit.repo.ts`
- [x] `lib/repositories/comment.repo.ts`
- [x] `lib/repositories/log.repo.ts`

## Services
- [x] `lib/services/dashboard.service.ts`
- [x] `lib/services/data.service.ts`
- [x] `lib/services/creative.service.ts`
- [x] `lib/services/crawler.service.ts`
- [x] `lib/services/system.service.ts`

## Realtime
- [x] `lib/realtime/subscriptions.ts`

## Verify
- [x] `npm run build` pass ✅ (28 routes, 0 type errors)

## Bonus fixes
- [x] Fix implicit `any` in `advertisers/[id]/page.tsx` (views_history forEach)
- [x] Fix `selectedPost` possibly null in `data/posts/page.tsx`
- [x] Fix implicit `any` in `lib/supabase/middleware.ts` (cookiesToSet)
- [x] Fix implicit `any` in `lib/supabase/server.ts` (cookiesToSet)
