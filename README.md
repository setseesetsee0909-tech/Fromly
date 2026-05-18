# Formly

Next.js, Supabase, Stripe дээр суурилсан AI тусламжтай survey үүсгэгч платформ.

## Төслийн тухай

Formly нь survey үүсгэх, нийтлэх, share link-ээр тараах, хариулт цуглуулах, analytics харах боломжтой хоёр хэлтэй платформ юм.

Үндсэн боломжууд:

- AI ашиглан survey draft үүсгэх
- Survey-г гараар үүсгэх
- Public share link үүсгэх
- Хариулт цуглуулах
- Analytics болон Excel export
- Plan-д суурилсан эрх, хязгаар
- Team workspace
- Admin удирдлагын хэсэг

## Ашигласан технологи

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Database, Edge Functions
- Stripe Checkout болон webhook
- OpenAI эсвэл Lovable AI gateway

## Гол боломжууд

- Landing page болон нэвтрэх / бүртгүүлэх flow
- Google OAuth болон email/password auth
- Survey-гээ удирдах dashboard
- AI Assistant ашиглан survey draft үүсгэх
- Survey-г гараар үүсгэх
- Analytics, chart, response export
- Public survey form `/s/[surveyId]`
- Billing, pricing, plan солих
- Team workspace болон гишүүн урих
- Admin page-аас хэрэглэгч, survey удирдах

## Хуудсуудын зам

- `/` нүүр хуудас
- `/login` нэвтрэх / бүртгүүлэх
- `/dashboard` survey dashboard
- `/ai` AI survey үүсгэгч
- `/surveys/new` шинэ survey гараар үүсгэх
- `/surveys/[id]/analytics` survey analytics
- `/pricing` үнийн мэдээлэл
- `/billing` төлбөр болон хэрэглээ
- `/team` багийн workspace
- `/admin` admin хэсэг
- `/s/[surveyId]` public survey бөглөх хуудас
- `/stripe/success` Stripe амжилттай төлбөрийн хуудас

## API Route-ууд

- `/api/ai-survey`
- `/api/auth/sync-role`
- `/api/billing/change-plan`
- `/api/monpay/create-payment`
- `/api/monpay/confirm-payment`
- `/api/qpay/create-invoice`
- `/api/qpay/verify`
- `/api/stripe/create-checkout`
- `/api/stripe/verify`
- `/api/stripe/webhook`
- `/api/surveys/[surveyId]/responses`

## Төслийн бүтэц

```text
app/
  (app)/                 Нэвтэрсэн хэрэглэгчийн хуудсууд
  api/                   Next.js API route-ууд
  auth/                  Auth callback хуудсууд
  login/                 Login page wrapper
  s/                     Public survey хуудсууд
src/
  components/            UI компонентууд болон provider-ууд
  integrations/          Supabase client болон generated type-ууд
  lib/                   Туслах функц, plan logic
  routes/                Route түвшний page component-ууд
  supabase/              Migration болон Edge Function-ууд
```

## Environment Variables

`.env.example`-ийг `.env` болгон хуулж, жинхэнэ утгуудыг оруулна.

Шаардлагатай тохиргоонууд:

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### App URL

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Billing

```env
BILLING_PROVIDER=auto
BILLING_STATE_SECRET=
```

### QPay

```env
QPAY_BASE_URL=https://merchant-sandbox.qpay.mn
QPAY_CLIENT_ID=
QPAY_CLIENT_SECRET=
QPAY_INVOICE_CODE_PRO=
QPAY_INVOICE_CODE_TEAM=
QPAY_PLAN_PRO_AMOUNT=
QPAY_PLAN_TEAM_AMOUNT=
```

### MonPay

```env
MONPAY_API_BASE_URL=https://api.monpay.mn/resource/partner/v1
MONPAY_TOKEN_URL=https://z-wallet.monpay.mn/v2/oauth/token
MONPAY_CLIENT_ID=
MONPAY_CLIENT_SECRET=
MONPAY_PLAN_PRO_AMOUNT=
MONPAY_PLAN_TEAM_AMOUNT=
MONPAY_PRODUCT_NAME=Formly subscription
MONPAY_PRODUCT_TYPE=Software
MONPAY_SMS_PREFIX=Formly payment
MONPAY_SMS_SUFFIX=Confirm the payment with the TAN code.
```

### Stripe

```env
STRIPE_SECRET_KEY=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
STRIPE_WEBHOOK_SECRET=
```

## QPay setup

1. Request QPay merchant API access, `client_id`, `client_secret`, and invoice codes for the paid plans.
2. Set `BILLING_PROVIDER=qpay` or leave it as `auto` to prefer QPay when it is configured.
3. Fill in `QPAY_CLIENT_ID`, `QPAY_CLIENT_SECRET`, `QPAY_INVOICE_CODE_PRO`, and `QPAY_INVOICE_CODE_TEAM`.
4. Set `QPAY_PLAN_PRO_AMOUNT` and `QPAY_PLAN_TEAM_AMOUNT` in MNT.
5. Set `BILLING_STATE_SECRET` to a long random secret so invoice verification tokens cannot be tampered with.

