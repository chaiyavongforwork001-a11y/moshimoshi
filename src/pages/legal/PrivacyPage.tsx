import type { ReactNode } from 'react'
import { t } from '@/lib/i18n'
import { Basis, List, Note, P, Ph, Sub, tn } from './bits'
import { LegalShell, type LegalSection } from './LegalShell'
import { ADDRESS, COMPANY, EFFECTIVE, PRIVACY_EMAIL, lastUpdated } from './placeholders'

// Built while rendering (not at module load) so every clause reads in the current language.
// <Note> points for the lawyer stay Thai: they only show in review mode.

const summary = (): ReactNode[] => [
  t(
    'เราเก็บเท่าที่ต้องใช้ให้บริการ: อีเมล โปรไฟล์ที่คุณกรอกเอง และสิ่งที่คุณโพสต์หรือส่งในแอป',
    'We collect only what we need to run the service: your email, the profile you fill in yourself, and what you post or send in the app.',
  ),
  t(
    'เราไม่ขายข้อมูลส่วนบุคคลของคุณ และไม่ใช้ข้อมูลเพื่อยิงโฆษณาเจาะจงตัวคุณ',
    "We don't sell your personal data, and we don't use it to target ads at you.",
  ),
  t(
    'เราไม่มีระบบอัตโนมัติคอยกรองข้อความ ทีมงานที่เป็นคนจะดูเนื้อหาเมื่อมีการรายงานเข้ามา หรือเมื่อกฎหมายกำหนด',
    'No automated system filters your messages. Real people on our team look at content when it is reported, or when the law requires it.',
  ),
  t(
    'ข้อมูลเก็บบนเซิร์ฟเวอร์ที่สิงคโปร์ของผู้ให้บริการที่เราว่าจ้าง',
    'Your data is stored on servers in Singapore run by a service provider we have hired.',
  ),
  t(
    'คุณขอดู แก้ไข ลบ ขอสำเนา หรือคัดค้านการใช้ข้อมูลได้ และร้องเรียน สคส. ได้เสมอ',
    'You can ask to see, correct, delete or get a copy of your data, or object to its use, and you can always complain to the Office of the Personal Data Protection Committee (PDPC).',
  ),
]

