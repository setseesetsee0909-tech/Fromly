
# Formly — Smart Survey Platform

Брэнд гайдын дагуу бүрэн ажиллагаатай судалгааны платформ бүтээнэ. Plus Jakarta Sans, Primary Blue #2563EB, цэвэрхэн SaaS дизайн.

## Хуудаснууд (7)

1. **Login / Нэвтрэх** (`/login`) — Logo, email, password, remember me, register link
2. **Dashboard / Хяналтын самбар** (`/dashboard`) — Sidebar + topbar, статистик карт (Total Surveys, Responses, Completion Rate), сүүлийн судалгаанууд жагсаалт, quick actions
3. **Create Survey / Үүсгэх** (`/surveys/new`) — Form builder: гарчиг, тайлбар, асуулт нэмэх (multiple choice, text, rating), сонголт нэмэх, drag-to-reorder
4. **Take Survey / Бөглөх** (`/s/$surveyId`) — Public хуудас, нэг асуулт нэг дор эсвэл бүгд хамт, прогресс бар, submit
5. **Analytics / Аналитик** (`/surveys/$id/analytics`) — Bar/Pie/Line chart (recharts), summary cards, AI insights хэсэг
6. **Admin Panel** (`/admin`) — Хэрэглэгч удирдах хүснэгт, судалгаа удирдах, role badge, actions
7. **AI Assistant** (`/ai`) — Prompt оруулах → AI судалгааны гарчиг, асуулт, сонголт автоматаар үүсгэнэ, Preview/Use товч

## Дизайн систем

- **Өнгө**: Primary `#2563EB`, Secondary `#6275AF`, Tertiary/Accent `#BC4800`, Background `#F3F4F6`, Text `#111827` / `#374151` / `#6B7280`
- **Typography**: Plus Jakarta Sans (Google Fonts) — Regular/Medium/SemiBold/Bold
- **UI**: 12px rounded corners, soft shadows, 8px grid, line icons (lucide-react, 2px stroke)
- **Buttons**: Primary, Secondary, Outlined, Inverted (dark), Tertiary (orange accent)
- **States**: Loading skeletons, empty states, success/error toast (sonner), input focus/error
- **Logo**: SVG-ээр Formly лого (цэнхэр шугам icon + dark gray wordmark)
- **Responsive**: Desktop 1440px, Tablet 768px, Mobile 375px
- **Хэл**: Монгол үндсэн, тус бүр англи дэд тайлбартай (UI label "Хяналтын самбар / Dashboard" хэв маягаар)

## Backend

- **Auth**: Email/password нэвтрэлт, session
- **DB хүснэгтүүд**:
  - `profiles` (хэрэглэгч)
  - `user_roles` (admin/user enum, тусдаа хүснэгтэд security definer `has_role` функцтэй)
  - `surveys` (id, title, description, owner_id, is_published, created_at)
  - `questions` (id, survey_id, type, label, options jsonb, order)
  - `responses` (id, survey_id, respondent_id nullable, submitted_at)
  - `answers` (id, response_id, question_id, value jsonb)
- **RLS**: Эзэмшигч өөрийн судалгаагаа удирдана; published судалгаа public-аар бөглөгдөнө; admin бүгдийг хардаг
- **AI Assistant**: Lovable AI Gateway (Gemini) — prompt-ээс judалгааны бүтэц JSON-оор үүсгэнэ, server function-аар дуудна

## Routing бүтэц

- `__root.tsx` — Plus Jakarta Sans ачаалах, QueryClient + Auth provider
- Public routes: `/`, `/login`, `/s/$surveyId`
- Protected layout `/_app` — Sidebar (Dashboard, Surveys, Analytics, AI, Admin), topbar — дотор `dashboard`, `surveys/new`, `surveys/$id/analytics`, `ai`, `admin`
- `/` (landing) — Formly танилцуулга, "Get Started" → login руу
- Бүх route өөрийн `head()` meta-тай, `errorComponent` + `notFoundComponent`-той

Энэ төлөвлөгөөг батлавал бүтээж эхэлнэ.