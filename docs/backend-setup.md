# ตั้งค่า backend ของ moshimoshi (Supabase)

ถ้าไม่ใส่ env ของ Supabase แอปจะอยู่ใน **demo mode** (ใช้ข้อมูลตัวอย่าง ไม่ต้องล็อกอิน) เหมือนเดิมทุกอย่าง
พอใส่ env ครบทั้ง 2 ตัว แอปจะเข้า **live mode** คือต้องล็อกอินก่อนเข้า `/app` กับ `/onboarding` และข้อมูลมาจาก Supabase แบบ realtime

| ไฟล์ | มีอะไร |
| --- | --- |
| `supabase/migrations/20261025000001_init.sql` | ตารางทั้งหมด, trigger, RPC, RLS, grant, realtime (รันซ้ำได้) |
| `supabase/seed.sql` | ห้อง 8 ห้อง, รอบคุย 4 วันนับจากวันที่รัน (เวลาไทย), คำถามวันนี้ของแต่ละห้อง ไม่มีคนหรือคำตอบปลอม |
| `src/lib/database.types.ts` | type ของ schema สำหรับ `createClient<Database>()` |

## 1. ลง schema

แนะนำให้สร้างโปรเจกต์ที่ region **Southeast Asia (Singapore)** เพราะใกล้ผู้ใช้ไทยที่สุด

**ผ่าน Supabase MCP (วิธีหลัก)**

1. `apply_migration` ตั้งชื่อ `init` แล้วใส่เนื้อหาทั้งไฟล์ `20261025000001_init.sql`
2. `execute_sql` ใส่เนื้อหา `seed.sql`
3. `get_advisors` ทั้งแบบ `security` และ `performance` ไม่ควรมีปัญหาเกี่ยวกับตาราง ถ้ามีเตือนเรื่องการตั้งค่า Auth (เช่น leaked password protection) ข้ามได้ เพราะเราไม่ได้ใช้รหัสผ่าน
4. `generate_typescript_types` แล้วเทียบกับ `src/lib/database.types.ts` ถ้าต่างกันให้ใช้ของที่ generate ออกมา

**ผ่าน CLI (ทางเลือก)** `supabase link --project-ref <ref>` แล้ว `supabase db push` จากนั้นรัน `seed.sql` ใน SQL Editor ถ้ารันเครื่องตัวเองด้วย `supabase db reset` ตัว CLI จะรัน seed ให้เอง

> รอบคุยใน seed นับวันจาก "วันที่รัน" ถ้ารันซ้ำวันหลังจะได้ชุดใหม่ของวันนั้นเพิ่ม (ไม่ซ้ำของเดิม) ส่วนคำถามวันนี้จะใส่ให้เฉพาะวันที่รัน ถ้าจะเปลี่ยนคำถามทุกวันต้องเพิ่มแถวใน `daily_questions` เอง หรือตั้ง pg_cron

## 2. Environment variables

สร้าง `.env.local` ที่ root ของโปรเจกต์ (Vite ไม่ส่งไฟล์ `*.local` ขึ้น build และไม่ควร commit)

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

หาได้ที่ **Project Settings → API Keys** ใช้ได้เฉพาะ publishable key เท่านั้น **ห้ามใส่ secret / service_role key ในฝั่ง client เด็ดขาด**
ตอน deploy ให้ใส่ตัวแปรชุดเดียวกันในหน้า env ของโฮสต์ที่ใช้

## 3. ตั้งค่า Auth ใน Dashboard

### URL

**Authentication → URL Configuration**

- Site URL: โดเมน production เช่น `https://moshimoshi.app`
- Redirect URLs: `http://localhost:5173/**` และ `https://<โดเมน-production>/**`

### Email OTP (รหัส 6 หลัก)