const sections = (): LegalSection[] => [
  {
    id: 'controller',
    title: t('ใครเป็นผู้ดูแลข้อมูลของคุณ', 'Who looks after your data'),
    body: (
      <>
        <P>
          {tn(
            <>
              ผู้ควบคุมข้อมูลส่วนบุคคลตามนโยบายนี้คือ {COMPANY} ที่อยู่ {ADDRESS} ติดต่อเรื่องข้อมูลส่วนบุคคลได้ที่ {PRIVACY_EMAIL}
            </>,
            <>
              The data controller under this policy is {COMPANY}, located at {ADDRESS}. For personal data matters, contact {PRIVACY_EMAIL}.
            </>,
          )}
        </P>
        <P>
          {t('เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO):', 'Data Protection Officer (DPO):')}{' '}
          <Ph>{t('ชื่อและช่องทางติดต่อ DPO หรือ “ยังไม่มี”', 'DPO name and contact details, or “none yet”')}</Ph>
        </P>
        <Note>ประเมินว่าต้องแต่งตั้ง DPO ตามมาตรา 41 หรือไม่ (ชุมชนออนไลน์ที่อาจมีผู้ใช้จำนวนมากและมีข้อความส่วนตัว)</Note>
      </>
    ),
  },
  {
    id: 'scope',
    title: t('นโยบายนี้ใช้กับอะไรบ้าง', 'What this policy covers'),
    body: (
      <>
        <P>
          {tn(
            <>
              ในเอกสารนี้ “เรา” หมายถึง {COMPANY} ผู้ให้บริการ moshimoshi และ “คุณ” หมายถึงผู้ใช้งาน นโยบายนี้ใช้กับเว็บแอปและแอปที่ติดตั้งบนหน้าจอโฮม (PWA) ของ moshimoshi
              รวมถึงอีเมลที่เราส่งถึงคุณ
            </>,
            <>
              In this document, “we” means {COMPANY}, the provider of moshimoshi, and “you” means the user. This policy applies to the moshimoshi web app and
              the app installed on your home screen (PWA), as well as the emails we send you.
            </>,
          )}
        </P>
        <P>
          {t(
            'นโยบายนี้ไม่ครอบคลุมเว็บไซต์หรือบริการของบุคคลอื่น เช่น หน้าเข้าสู่ระบบของ Google หรือลิงก์ที่ผู้ใช้คนอื่นแชร์ ซึ่งมีนโยบายความเป็นส่วนตัวของตัวเอง',
            "This policy does not cover other parties' websites or services, such as Google's sign-in page or links shared by other users, which have their own privacy policies.",
          )}
        </P>
      </>
    ),
  },
  {
    id: 'data',
    title: t('ข้อมูลที่เราเก็บ', 'Data we collect'),
    body: (
      <>
        <Sub>{t('ข้อมูลบัญชี', 'Account data')}</Sub>
        <List>
          <li>{t('อีเมลที่ใช้เข้าสู่ระบบ', 'The email address you sign in with')}</li>
          <li>
            {t(
              'ถ้าเข้าสู่ระบบด้วย Google: อีเมล และข้อมูลพื้นฐานจากบัญชี Google เช่น ชื่อและรูปโปรไฟล์ ตามที่คุณอนุญาตให้ Google ส่งให้เรา',
              'If you sign in with Google: your email and basic information from your Google account, such as your name and profile picture, as you allow Google to share with us',
            )}
          </li>
        </List>

        <Sub>{t('ข้อมูลโปรไฟล์ที่คุณกรอกเอง', 'Profile information you fill in yourself')}</Sub>
        <List>
          <li>{t('ชื่อที่ใช้แสดง และตัวโมชิของคุณ (สี หน้าตา ของตกแต่ง)', 'Your display name and your Mochi (color, face, accessories)')}</li>
          <li>{t('จังหวัด คำแนะนำตัว ภาษาที่ใช้ และช่วงเวลาที่มักออนไลน์', 'Your province, bio, the languages you use, and the times you are usually online')}</li>
          <li>
            {t(
              'เรื่องที่สนใจ เรื่องที่ชอบที่สุด สไตล์การคุย และคำถามชวนคุยพร้อมคำตอบของคุณ',
              'Your interests, the ones you love most, your chat style, and conversation-starter questions with your answers',
            )}
          </li>
          <li>{t('การตั้งค่าว่าใครส่งโมชิ (คำขอคุย) หาคุณได้บ้าง', 'Your settings for who can send you a moshi (a chat request)')}</li>
        </List>

        <Sub>{t('เดือนและปีเกิด', 'Birth month and year')}</Sub>
        <P>
          {t(
            'เราถามเดือนและปีเกิดเพื่อตรวจว่าคุณอายุ 20 ปีขึ้นไป เดือนเกิดใช้ตรวจบนเครื่องของคุณแล้วไม่ถูกส่งมาเก็บ เราเก็บเฉพาะปีเกิด เพื่อยืนยันอายุและแสดงช่วงวัยแบบคร่าวๆ ให้คนอื่นเห็น (รุ่นพี่ รุ่นน้อง รุ่นเดียวกัน)',
            'We ask for your birth month and year to check that you are 20 or older. Your birth month is checked on your device and is not sent to us or stored. We store only your birth year, to confirm your age and to show others a rough age range (older, younger, or about the same age).',
          )}
        </P>
        <Note>ตอนนี้ปีเกิดถูกเก็บในโปรไฟล์ที่ผู้ใช้คนอื่นอ่านได้ทางเทคนิค ทีมพัฒนาควรปิดให้เห็นแค่ช่วงวัยก่อนเปิดตัว ข้อความนี้จึงจะตรงกับระบบจริง</Note>

        <Sub>{t('สิ่งที่คุณทำและส่งในแอป', 'What you do and send in the app')}</Sub>
        <List>
          <li>{t('ห้องที่เข้าร่วม ข้อความในห้อง และคำตอบ “คำถามวันนี้”', "Rooms you join, your messages in rooms, and your answers to “Today's question”")}</li>
          <li>{t('โพสต์ “กำลังหา” การกดเข้าร่วมโพสต์ และการตอบรับรอบคุย', '“Looking for” posts, joining posts, and RSVPs to sessions')}</li>
          <li>{t('การกด “เหมือนกัน!” บนข้อความหรือคำตอบของคนอื่น', "Tapping “Same!” on other people's messages or answers")}</li>
          <li>
            {t(
              'คำขอคุย (โมชิ) ประโยคเปิด ข้อความแชท 1:1 สถานะการอ่าน และการกดยินยอมในบันไดความไว้ใจ',
              'Chat requests (moshis), opening lines, 1:1 chat messages, read status, and the consents you give on the trust ladder',
            )}
          </li>
        </List>

        <Sub>{t('การรายงานและการบล็อก', 'Reports and blocks')}</Sub>
        <List>
          <li>{t('รายชื่อคนที่คุณบล็อก', 'The list of people you have blocked')}</li>
          <li>
            {t(
              'รายงานที่คุณส่ง (เหตุผลและรายละเอียดที่เขียน) และรายงานที่มีคนส่งเกี่ยวกับคุณ',
              'Reports you send (the reason and any details you write) and reports others send about you',
            )}
          </li>
          <li>{t('สำเนาข้อความที่ถูกรายงาน ณ เวลาที่รายงาน', 'A copy of a reported message as it was at the time of the report')}</li>
          <li>
            {t(
              'ประวัติการพักบัญชี (ช่วงเวลาและเหตุผล) และบันทึกของทีมงานเกี่ยวกับรายงาน',
              "Account suspension history (periods and reasons) and our team's notes on reports",
            )}
          </li>
        </List>

        <Sub>{t('ข้อมูลอุปกรณ์และการใช้งาน', 'Device and usage data')}</Sub>
        <List>
          <li>
            {t(
              'เวลาที่ใช้งานล่าสุด ซึ่งแสดงให้คนอื่นเห็นเป็น “ออนไลน์อยู่” หรือ “แวะมาล่าสุด”',
              'When you were last active, which others see as “Online now” or as how long ago you last dropped by',
            )}
          </li>
          <li>
            {t(
              'บันทึกของระบบ (log) เช่น IP address ชนิดเบราว์เซอร์และอุปกรณ์ เวลาที่เข้าใช้ และข้อผิดพลาด ซึ่งผู้ให้บริการโฮสต์และฐานข้อมูลบันทึกโดยอัตโนมัติ',
              'System logs, such as IP address, browser and device type, access times and errors, which our hosting and database providers record automatically',
            )}
          </li>
        </List>

        <Sub>{t('ข้อมูลที่เก็บบนเครื่องของคุณ', 'Data stored on your device')}</Sub>
        <P>
          {t(
            'แอปเก็บข้อมูลบางอย่างไว้ในเบราว์เซอร์ของคุณ (local storage และแคชสำหรับใช้แบบออฟไลน์) เช่น รหัสยืนยันการเข้าสู่ระบบ และการตั้งค่าในแอป เพื่อให้คุณไม่ต้องเข้าสู่ระบบใหม่ทุกครั้ง ตอนนี้เราไม่ใช้คุกกี้หรือเครื่องมือติดตามเพื่อโฆษณาหรือวิเคราะห์พฤติกรรมจากบุคคลอื่น',
            'The app keeps some data in your browser (local storage and a cache for offline use), such as your sign-in token and in-app settings, so you do not have to sign in again every time. We currently do not use cookies or third-party tracking tools for advertising or behavioral analytics.',
          )}
        </P>
        <Note>ถ้าจะเพิ่มเครื่องมือวิเคราะห์หรือโฆษณาในอนาคต ต้องแก้ข้อนี้และอาจต้องมีแบนเนอร์ขอความยินยอมคุกกี้</Note>
      </>
    ),
  },
  {
    id: 'purposes',
    title: t('เราใช้ข้อมูลทำอะไร และอาศัยฐานทางกฎหมายใด', 'How we use your data, and on what legal basis'),
    body: (
      <>
        <P>
          {t(
            'เราใช้ข้อมูลเฉพาะตามวัตถุประสงค์ด้านล่าง ถ้าจะใช้เพื่อเรื่องอื่นที่ไม่เกี่ยวข้อง เราจะแจ้งคุณก่อน และขอความยินยอมเมื่อกฎหมายกำหนด',
            'We use your data only for the purposes below. If we want to use it for an unrelated purpose, we will tell you first, and ask for your consent where the law requires it.',
          )}
        </P>
        <P>
          {t(
            'อีเมลและเดือนปีเกิดจำเป็นต่อการสมัคร ถ้าไม่ให้ เราสร้างบัญชีให้ไม่ได้ ข้อมูลโปรไฟล์อื่นๆ ไม่บังคับ แต่ถ้าไม่กรอก การแนะนำคนที่สนใจเรื่องคล้ายกันอาจไม่ตรงใจนัก',
            'Your email and birth month and year are required to sign up; without them we cannot create your account. Other profile information is optional, but if you leave it out, our suggestions of people with similar interests may not suit you as well.',
          )}
        </P>
        <ul className="mt-4 space-y-2.5">
          <Basis
            purpose={t('สร้างบัญชี เข้าสู่ระบบ และดูแลบัญชีของคุณ', 'Creating your account, signing you in, and managing your account')}
            data={t('อีเมล ข้อมูลจาก Google', 'Email, data from Google')}
            basis={t('จำเป็นเพื่อปฏิบัติตามสัญญา (มาตรา 24(3))', 'Necessary to perform our contract with you (Section 24(3))')}
          />
          <Basis
            purpose={t('ตรวจว่าคุณอายุ 20 ปีขึ้นไป', 'Checking that you are 20 or older')}
            data={t('เดือนและปีเกิด', 'Birth month and year')}
            basis={t(
              'จำเป็นเพื่อปฏิบัติตามสัญญา และประโยชน์โดยชอบด้วยกฎหมายในการไม่ให้ผู้เยาว์ใช้บริการ (มาตรา 24(3), 24(5))',
              'Necessary to perform our contract, and our legitimate interest in keeping minors off the service (Sections 24(3), 24(5))',
            )}
          />
          <Basis
            purpose={t(
              'แสดงโปรไฟล์ และแนะนำคนที่สนใจเรื่องคล้ายกัน (สัญญาณถูกคอ 5 ระดับ)',
              'Showing your profile and suggesting people with similar interests (the 5-level vibe signal)',
            )}
            data={t(
              'โปรไฟล์ เรื่องที่สนใจ คำตอบคำถามชวนคุย ช่วงเวลาออนไลน์ ห้องที่เข้าร่วม โพสต์กำลังหา',
              'Profile, interests, answers to conversation-starter questions, online times, rooms joined, looking-for posts',
            )}
            basis={t('จำเป็นเพื่อปฏิบัติตามสัญญา (มาตรา 24(3))', 'Necessary to perform our contract with you (Section 24(3))')}
          />
          <Basis
            purpose={t('ให้คุณคุย โพสต์ เข้าห้อง และส่งโมชิได้', 'Letting you chat, post, join rooms and send moshis')}
            data={t('สิ่งที่คุณทำและส่งในแอป', 'What you do and send in the app')}
            basis={t('จำเป็นเพื่อปฏิบัติตามสัญญา (มาตรา 24(3))', 'Necessary to perform our contract with you (Section 24(3))')}
          />
          <Basis
            purpose={t(
              'ดูแลความปลอดภัยของชุมชน: รับและตรวจรายงาน บล็อก ตักเตือน หรือระงับบัญชี',
              'Keeping the community safe: receiving and reviewing reports, blocking, warning or suspending accounts',
            )}
            data={t(
              'รายงาน เนื้อหาและโปรไฟล์ที่เกี่ยวกับรายงาน รายชื่อที่บล็อก บันทึกของระบบ',
              'Reports, content and profiles involved in reports, block lists, system logs',
            )}
            basis={t('ประโยชน์โดยชอบด้วยกฎหมาย (มาตรา 24(5))', 'Legitimate interests (Section 24(5))')}
          />
          <Basis
            purpose={t('ดูแลระบบ ป้องกันการโจมตีหรือการใช้ในทางที่ผิด และแก้ปัญหา', 'Running the system, preventing attacks or misuse, and fixing problems')}
            data={t('บันทึกของระบบ', 'System logs')}
            basis={t('ประโยชน์โดยชอบด้วยกฎหมาย (มาตรา 24(5))', 'Legitimate interests (Section 24(5))')}
          />
          <Basis
            purpose={t(
              'แจ้งเรื่องสำคัญเกี่ยวกับบัญชีหรือบริการ เช่น การเปลี่ยนนโยบาย',
              'Telling you about important account or service matters, such as policy changes',
            )}
            data={t('อีเมล', 'Email')}
            basis={t('จำเป็นเพื่อปฏิบัติตามสัญญา และประโยชน์โดยชอบด้วยกฎหมาย', 'Necessary to perform our contract, and legitimate interests')}
          />
          <Basis
            purpose={t(
              'ปฏิบัติตามกฎหมาย เช่น การเก็บข้อมูลจราจรคอมพิวเตอร์ หรือคำสั่งของหน่วยงานที่มีอำนาจ',
              'Complying with the law, such as retaining computer traffic data, or orders from competent authorities',
            )}
            data={t('บันทึกของระบบ และข้อมูลที่หน่วยงานร้องขอตามกฎหมาย', 'System logs, and data that authorities request under the law')}
            basis={t('การปฏิบัติหน้าที่ตามกฎหมาย (มาตรา 24(6))', 'Compliance with a legal obligation (Section 24(6))')}
          />
          <Basis
            purpose={t('ส่งข่าวสารหรือโปรโมชัน (ถ้ามีในอนาคต)', 'Sending news or promotions (if we do so in future)')}
            data={t('อีเมล', 'Email')}
            basis={t(
              'ความยินยอม ซึ่งเราจะขอแยกต่างหาก และถอนได้ทุกเมื่อ (มาตรา 19)',
              'Consent, which we will ask for separately and which you can withdraw at any time (Section 19)',
            )}
          />
        </ul>
        <P>
          {t(
            'เราไม่ใช้ระบบอัตโนมัติอ่าน คัดกรอง หรือให้คะแนนข้อความของคุณ ระดับสัญญาณถูกคอคำนวณจากโปรไฟล์ เรื่องที่สนใจ คำตอบคำถามชวนคุย ช่วงเวลาออนไลน์ ห้องที่เข้าร่วม และโพสต์กำลังหาเท่านั้น ไม่ได้ใช้ข้อความในห้องหรือแชท และไม่มีการตัดสินใจอัตโนมัติที่มีผลทางกฎหมายต่อคุณ',
            'We do not use automated systems to read, screen or score your messages. Vibe signal levels are calculated only from profiles, interests, answers to conversation-starter questions, online times, rooms joined and looking-for posts. They do not use messages in rooms or chats, and no automated decision with legal effect on you is made.',
          )}
        </P>
        <Note>ตรวจว่าการคำนวณสัญญาณถูกคอจากโปรไฟล์ถือเป็นการทำโปรไฟล์ (profiling) ที่ต้องแจ้งเพิ่มหรือไม่</Note>
      </>
    ),
  },
  {
    id: 'sensitive',
    title: t('ข้อมูลอ่อนไหว', 'Sensitive data'),
    body: (
      <>
        <P>
          {t(
            'เราไม่ถามข้อมูลอ่อนไหวตามมาตรา 26 เช่น เชื้อชาติ ศาสนา ความคิดเห็นทางการเมือง พฤติกรรมทางเพศ สุขภาพ ความพิการ ประวัติอาชญากรรม หรือข้อมูลชีวภาพ และไม่ใช้ข้อมูลเหล่านี้ในการแนะนำเพื่อน',
            'We do not ask for sensitive data under Section 26, such as race, religion, political opinions, sexual behavior, health, disability, criminal records or biometric data, and we do not use such data to suggest friends.',
          )}
        </P>
        <P>
          {t(
            'ถ้าคุณเลือกเขียนข้อมูลอ่อนไหวของตัวเองลงในโปรไฟล์หรือข้อความ เราจะประมวลผลเท่าที่จำเป็นเพื่อแสดงหรือส่งข้อความนั้นตามที่คุณต้องการ โดยอาศัยความยินยอมโดยชัดแจ้งของคุณ คุณลบข้อความนั้นได้ทุกเมื่อ ซึ่งถือเป็นการถอนความยินยอม โปรดคิดก่อนเปิดเผย เพราะผู้ใช้คนอื่นที่เห็นข้อความแล้วอาจจดจำหรือบันทึกไว้ได้',
            'If you choose to write your own sensitive data in your profile or messages, we process it only as needed to display or send it as you intend, based on your explicit consent. You can delete that text at any time, which counts as withdrawing your consent. Please think before you share, because other users who see it may remember or save it.',
          )}
        </P>
        <Note>การพิมพ์ข้อมูลเองถือเป็นความยินยอมโดยชัดแจ้งพอหรือไม่ หรือควรมีช่องติ๊กยินยอมแยกในขั้นสมัคร</Note>
      </>
    ),
  },
  {
    id: 'sharing',
    title: t('ใครเห็นหรือได้รับข้อมูลของคุณ', 'Who sees or receives your data'),
    body: (
      <>
        <Sub>{t('ผู้ใช้คนอื่น', 'Other users')}</Sub>
        <List>
          <li>
            {t(
              'โปรไฟล์ของคุณ (ยกเว้นอีเมลและเดือนเกิด) ผู้ใช้ที่เข้าสู่ระบบแล้วเห็นได้ ยกเว้นคนที่คุณบล็อกหรือบล็อกคุณ',
              'Your profile (except your email and birth month) is visible to signed-in users, except people you have blocked or who have blocked you.',
            )}
          </li>
          <li>
            {t(
              'ข้อความในห้อง คำตอบคำถามวันนี้ โพสต์กำลังหา และการกด “เหมือนกัน!” ผู้ใช้ที่เข้าสู่ระบบแล้วเห็นได้',
              "Room messages, answers to Today's question, looking-for posts and “Same!” taps are visible to signed-in users.",
            )}
          </li>
          <li>
            {t(
              'แชท 1:1 เห็นได้เฉพาะคนในแชทนั้น ยกเว้นข้อความที่ถูกรายงาน ซึ่งทีมงานจะเห็นสำเนาข้อความนั้นเพื่อตรวจรายงาน',
              '1:1 chats are visible only to the people in that chat, except reported messages: our team sees a copy of a reported message in order to review the report.',
            )}
          </li>
          <li>{t('คนที่ถูกรายงานจะไม่รู้ว่าใครเป็นคนรายงาน', 'A person who is reported is not told who reported them.')}</li>
        </List>

        <Sub>{t('ผู้ให้บริการที่ประมวลผลข้อมูลแทนเรา', 'Service providers that process data on our behalf')}</Sub>
        <List>
          <li>
            {t(
              'Supabase Inc. — ฐานข้อมูล ระบบเข้าสู่ระบบ และการส่งข้อความแบบเรียลไทม์ เก็บข้อมูลบนเซิร์ฟเวอร์ในสิงคโปร์',
              'Supabase Inc. — database, sign-in system and real-time messaging; stores data on servers in Singapore',
            )}
          </li>
          <li>
            {t(
              'Vercel Inc. — โฮสต์เว็บแอปและเครือข่ายส่งเนื้อหา (CDN) ซึ่งมีเซิร์ฟเวอร์หลายประเทศ และบันทึกคำขอที่เข้ามา',
              'Vercel Inc. — web app hosting and content delivery network (CDN), with servers in many countries; logs incoming requests',
            )}
          </li>
          <li>
            <Ph>{t('ชื่อผู้ให้บริการส่งอีเมล', 'Email delivery provider name')}</Ph>{' '}
            {t('— ส่งรหัสหรือลิงก์เข้าสู่ระบบไปที่อีเมลของคุณ', '— sends sign-in codes or links to your email')}
          </li>
        </List>
        <P>
          {t(
            'ผู้ให้บริการเหล่านี้ใช้ข้อมูลได้ตามที่เราสั่งเท่านั้น และต้องดูแลความปลอดภัยตามสัญญากับเรา',
            'These providers may use the data only as we instruct, and must keep it secure under their contracts with us.',
          )}
        </P>

        <Sub>{t('บริการของบุคคลอื่นที่คุณติดต่อโดยตรง', 'Third-party services you deal with directly')}</Sub>
        <List>
          <li>
            {t(
              'Google — ถ้าคุณเลือกเข้าสู่ระบบด้วย Google ซึ่ง Google ดูแลข้อมูลตามนโยบายของ Google เอง',
              'Google — if you choose to sign in with Google; Google handles that data under its own policies',
            )}
          </li>
          <li>
            {t(
              'Google Fonts — เบราว์เซอร์ของคุณดาวน์โหลดฟอนต์จาก Google ทำให้ Google ได้รับ IP address และข้อมูลเบราว์เซอร์',
              'Google Fonts — your browser downloads fonts from Google, so Google receives your IP address and browser information',
            )}
          </li>
        </List>

        <Sub>{t('กรณีอื่น', 'Other cases')}</Sub>
        <List>
          <li>
            {t(
              'หน่วยงานรัฐหรือศาล เมื่อกฎหมายกำหนดหรือมีคำสั่งที่ชอบด้วยกฎหมาย',
              'Government authorities or courts, when the law requires it or under a lawful order',
            )}
          </li>
          <li>
            {t(
              'เมื่อจำเป็นเพื่อป้องกันอันตรายต่อชีวิต ร่างกาย หรือสุขภาพของบุคคล (มาตรา 24(2))',
              "When necessary to prevent danger to a person's life, body or health (Section 24(2))",
            )}
          </li>
          <li>
            {t(
              'ผู้รับโอนกิจการ ถ้ามีการควบรวมหรือขายกิจการ ซึ่งเราจะแจ้งคุณล่วงหน้า',
              'Whoever takes over the business in a merger or sale, which we will tell you about in advance',
            )}
          </li>
        </List>
        <P>{t('เราไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลของคุณ', 'We do not sell or rent out your personal data.')}</P>
      </>
    ),
  },
  {
    id: 'transfer',
    title: t('การส่งข้อมูลไปต่างประเทศ', 'Transfers to other countries'),
    body: (
      <>
        <P>
          {t(
            'ข้อมูลของคุณเก็บที่สิงคโปร์ และอาจผ่านเซิร์ฟเวอร์ของผู้ให้บริการในประเทศอื่น เช่น สหรัฐอเมริกา เราส่งข้อมูลไปต่างประเทศเท่าที่จำเป็นต่อการให้บริการ และจะดูแลให้มีมาตรการคุ้มครองที่เหมาะสมตามมาตรา 28 และ 29 เช่น สัญญาประมวลผลข้อมูลและข้อสัญญามาตรฐานกับผู้ให้บริการ',
            "Your data is stored in Singapore and may pass through our providers' servers in other countries, such as the United States. We transfer data abroad only as needed to provide the service, and we will make sure appropriate safeguards are in place under Sections 28 and 29, such as data processing agreements and standard contractual clauses with our providers.",
          )}
        </P>
        <Note>ยืนยันกลไกที่ใช้ได้ตามประกาศคณะกรรมการฯ เรื่องการส่งข้อมูลไปต่างประเทศ และลงนาม DPA กับ Supabase, Vercel และผู้ให้บริการอีเมลก่อนเปิดตัว</Note>
      </>
    ),
  },
  {
    id: 'retention',
    title: t('เราเก็บข้อมูลไว้นานแค่ไหน', 'How long we keep your data'),
    body: (
      <>
        <List>
          <li>
            {tn(
              <>
                บัญชี โปรไฟล์ ข้อความ และโพสต์: เก็บตลอดที่คุณมีบัญชี เมื่อคุณขอลบบัญชี เราจะลบภายใน <Ph>จำนวน</Ph> วัน ข้อความที่คุณเคยส่งในห้องและแชทจะถูกลบไปด้วย
                ยกเว้นสำเนาข้อความที่เคยถูกรายงาน ซึ่งเก็บไว้กับรายงานตามระยะเวลาเก็บรายงานด้านล่าง
              </>,
              <>
                Account, profile, messages and posts: kept for as long as you have an account. When you ask us to delete your account, we will delete it within{' '}
                <Ph>number</Ph> days. Messages you sent in rooms and chats are deleted too, except copies of messages that were reported, which are kept with the
                report for the report retention period below.
              </>,
            )}
          </li>
          <li>
            {t(
              'โพสต์กำลังหาจะหยุดแสดงเมื่อหมดเวลาที่คุณเลือก และถูกลบเมื่อคุณลบโพสต์หรือลบบัญชี',
              'Looking-for posts stop showing when the time you chose runs out, and are deleted when you delete the post or your account.',
            )}
          </li>
          <li>
            {tn(
              <>
                รายงาน: เก็บ <Ph>ระยะเวลา</Ph> นับจากปิดเรื่อง เพื่อความปลอดภัยของชุมชนและป้องกันการกระทำซ้ำ
              </>,
              <>
                Reports: kept for <Ph>period</Ph> after the case is closed, for community safety and to prevent repeat offenses.
              </>,
            )}
          </li>
          <li>
            {tn(
              <>
                บันทึกของระบบ: เก็บไม่น้อยกว่า 90 วันตาม พ.ร.บ.ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ และไม่เกิน <Ph>ระยะเวลา</Ph>
              </>,
              <>
                System logs: kept for at least 90 days under the Computer Crime Act, and for no longer than <Ph>period</Ph>.
              </>,
            )}
          </li>
          <li>
            {tn(
              <>
                ข้อมูลสำรอง (backup): ถูกลบตามรอบภายใน <Ph>จำนวน</Ph> วัน
              </>,
              <>
                Backups: deleted on a rolling cycle within <Ph>number</Ph> days.
              </>,
            )}
          </li>
        </List>
        <P>
          {t(
            'เมื่อพ้นระยะเวลาแล้ว เราจะลบหรือทำให้ข้อมูลไม่สามารถระบุตัวคุณได้ เว้นแต่กฎหมายกำหนดให้เก็บนานกว่านั้น',
            'Once these periods end, we will delete your data or anonymize it so it can no longer identify you, unless the law requires us to keep it longer.',
          )}
        </P>
        <Note>ตอนนี้เมื่อบัญชีถูกลบ รายงานที่เกี่ยวข้องจะไม่ผูกกับบัญชีนั้นอีก ควรตัดสินใจว่าต้องเก็บข้อมูลผู้ถูกรายงานไว้เพื่อป้องกันการสมัครใหม่หรือไม่</Note>
      </>
    ),
  },
  {
    id: 'rights',
    title: t('สิทธิของคุณ', 'Your rights'),
    body: (
      <>
        <P>{t('ตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล คุณมีสิทธิดังนี้', 'Under the personal data protection law, you have the right to:')}</P>
        <List>
          <li>{t('ขอเข้าถึงและขอรับสำเนาข้อมูลของคุณ (มาตรา 30)', 'Access your data and get a copy of it (Section 30)')}</li>
          <li>
            {t(
              'ขอรับหรือขอให้ส่งข้อมูลไปยังผู้ให้บริการอื่นในรูปแบบที่อ่านได้ด้วยเครื่อง (มาตรา 31)',
              'Receive your data, or have it sent to another provider, in a machine-readable format (Section 31)',
            )}
          </li>
          <li>{t('คัดค้านการประมวลผลที่อาศัยประโยชน์โดยชอบด้วยกฎหมาย (มาตรา 32)', 'Object to processing based on legitimate interests (Section 32)')}</li>
          <li>
            {t(
              'ขอลบ ทำลาย หรือทำให้ข้อมูลไม่สามารถระบุตัวคุณได้ (มาตรา 33)',
              'Have your data deleted, destroyed or anonymized so it can no longer identify you (Section 33)',
            )}
          </li>
          <li>{t('ขอระงับการใช้ข้อมูลไว้ชั่วคราว (มาตรา 34)', 'Have the use of your data temporarily restricted (Section 34)')}</li>
          <li>
            {t(
              'ขอแก้ไขข้อมูลให้ถูกต้องและเป็นปัจจุบัน (มาตรา 35, 36) ซึ่งข้อมูลโปรไฟล์ส่วนใหญ่แก้ได้เองที่หน้าโปรไฟล์',
              'Have your data corrected and kept up to date (Sections 35, 36); you can edit most profile information yourself on your profile page',
            )}
          </li>
          <li>
            {t(
              'ถอนความยินยอมที่เคยให้ไว้ได้ทุกเมื่อ โดยไม่กระทบสิ่งที่ทำไปแล้วก่อนถอน (มาตรา 19)',
              'Withdraw any consent you have given at any time, without affecting what was done before you withdrew it (Section 19)',
            )}
          </li>
          <li>
            {t(
              'ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ถ้าเห็นว่าเราไม่ปฏิบัติตามกฎหมาย (มาตรา 73)',
              'Complain to the Office of the Personal Data Protection Committee (PDPC) if you believe we are not complying with the law (Section 73)',
            )}
          </li>
        </List>
        <P>
          {tn(
            <>
              ใช้สิทธิได้โดยเขียนมาที่ {PRIVACY_EMAIL} เราอาจขอข้อมูลเพื่อยืนยันว่าเป็นเจ้าของบัญชีจริง และจะตอบภายใน 30 วันนับจากได้รับคำขอ
              ถ้าเราปฏิเสธคำขอในกรณีที่กฎหมายอนุญาต เราจะแจ้งเหตุผลให้คุณทราบ
            </>,
            <>
              To exercise these rights, write to {PRIVACY_EMAIL}. We may ask for information to confirm that you are the account owner, and we will respond within
              30 days of receiving your request. If we refuse a request where the law allows it, we will tell you why.
            </>,
          )}
        </P>
        <Note>ตอนนี้ยังไม่มีปุ่มลบบัญชีในแอป ควรเพิ่มก่อนเปิดตัว หรือระบุขั้นตอนขอลบทางอีเมลให้ชัด</Note>
      </>
    ),
  },
  {
    id: 'security',
    title: t('ความปลอดภัยของข้อมูล', 'Data security'),
    body: (
      <>
        <P>
          {t(
            'เราเข้ารหัสการรับส่งข้อมูลด้วย HTTPS จำกัดสิทธิ์ในฐานข้อมูลให้แต่ละคนเห็นเฉพาะสิ่งที่ควรเห็น และให้ทีมงานเข้าถึงข้อมูลเท่าที่จำเป็นต่อหน้าที่ เช่น การตรวจรายงาน',
            'We encrypt data in transit with HTTPS, restrict database permissions so each person sees only what they should, and give our team access to data only as their work requires, such as reviewing reports.',
          )}
        </P>
        <P>
          {t(
            'ไม่มีระบบใดปลอดภัยได้ 100% ถ้าเกิดเหตุละเมิดข้อมูลส่วนบุคคล เราจะแจ้ง สคส. ภายใน 72 ชั่วโมงนับจากทราบเหตุ ตามมาตรา 37(4) และแจ้งคุณโดยไม่ชักช้าถ้าเหตุนั้นมีความเสี่ยงสูงต่อสิทธิของคุณ',
            'No system is 100% secure. If a personal data breach occurs, we will notify the PDPC within 72 hours of becoming aware of it, under Section 37(4), and notify you without delay if the breach poses a high risk to your rights.',
          )}
        </P>
      </>
    ),
  },
  {
    id: 'minors',
    title: t('ผู้เยาว์', 'Minors'),
    body: (
      <P>
        {tn(
          <>
            moshimoshi สำหรับผู้ที่อายุ 20 ปีขึ้นไปเท่านั้น เราตรวจอายุจากเดือนและปีเกิดตอนสมัคร ถ้าพบว่าผู้ใช้อายุไม่ถึง 20 ปี เราจะระงับบัญชีและลบข้อมูล
            ถ้าคุณเป็นผู้ปกครองและเชื่อว่าบุตรหลานใช้บริการอยู่ ติดต่อเราได้ที่ {PRIVACY_EMAIL}
          </>,
          <>
            moshimoshi is only for people aged 20 and over. We check age from the birth month and year given at sign-up. If we find that a user is under 20, we will
            suspend the account and delete the data. If you are a parent or guardian and believe your child is using the service, contact us at {PRIVACY_EMAIL}.
          </>,
        )}
      </P>
    ),
  },
  {
    id: 'changes',
    title: t('การเปลี่ยนแปลงนโยบายนี้', 'Changes to this policy'),
    body: (
      <P>
        {t(
          'เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว และจะแก้วันที่ “แก้ไขล่าสุด” ด้านบน ถ้าเป็นการเปลี่ยนแปลงสำคัญ เราจะแจ้งในแอปหรือทางอีเมลก่อนมีผล ถ้าการเปลี่ยนแปลงต้องใช้ความยินยอมใหม่ เราจะขอความยินยอมจากคุณก่อน',
          'We may update this policy from time to time and will change the “Last updated” date above. For significant changes, we will let you know in the app or by email before they take effect. If a change requires new consent, we will ask for your consent first.',
        )}
      </P>
    ),
  },
  {
    id: 'contact',
    title: t('ติดต่อเรา', 'Contact us'),
    body: (
      <List>
        <li>{COMPANY}</li>
        <li>
          {t('ที่อยู่:', 'Address:')} {ADDRESS}
        </li>
        <li>
          {t('อีเมลเรื่องข้อมูลส่วนบุคคล:', 'Email for personal data matters:')} {PRIVACY_EMAIL}
        </li>
        <li>
          {t(
            'สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.): www.pdpc.or.th',
            'Office of the Personal Data Protection Committee (PDPC): www.pdpc.or.th',
          )}
        </li>
      </List>
    ),
  },
  {
    id: 'effective',
    title: t('วันที่มีผลใช้บังคับ', 'Effective date'),
    body: (
      <P>
        {tn(
          <>
            นโยบายนี้มีผลตั้งแต่ {EFFECTIVE} แก้ไขล่าสุดเมื่อ {lastUpdated()}
          </>,
          <>
            This policy takes effect on {EFFECTIVE}. Last updated {lastUpdated()}.
          </>,
        )}
      </P>
    ),
  },
]

