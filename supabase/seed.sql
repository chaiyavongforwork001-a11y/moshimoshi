-- moshimoshi · seed data (safe to re-run)
-- Rooms from src/data/mock.ts, the weekly session plan + question pool the daily jobs draw
-- from (see private.plan_sessions / private.post_daily_questions), this week's sessions and
-- today's daily questions (Asia/Bangkok). No fake people, answers or RSVPs.

-- -----------------------------------------------------------------
-- Rooms
-- -----------------------------------------------------------------
insert into public.rooms (id, name, icon, color, tagline, vibe, tags, prime_time, is_lobby, sort)
values
  ('lobby', 'ห้องนั่งเล่น', 'Sofa', 'cream',
   'แวะมานั่งคุยเล่น ทักทายเพื่อนใหม่',
   'ห้องรวมของทุกคน ไม่ต้องรู้จักใครก็นั่งได้ มีคำถามวันนี้ให้ตอบเล่นทุกวัน',
   '{}'::text[], '20:00–23:00', true, 0),
  ('game-night', 'เกมดึก', 'Gamepad2', 'lavender',
   'หาตี้ หาดูโอ้ เล่นชิลๆ ไม่ toxic',
   'ใครนอนไม่หลับ มาเล่นด้วยกัน Valorant, ROV, Genshin หรือเกมชิลก็มีเพื่อน',
   array['valorant', 'rov', 'genshin', 'minecraft', 'cozygame', 'hollowknight', 'pokemon'],
   '21:00–24:00', false, 1),
  ('anime', 'อนิเมะ & มังงะ', 'Sparkles', 'pink',
   'ซีซันนี้ดูอะไร ป้ายยากันได้เต็มที่',
   'คุยอนิเมะ มังงะ ไลท์โนเวล คอสเพลย์ สปอยล์ต้องเตือนก่อนนะ',
   array['frieren', 'onepiece', 'ghibli', 'jjk', 'manga', 'lightnovel', 'cosplay', 'vtuber'],
   '21:00–23:00', false, 2),
  ('moved-bkk', 'เพิ่งย้ายมากรุงเทพฯ', 'Building2', 'butter',
   'เมืองใหม่ เพื่อนใหม่ ร้านข้าวใหม่',
   'สำหรับคนเพิ่งย้ายมาเรียนหรือทำงาน แชร์ร้านลับ ทางกลับบ้าน และกำลังใจ',
   array['movedbkk', 'firstjob', 'streetfood', 'cafe', 'mookata'],
   '19:30–21:00', false, 3),
  ('listen', 'มุมเล่าให้ฟัง', 'HeartHandshake', 'peach',
   'เล่าเรื่องวันนี้ ขอความเห็น หรือแค่อยากมีคนฟัง',
   'ไม่ต้องเก่ง ไม่ต้องมีคำตอบ แค่อยากเล่าก็พอ มีพี่โมชิคอยดูแลบรรยากาศให้อุ่นใจ',
   array['listening', 'journaling', 'selfhelp', 'nightowl'],
   '20:00–23:00', false, 4),
  ('cowork', 'นั่งทำงานด้วยกัน', 'Coffee', 'mint',
   'เปิดจับเวลา ทำงานเงียบๆ แต่ไม่เหงา',
   'รอบ Pomodoro 25 นาที คุยกันแค่ตอนพัก เหมาะกับคนที่ชอบมีเพื่อนแต่ไม่อยากคุยเยอะ',
   array['cowork', 'toeic', 'coding', 'design'],
   '20:00–22:00', false, 5),
  ('lang', 'แลกภาษา ไทย ⇄ 日本語', 'Languages', 'sky',
   'สอนไทย แลกญี่ปุ่น ผิดได้ ขำได้',
   'ฝึกพูดกับเจ้าของภาษา ไม่มีใครตัดสิน มีรอบคุยเสียงสัปดาห์ละครั้ง',
   array['japanese', 'thai', 'english', 'korean'],
   '20:30–22:00', false, 6),
  ('music', 'ดนตรี & คอนเสิร์ต', 'Music', 'peach',
   'หาเพื่อนไปคอน แชร์เพลย์ลิสต์',
   'T-pop, K-pop, อินดี้ หรือเฟสติวัล ไปคนเดียวไม่ต้องเขินอีกต่อไป',
   array['tpop', 'kpop', 'indie', 'jpop', 'concert', 'guitar'],
   '20:00–22:00', false, 7)
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  tagline = excluded.tagline,
  vibe = excluded.vibe,
  tags = excluded.tags,
  prime_time = excluded.prime_time,
  is_lobby = excluded.is_lobby,
  sort = excluded.sort;