1. **Authentication → Sign In / Providers → Email** เปิด Email provider แล้วตั้ง **Email OTP Length = 6** อายุรหัส 10–60 นาทีก็พอ
2. **Authentication → Emails → Templates** แก้ template **Magic Link** ให้มี `{{ .Token }}`
   และแก้ **Confirm signup** ด้วย เพราะคนที่สมัครครั้งแรกจะได้ template นี้แทน (ถ้าเปิด Confirm email ไว้)

```html
<h2>รหัสเข้า moshimoshi ของคุณ</h2>
<p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
<p>ใส่รหัสนี้ในแอปภายในไม่กี่นาทีนะ ถ้าไม่ได้ขอรหัส ไม่ต้องทำอะไร ปล่อยผ่านได้เลย</p>
```

ฝั่ง client: `signInWithOtp({ email })` แล้วตามด้วย `verifyOtp({ email, token, type: 'email' })`

### Google

1. Google Cloud Console → **APIs & Services → OAuth consent screen** ตั้งเป็น External ใส่ชื่อแอป อีเมลติดต่อ และ scope `openid`, `email`, `profile`
2. **Credentials → Create credentials → OAuth client ID** เลือกแบบ **Web application**
   - Authorized JavaScript origins: `http://localhost:5173`, `https://<โดเมน-production>`
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Sign In / Providers → Google** เปิดใช้งาน แล้ววาง Client ID กับ Client Secret
4. ฝั่ง client: `signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/app' } })` ซึ่ง `redirectTo` ต้องตรงกับ Redirect URLs ข้างบน

### Rate limits

- อีเมลจาก SMTP ในตัวของ Supabase ส่งได้แค่ไม่กี่ฉบับต่อชั่วโมง ใช้ทดสอบได้อย่างเดียว ก่อนเปิดให้คนจริงใช้ต้องตั้ง **Custom SMTP** (Authentication → Emails → SMTP Settings เช่น Resend, Postmark, Amazon SES) แล้วค่อยเพิ่มเพดานส่งอีเมลใน **Authentication → Rate Limits**
- คนเดียวกันขอรหัสใหม่ได้ทุก 60 วินาที หน้า login ควรมีนับถอยหลังก่อนกด "ส่งรหัสอีกครั้ง"
- ถ้าเริ่มมีบอทสมัคร ให้เปิด CAPTCHA (Turnstile หรือ hCaptcha) ใน Authentication → Attack Protection

## 4. สิ่งที่ฐานข้อมูลทำให้เอง

- **สมัครใหม่** → สร้างแถวใน `profiles` ให้ทันที ชื่อตั้งต้นมาจากชื่อใน Google หรือส่วนหน้าของอีเมล (onboarding ควรให้ตั้งชื่อเอง) ผู้ใช้ตั้ง `is_host` ให้ตัวเองไม่ได้
- **การ์ดต้อนรับ** → ครั้งแรกที่คนที่ onboard เสร็จแล้วเข้าห้อง จะมีข้อความ `kind = 'welcome'` ขึ้นต้นด้วย "ยินดีต้อนรับ <ชื่อ> (มาครั้งแรก)" ในแชทห้อง ถ้าเข้าห้องก่อน onboard เสร็จ การ์ดจะขึ้นตอนกด onboard เสร็จ ออกแล้วเข้าใหม่จะไม่ขึ้นซ้ำ
- **กำลังหา** → ถ้าไม่ส่ง `expires_at` มา จะตั้งให้จาก `when_kind` (คืนนี้ = ถึง 06:00 พรุ่งนี้, สุดสัปดาห์ = ถึงเช้าวันจันทร์, ระบุวัน = 7 วัน, เมื่อไหร่ก็ได้ = 14 วัน) และเปิดพร้อมกันได้สูงสุด 3 โพสต์
- **ฉันด้วย** → ตรวจว่าโพสต์ยังเปิดอยู่ ไม่ใช่โพสต์ของตัวเอง ไม่ได้บล็อกกัน และยังมีที่ว่าง (`slots`)
- **ล้างโพสต์หมดอายุ** → ถ้าเปิด extension `pg_cron` (Database → Extensions) แล้วรันบล็อกท้าย migration ซ้ำ จะมี job ล้างทุก 15 นาที ถ้าไม่เปิด ฝั่ง client ต้องกรอง `expires_at > now()` เอง (ควรกรองอยู่แล้ว)