/** '/privacy' — PDPA-oriented privacy notice (draft for legal review). */
export default function PrivacyPage() {
  return (
    <LegalShell
      title={t('นโยบายความเป็นส่วนตัว', 'Privacy Policy')}
      lead={tn(
        <>
          moshimoshi เป็นที่ให้คนอายุ 20 ปีขึ้นไปเจอเพื่อนจากเรื่องที่ชอบ เราอยากให้คุณสบายใจกับข้อมูลของตัวเอง นโยบายนี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้ทำอะไร
          เปิดเผยกับใคร เก็บนานแค่ไหน และคุณมีสิทธิอะไรบ้าง ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
        </>,
        <>
          moshimoshi is a place for people aged 20 and over to find friends through what they love. We want you to feel at ease about your own data. This policy
          explains what data we collect, what we use it for, who we share it with, how long we keep it, and what rights you have, under the Personal Data
          Protection Act B.E. 2562 (2019) (PDPA).
        </>,
      )}
      summary={summary()}
      sections={sections()}
      contact={tn(
        <>มีคำถามเรื่องข้อมูลส่วนบุคคล เขียนมาคุยกับเราได้ที่ {PRIVACY_EMAIL}</>,
        <>Questions about your personal data? Write to us at {PRIVACY_EMAIL}.</>,
      )}
    />
  )
}