When QPay is active, the pricing dialog creates an invoice, renders a QR code with banking-app deeplinks, and verifies the payment before activating the user's plan.

## MonPay setup

1. Request MonPay partner credentials for the TAN-code payment flow.
2. Set `BILLING_PROVIDER=monpay` or leave it as `auto` to use MonPay when QPay is not configured.
3. Fill in `MONPAY_CLIENT_ID`, `MONPAY_CLIENT_SECRET`, `MONPAY_PLAN_PRO_AMOUNT`, and `MONPAY_PLAN_TEAM_AMOUNT`.
4. Optionally customize `MONPAY_PRODUCT_NAME`, `MONPAY_PRODUCT_TYPE`, `MONPAY_SMS_PREFIX`, and `MONPAY_SMS_SUFFIX`.
5. Keep `BILLING_STATE_SECRET` set so the temporary checkout token cannot be tampered with.

When MonPay is active, the pricing dialog asks for the customer's phone number, triggers the SMS TAN code flow, and activates the plan after the TAN code is confirmed.

## Stripe Checkout setup

Formly uses Stripe-hosted Checkout for paid plans, so customers can enter a Visa card on Stripe's payment page and return to the app after payment.

1. Create one recurring monthly Price for `pro` and one for `team` in Stripe.
2. Set `BILLING_PROVIDER=stripe` or leave it as `auto` if QPay and MonPay are not configured.
3. Put your Stripe secret key in `STRIPE_SECRET_KEY`.
4. Put the matching recurring Price IDs in `STRIPE_PRICE_PRO` and `STRIPE_PRICE_TEAM`.
5. Set `NEXT_PUBLIC_APP_URL` to the exact app origin that Stripe should redirect back to.
6. Point your Stripe webhook to `/api/stripe/webhook` and save the signing secret in `STRIPE_WEBHOOK_SECRET`.

### Local Stripe testing

1. Use a Stripe test key that starts with `sk_test_`.
2. Start a webhook tunnel with `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`.
3. Open the pricing page and continue to Stripe Checkout.
4. Use Stripe's Visa test card `4242 4242 4242 4242` with any future expiry date, any 3-digit CVC, and any postal code.

If Stripe keys or Price IDs are missing in development, the app falls back to a mock checkout flow for demos. In production, paid checkout requires valid Stripe configuration.

### Google Auth

```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=
```

### AI Provider

`AI_PROVIDER` тохируулаагүй бол app нь дараах дарааллаар provider сонгоно:

- OpenAI
- Google Gemini API
- Lovable AI gateway

```env
AI_PROVIDER=gemini
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
LOVABLE_API_KEY=
```

### Нэмэлт

```env
ADMIN_EMAILS=admin@example.com
DATABASE_URL=
```

## Local орчинд ажиллуулах

Dependency суулгах:

```bash
npm install
```

Dev server асаах:

```bash
npm run dev
```

Дараах хаягаар нээнэ:

```text
http://localhost:3000
```

## Ашиглах script-үүд

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Supabase тухай

- Client-side хэсэг public Supabase key ашиглана.
- Server-side admin үйлдлүүд `SUPABASE_SERVICE_ROLE_KEY` ашиглана.
- Migration-ууд `src/supabase/migrations` дотор байна.
- Edge Function-ууд `src/supabase/functions` дотор байна.

## Billing болон Plan

Plan-ууд `src/lib/plans.ts` дотор тодорхойлогдсон:

- `free`
- `pro`
- `team`

Одоогийн байдлаар дараах эрх, хязгаарууд plan-аас хамаарна:

- AI ашиглах эрх
- response limit
- export хийх эрх
- map analytics
- team collaboration

## AI Survey Үүсгэх

AI survey generation нь `/api/ai-survey` route-аар ажиллана.

Дэмжигдэж буй provider-ууд:

- OpenAI
- Google Gemini API
- Lovable AI gateway

AI ажиллахгүй бол дараахийг шалгана:

- API key нь жинхэнэ эсэх
- `.env` өөрчилсний дараа dev server restart хийсэн эсэх
- OpenAI ашиглаж байгаа бол billing / credit асуудал байгаа эсэх

## Аюулгүй байдлын тэмдэглэл

- `SUPABASE_SERVICE_ROLE_KEY`-г client code руу хэзээ ч гаргаж болохгүй.
- Жинхэнэ secret-үүдийг repository руу commit хийж болохгүй.
- Хэрэв secret key чат, screenshot, эсвэл git history-д орсон бол шууд rotate хийх хэрэгтэй.

## Санал болгох setup дараалал

1. Supabase project үүсгэнэ.
2. Public болон service role key-үүдээ `.env` рүү оруулна.
3. Google OAuth ашиглах бол Supabase дээр provider-оо идэвхжүүлнэ.
4. Stripe ашиглах бол key болон price id-уудаа тохируулна.
5. AI survey ашиглах бол OpenAI API key оруулна.
6. `npm run dev` ажиллуулж төслөө асаана.

## Төлөв

Энэ repository нь starter template биш, бодит ажиллаж буй бүтээгдэхүүний кодын сан юм. Зарим migration, local өөрчлөлтүүд идэвхтэй хөгжүүлэлт дунд байж болно.