-- -----------------------------------------------------------------
-- Sessions ("รอบคุย") — a weekly plan (weekday 0 = Sunday, Bangkok time); the daily job
-- keeps the next 7 days filled, the call below fills this week right away
-- -----------------------------------------------------------------
insert into private.session_plan (room_id, title, weekday, at_time, duration_min, host_name)
values
  ('cowork', 'Pomodoro คืนวันธรรมดา', 1, '20:00', 90, 'นัท'),
  ('cowork', 'Pomodoro คืนวันธรรมดา', 2, '20:00', 90, 'นัท'),
  ('cowork', 'Pomodoro คืนวันธรรมดา', 3, '20:00', 90, 'นัท'),
  ('cowork', 'Pomodoro คืนวันธรรมดา', 4, '20:00', 90, 'นัท'),
  ('anime', 'ซีซันนี้ดูอะไร ทิ้งอะไร', 5, '21:00', 60, 'มิ้นท์'),
  ('listen', 'วันนี้เหนื่อยไหม เล่าให้ฟังหน่อย', 3, '21:30', 60, 'ปลายฝน'),
  ('listen', 'วันนี้เหนื่อยไหม เล่าให้ฟังหน่อย', 0, '21:30', 60, 'ปลายฝน'),
  ('game-night', 'Valo ดึกชิลๆ ไม่ toxic', 5, '22:30', 90, 'บอส'),
  ('game-night', 'Valo ดึกชิลๆ ไม่ toxic', 6, '22:30', 90, 'บอส'),
  ('moved-bkk', 'ร้านลับใกล้ที่ทำงาน', 2, '19:30', 60, 'ต้นข้าว'),
  ('lang', 'คุยเสียง ไทย ⇄ ญี่ปุ่น', 4, '20:30', 60, 'ยูกิ'),
  ('music', 'แชร์เพลย์ลิสต์ประจำสัปดาห์', 0, '20:00', 60, 'โบว์')
on conflict (room_id, weekday, at_time) do update set
  title = excluded.title,
  duration_min = excluded.duration_min,
  host_name = excluded.host_name;

select private.plan_sessions(7);

-- -----------------------------------------------------------------
-- Today's daily questions ("คำถามวันนี้") — bodies only, no answers
-- -----------------------------------------------------------------
insert into public.daily_questions (room_id, body, day)
select q.room_id, q.body, (now() at time zone 'Asia/Bangkok')::date
from (
  values
    ('lobby', 'อะไรเล็กๆ ที่ทำให้วันนี้ดีขึ้นนิดนึง?'),
    ('anime', 'ถ้าต้องขายเรื่องที่ชอบให้เพื่อนที่ไม่ดูอนิเมะใน 1 ประโยค จะพูดว่าอะไร?'),
    ('game-night', 'เกมแรกที่ทำให้ติดเกมคือเกมอะไร?'),
    ('listen', 'ช่วงนี้มีเรื่องไหนที่อยากให้มีคนบอกว่า "เก่งแล้วนะ"?'),
    ('moved-bkk', 'ร้านข้าวร้านแรกที่ทำให้รู้สึกว่า "อยู่ที่นี่ได้"?')
) as q (room_id, body)
on conflict (room_id, day) do nothing;