## 5. RPC และ error

| RPC | ใช้ทำอะไร |
| --- | --- |
| `send_moshi(target, opener)` → chat id | เริ่มแชท 1:1 แบบรอตอบรับ ถ้ามีแชทกับคนนี้อยู่แล้วจะใช้ห้องเดิม ถ้าอีกฝั่งส่งโมชิมาก่อน การส่งกลับถือว่าตอบรับเลย |
| `respond_moshi(p_chat, accept)` | ฝั่งที่ถูกทักตอบรับ (`active`) หรือปิด (`ended`) แล้วระบบจะใส่ข้อความ system ให้ |
| `mark_chat_read(p_chat)` | อัปเดต `last_read_at` ของเรา |

error จะส่งกลับมาเป็นคีย์สั้นๆ ใน `error.message` ให้ฝั่ง client แปลงเป็นข้อความไทยเอง:
`not_authenticated`, `cannot_moshi_self`, `opener_invalid`, `target_not_found`, `blocked`, `moshi_not_allowed` (อีกฝั่งตั้งรับโมชิเฉพาะคนในห้องเดียวกันหรือคนที่เคยคุย), `moshi_declined`, `moshi_rate_limited` (เกิน 30 คนต่อวัน), `chat_not_found`, `not_allowed`, `chat_not_pending`, `intent_limit`, `intent_full`, `intent_closed`, `own_intent`, `intent_not_found`

## 6. หมายเหตุสำหรับฝั่ง client

- `reports` เขียนได้อย่างเดียว ให้เรียก `.insert()` โดยไม่ต่อ `.select()`
- `room_members`, `session_rsvps`, `intent_joins` และตาราง `*_sames` ใช้ insert/delete ถ้าเจอ error `23505` แปลว่ากดซ้ำ ข้ามได้ (หรือใช้ `upsert(..., { ignoreDuplicates: true })`)
- `chat_members` แก้ได้แค่ `last_read_at` กับ `consent_media` ส่วนข้อความในแชทส่งได้เมื่อแชทเป็น `active` แล้วเท่านั้น
- ข้อความที่ยังไม่อ่าน = ข้อความของอีกฝั่งที่ `created_at > last_read_at` ของเรา
- สถานะออนไลน์: อัปเดต `profiles.last_seen_at` ทุก ~1 นาทีตอนเปิดแอป view `room_stats` นับคนที่เห็นภายใน 5 นาทีเป็น online
- คำถามวันนี้: เลือกแถวล่าสุดของห้อง (`day <= วันนี้`) แทนการหาแถวของวันนี้พอดี แอปจะได้ไม่ว่างถ้ายังไม่ได้ใส่คำถามใหม่
- คนที่บล็อกกันจะมองไม่เห็นโปรไฟล์กัน ข้อความในห้องที่มาจากคนที่ดูโปรไฟล์ไม่ได้ควรซ่อนไว้
- ไม่มีการกรองเนื้อหาข้อความ (founder ตัดสินใจแล้ว) มีแค่จำกัดความยาว

## 7. งานแอดมินที่ทำใน SQL Editor

```sql
-- ตั้งโฮสต์ห้อง
update public.profiles set is_host = true where id = '<user-uuid>';
insert into public.room_members (room_id, user_id, role) values ('anime', '<user-uuid>', 'host')
on conflict (room_id, user_id) do update set role = 'host';

-- เพิ่มคำถามของพรุ่งนี้
insert into public.daily_questions (room_id, body, day)
values ('lobby', 'เพลงไหนที่ฟังแล้วอารมณ์ดีขึ้นทันที?', (now() at time zone 'Asia/Bangkok')::date + 1);
```