-- -----------------------------------------------------------------
-- Question pool — the daily job picks one per room each day (not asked in the last 30 days first)
-- -----------------------------------------------------------------
insert into private.daily_question_pool (room_id, body)
values
  ('lobby', 'อะไรเล็กๆ ที่ทำให้วันนี้ดีขึ้นนิดนึง?'),
  ('lobby', 'ถ้าพรุ่งนี้ได้หยุดหนึ่งวันแบบไม่มีใครตามงาน จะทำอะไรเป็นอย่างแรก?'),
  ('lobby', 'เมนูที่กินกี่ครั้งก็ไม่เบื่อคืออะไร?'),
  ('lobby', 'เพลงที่เปิดฟังบ่อยที่สุดช่วงนี้คือเพลงอะไร?'),
  ('lobby', 'ถ้าให้เลือกไปทะเลหรือภูเขาตอนนี้ จะเลือกอะไร เพราะอะไร?'),
  ('lobby', 'มีคำชมไหนที่ได้ยินแล้วจำได้จนถึงวันนี้บ้าง?'),
  ('lobby', 'ช่วงนี้กำลังตั้งตารออะไรอยู่?'),
  ('game-night', 'เกมแรกที่ทำให้ติดเกมคือเกมอะไร?'),
  ('game-night', 'ถ้าต้องเล่นเกมเดียวไปตลอดปี จะเลือกเกมอะไร?'),
  ('game-night', 'เพลงประกอบเกมที่ฟังแล้วขนลุกทุกครั้งคือเพลงไหน?'),
  ('game-night', 'ตำแหน่งหรือสายที่ชอบเล่นที่สุดคืออะไร?'),
  ('game-night', 'เกมที่อยากให้เพื่อนลองเล่นที่สุดตอนนี้คือเกมไหน?'),
  ('anime', 'ถ้าต้องขายเรื่องที่ชอบให้เพื่อนที่ไม่ดูอนิเมะใน 1 ประโยค จะพูดว่าอะไร?'),
  ('anime', 'ตัวละครที่ถ้ามีจริงอยากเป็นเพื่อนด้วยที่สุดคือใคร?'),
  ('anime', 'ฉากไหนในอนิเมะที่ดูกี่รอบก็ยังน้ำตาซึม?'),
  ('anime', 'มังงะเรื่องไหนที่อยากให้ทำเป็นอนิเมะที่สุด?'),
  ('anime', 'เพลงเปิดอนิเมะที่ไม่เคยกดข้ามเลยคือเพลงไหน?'),
  ('moved-bkk', 'ร้านข้าวร้านแรกที่ทำให้รู้สึกว่า "อยู่ที่นี่ได้"?'),
  ('moved-bkk', 'ตอนย้ายมาใหม่ๆ อะไรที่ทำให้งงที่สุด?'),
  ('moved-bkk', 'มุมสงบในเมืองที่ชอบไปนั่งพักใจอยู่ที่ไหน?'),
  ('moved-bkk', 'ของที่คิดถึงจากบ้านเกิดที่สุดคืออะไร?'),
  ('moved-bkk', 'เส้นทางกลับบ้านที่ชอบที่สุดเป็นแบบไหน?'),
  ('listen', 'ช่วงนี้มีเรื่องไหนที่อยากให้มีคนบอกว่า "เก่งแล้วนะ"?'),
  ('listen', 'วันนี้มีเรื่องไหนที่อยากเล่าให้ใครสักคนฟังไหม?'),
  ('listen', 'เวลาเหนื่อยๆ อะไรช่วยให้ใจฟูขึ้นได้บ้าง?'),
  ('listen', 'ถ้าเขียนจดหมายถึงตัวเองเมื่อปีที่แล้วได้ จะบอกว่าอะไร?'),
  ('listen', 'เรื่องเล็กๆ ที่ภูมิใจในตัวเองสัปดาห์นี้คืออะไร?'),
  ('cowork', 'วันนี้อยากทำอะไรให้เสร็จสักหนึ่งอย่าง?'),
  ('cowork', 'เพลงหรือเสียงแบบไหนที่ช่วยให้โฟกัสได้ดีที่สุด?'),
  ('cowork', 'ช่วงพักห้านาทีชอบทำอะไร?'),
  ('cowork', 'เคล็ดลับเริ่มงานตอนขี้เกียจของเราคืออะไร?'),
  ('lang', 'คำญี่ปุ่นคำแรกที่จำได้คือคำว่าอะไร?'),
  ('lang', 'คำไทยคำไหนที่อยากสอนเพื่อนต่างชาติที่สุด?'),
  ('lang', 'เคยพูดผิดแล้วขำจนลืมไม่ลงบ้างไหม เล่าหน่อย'),
  ('lang', 'ฝึกภาษาวันละนิดด้วยวิธีไหนอยู่บ้าง?'),
  ('music', 'เพลงที่ฟังแล้วนึกถึงช่วงมัธยมคือเพลงอะไร?'),
  ('music', 'คอนเสิร์ตที่อยากไปที่สุดในชีวิตคือของใคร?'),
  ('music', 'ถ้าต้องเลือกเพลงประจำตัวหนึ่งเพลง จะเลือกเพลงไหน?'),
  ('music', 'เพลงที่เพิ่งค้นพบแล้ววนฟังทั้งสัปดาห์คือเพลงอะไร?')
on conflict (room_id, body) do nothing;

-- rooms without a hand-picked question today get one from the pool
select private.post_daily_questions();
