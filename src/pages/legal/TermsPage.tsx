import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { t } from '@/lib/i18n'
import { List, Note, P, Ph, Sub, tn } from './bits'
import { LegalShell, type LegalSection } from './LegalShell'
import { ADDRESS, COMPANY, EFFECTIVE, EMAIL, lastUpdated } from './placeholders'

/** A component, so its label is read while rendering rather than when this module loads. */
function PrivacyLink() {
  return (
    <Link to="/privacy" className="font-semibold underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
      {t('นโยบายความเป็นส่วนตัว', 'Privacy Policy')}
    </Link>
  )
}

const privacyLink = <PrivacyLink />

// Built while rendering (not at module load) so every clause reads in the current language.
// <Note> points for the lawyer stay Thai: they only show in review mode.

const summary = (): ReactNode[] => [
  t(
    'ต้องอายุ 20 ปีขึ้นไป บอกเดือนปีเกิดตามจริง และไม่ปลอมเป็นคนอื่น (ใช้ชื่อเล่นได้)',
    'You must be 20 or older, give your real birth month and year, and not pretend to be someone else (nicknames are fine).',
  ),
  t(
    'ใจดีต่อกัน ห้ามคุกคาม หลอกลวง ขายของ หรือส่งเนื้อหาทางเพศให้คนอื่น',
    'Be kind to each other. No harassment, scams, selling, or sending sexual content to others.',
  ),
  t(
    'เราไม่มีระบบกรองข้อความอัตโนมัติ เรื่องที่ถูกรายงานจะมีทีมงานที่เป็นคนตรวจดู และอาจระงับบัญชีที่ทำผิดกติกา',
    'We have no automated message filtering. Real people on our team review anything that is reported, and may suspend accounts that break the rules.',
  ),
  t('เนื้อหายังเป็นของคุณ แต่คุณอนุญาตให้เราแสดงเนื้อหานั้นในแอป', 'Your content stays yours, but you allow us to display it in the app.'),
  t(
    'ไม่สบายใจตรงไหน บล็อกหรือรายงานได้จากหน้าโปรไฟล์ของคนนั้น ถ้ามีอันตรายเร่งด่วน โทร 191 หรือ 1669 ก่อนเสมอ',
    'If anything makes you uncomfortable, you can block or report the person from their profile. In an urgent emergency, always call 191 (police) or 1669 (medical) first.',
  ),
]

const sections = (): LegalSection[] => [
  {
    id: 'accept',
    title: t('การยอมรับข้อตกลง', 'Accepting these terms'),
    body: (
      <>
        <P>
          {tn(
            <>
              ข้อตกลงนี้เป็นข้อตกลงระหว่างคุณกับ {COMPANY} (“เรา”) ผู้ให้บริการ moshimoshi เมื่อคุณสร้างบัญชีหรือใช้บริการ ถือว่าคุณได้อ่านและยอมรับข้อตกลงนี้
              ถ้าไม่ยอมรับ โปรดอย่าใช้บริการ
            </>,
            <>
              These terms are an agreement between you and {COMPANY} (“we”), the provider of moshimoshi. By creating an account or using the service, you are
              deemed to have read and accepted these terms. If you do not accept them, please do not use the service.
            </>,
          )}
        </P>
        <P>
          {tn(
            <>การเก็บและใช้ข้อมูลส่วนบุคคลของคุณเป็นไปตาม {privacyLink} ซึ่งคุณควรอ่านคู่กัน</>,
            <>How we collect and use your personal data is set out in our {privacyLink}, which you should read alongside these terms.</>,
          )}
        </P>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: t('ใครใช้ moshimoshi ได้', 'Who can use moshimoshi'),
    body: (
      <>
        <List>
          <li>{t('คุณต้องอายุ 20 ปีบริบูรณ์ขึ้นไป', 'You must have reached the age of 20.')}</li>
          <li>
            {t(
              'คุณต้องให้เดือนและปีเกิดที่เป็นความจริง ถ้าให้ข้อมูลอายุเป็นเท็จ เราอาจปิดบัญชีทันที',
              'You must give your true birth month and year. If you give false age information, we may close your account immediately.',
            )}
          </li>
          <li>
            {t(
              'คุณต้องไม่เคยถูกเราระงับบัญชีถาวร และไม่เป็นผู้ที่กฎหมายห้ามใช้บริการ',
              'You must not have been permanently banned by us before, and must not be barred by law from using the service.',
            )}
          </li>
        </List>
        <Note>ยืนยันเกณฑ์ 20 ปี (บรรลุนิติภาวะ) เทียบกับกรณีสมรสก่อนอายุ 20 และความจำเป็นต้องตรวจอายุเพิ่มเติม</Note>
      </>
    ),
  },
  {
    id: 'account',
    title: t('บัญชีของคุณ', 'Your account'),
    body: (
      <List>
        <li>
          {t(
            'หนึ่งคนใช้หนึ่งบัญชี และห้ามสร้างบัญชีแทนคนอื่นหรือปลอมเป็นคนอื่น',
            "One person, one account. Do not create an account on someone else's behalf or pretend to be someone else.",
          )}
        </li>
        <li>
          {t(
            'ดูแลอีเมลและอุปกรณ์ที่ใช้เข้าสู่ระบบให้ปลอดภัย การใช้งานผ่านบัญชีของคุณถือเป็นความรับผิดชอบของคุณ',
            'Keep the email and devices you sign in with secure. You are responsible for activity on your account.',
          )}
        </li>
        <li>
          {tn(
            <>ถ้าสงสัยว่ามีคนอื่นเข้าบัญชีของคุณ แจ้งเราได้ที่ {EMAIL} ทันที</>,
            <>If you suspect someone else has accessed your account, tell us right away at {EMAIL}.</>,
          )}
        </li>
        <li>
          {tn(
            <>คุณเลิกใช้บริการได้ทุกเมื่อ และขอลบบัญชีได้ตามที่ระบุใน{privacyLink}</>,
            <>You can stop using the service at any time, and ask to delete your account as described in our {privacyLink}.</>,
          )}
        </li>
      </List>
    ),
  },
  {
    id: 'service',
    title: t('บริการของเรา', 'Our service'),
    body: (
      <>
        <P>
          {t(
            'moshimoshi ช่วยให้คุณเจอคนที่ชอบเรื่องเดียวกันผ่านห้องคุยตามความสนใจ โพสต์ “กำลังหา” และการส่งโมชิเพื่อขอคุยแบบ 1:1 ซึ่งอีกฝ่ายต้องกดรับก่อนจึงจะคุยกันได้',
            'moshimoshi helps you meet people who love the same things through interest-based chat rooms, “looking for” posts, and sending a moshi to ask for a 1:1 chat, which the other person must accept before you can talk.',
          )}
        </P>
        <P>
          {t(
            'สัญญาณถูกคอ 5 ระดับบอกแค่ว่าเรื่องที่สนใจคล้ายกันแค่ไหน ไม่ใช่คะแนนตัดสินใคร และไม่ได้รับประกันว่าจะเข้ากันได้หรือปลอดภัย เราไม่ได้ตรวจสอบตัวตนหรือประวัติของผู้ใช้',
            "The 5-level vibe signal only shows how similar your interests are. It is not a score that judges anyone, and it does not guarantee that you will get along or that anyone is safe. We do not verify users' identities or backgrounds.",
          )}
        </P>
        <P>
          {t(
            'ตอนนี้บริการไม่มีค่าใช้จ่าย เราอาจเพิ่ม เปลี่ยน หรือหยุดบางฟีเจอร์ได้ ถ้าเป็นการเปลี่ยนแปลงที่กระทบคุณมาก เราจะแจ้งล่วงหน้าตามสมควร ถ้าในอนาคตมีบริการที่ต้องเสียเงิน เราจะแจ้งเงื่อนไขแยกก่อนคุณตัดสินใจ',
            'The service is currently free. We may add, change or discontinue some features. If a change significantly affects you, we will give you reasonable advance notice. If we offer paid services in future, we will set out their terms separately before you decide.',
          )}
        </P>
      </>
    ),
  },
  {
    id: 'rules',
    title: t('กติกาชุมชน', 'Community rules'),
    body: (
      <>
        <P>
          {t(
            'moshimoshi อยู่ได้เพราะทุกคนใจดีต่อกัน เมื่อใช้บริการ คุณตกลงว่าจะ',
            'moshimoshi works because everyone is kind to each other. By using the service, you agree to:',
          )}
        </P>
        <List>
          <li>
            {t(
              'ให้เกียรติกัน คุยอย่างสุภาพ และเคารพเมื่ออีกฝ่ายไม่สะดวกคุยต่อ',
              'Treat others with respect, talk politely, and respect it when someone does not want to keep talking.',
            )}
          </li>
          <li>
            {t(
              'ไม่คุกคาม ข่มขู่ กลั่นแกล้ง ตามตื๊อหลังถูกปฏิเสธหรือถูกบล็อก หรือใช้ถ้อยคำเกลียดชังต่อใครเพราะเพศ เชื้อชาติ ศาสนา หรือตัวตนของเขา',
              'Not harass, threaten or bully anyone; not keep contacting someone after they have turned you down or blocked you; and not use hate speech against anyone because of their gender, race, religion or identity.',
            )}
          </li>
          <li>
            {t(
              'ไม่หลอกลวง ต้มตุ๋น ขอยืมหรือขอโอนเงิน ชวนลงทุน หรือชวนทำธุรกิจ',
              'Not deceive or scam anyone, ask to borrow money or for money transfers, or pitch investments or business opportunities.',
            )}
          </li>
          <li>{t('ไม่ขายของ โฆษณา หรือใช้บริการเพื่อหาลูกค้า', 'Not sell things, advertise, or use the service to find customers.')}</li>
          <li>
            {t(
              'ไม่ส่งรูป ข้อความ หรือลิงก์ทางเพศให้คนอื่น และไม่ชวนคุยเรื่องทางเพศเมื่ออีกฝ่ายไม่ได้ยินยอม',
              "Not send sexual images, messages or links to others, or start sexual conversations without the other person's consent.",
            )}
          </li>
          <li>
            {t(
              'ไม่โพสต์หรือส่งเนื้อหาทางเพศที่เกี่ยวกับเด็กโดยเด็ดขาด ซึ่งเราจะระงับบัญชีทันทีและแจ้งหน่วยงานที่เกี่ยวข้อง',
              'Never post or send sexual content involving children. If this happens, we will suspend the account immediately and report it to the relevant authorities.',
            )}
          </li>
          <li>
            {t(
              'ไม่เปิดเผยข้อมูลส่วนตัวของคนอื่นโดยไม่ได้รับอนุญาต และไม่นำแชทของคนอื่นไปเผยแพร่เพื่อประจาน',
              "Not reveal other people's personal information without permission, or publish other people's chats to shame them.",
            )}
          </li>
          <li>{t('ไม่ปลอมตัวเป็นคนอื่น หรือแอบอ้างว่าเป็นทีมงาน', 'Not impersonate anyone, or falsely claim to be part of our team.')}</li>
          <li>
            {t(
              'ไม่โพสต์เนื้อหาผิดกฎหมาย เช่น ยาเสพติด อาวุธ การพนัน หรือสิ่งที่ละเมิดลิขสิทธิ์ของคนอื่น',
              "Not post illegal content, such as drugs, weapons, gambling, or anything that infringes someone else's copyright.",
            )}
          </li>
          <li>
            {t(
              'ไม่ใช้บอท ส่งสแปม ดึงข้อมูลผู้ใช้ออกไป หรือพยายามเจาะหรือรบกวนระบบ',
              'Not use bots, send spam, scrape user data, or try to break into or disrupt the system.',
            )}
          </li>
        </List>
        <P>
          {t(
            'ถ้าใครทำให้คุณไม่สบายใจ บล็อกได้ทันทีจากเมนูบนโปรไฟล์ และรายงานให้ทีมงานดูได้ ถ้ามีอันตรายต่อชีวิตหรือร่างกาย โทรแจ้งตำรวจ 191 หรือเหตุฉุกเฉินทางการแพทย์ 1669 ก่อนเสมอ',
            'If someone makes you uncomfortable, you can block them right away from the menu on their profile, and report them for our team to review. If there is danger to life or physical safety, always call the police on 191 or medical emergency services on 1669 first.',
          )}
        </P>
      </>
    ),
  },
  {
    id: 'meeting',
    title: t('การคุยต่อหรือนัดเจอนอกแอป', 'Talking or meeting outside the app'),
    body: (
      <>
        <P>
          {t(
            'การแลกช่องทางติดต่อหรือนัดเจอกันเป็นการตัดสินใจของคุณเอง เราไม่ได้อยู่ในการพบกันนั้นและไม่สามารถรับรองพฤติกรรมของผู้ใช้คนใดได้ ค่อยๆ ทำความรู้จักกันตามบันไดความไว้ใจ และไม่จำเป็นต้องรีบ',
            "Swapping contact details or meeting up is your own decision. We are not present at those meetings and cannot vouch for any user's behavior. Get to know each other step by step along the trust ladder; there is no need to rush.",
          )}
        </P>
        <List>
          <li>
            {t(
              'นัดเจอครั้งแรกในที่สาธารณะ และบอกเพื่อนหรือคนในบ้านว่าไปไหน กับใคร',
              'Meet in a public place the first time, and tell a friend or someone at home where you are going and who with.',
            )}
          </li>
          <li>
            {t(
              'ไม่โอนเงินหรือให้ข้อมูลการเงินกับคนที่รู้จักผ่านแอป',
              'Do not send money or give financial information to people you got to know through the app.',
            )}
          </li>
          <li>
            {t(
              'ถ้ารู้สึกไม่ปลอดภัย ออกจากสถานการณ์นั้นได้เลย แล้วรายงานให้เรารู้',
              'If you feel unsafe, leave the situation right away, then report it to us.',
            )}
          </li>
        </List>
      </>
    ),
  },
  {
    id: 'moderation',
    title: t('การดูแลชุมชนและการระงับบัญชี', 'Moderation and account suspension'),
    body: (
      <>
        <Sub>{t('ไม่มีการกรองข้อความอัตโนมัติ', 'No automated message filtering')}</Sub>
        <P>
          {t(
            'เราไม่ใช้ระบบอัตโนมัติกรอง ซ่อน หรือแก้ข้อความของผู้ใช้ ข้อความจะส่งถึงอีกฝ่ายตามที่พิมพ์ เราจึงตรวจทุกข้อความล่วงหน้าไม่ได้ ผู้ที่โพสต์หรือส่งข้อความต้องรับผิดชอบต่อเนื้อหานั้นเอง',
            "We do not use automated systems to filter, hide or edit users' messages. Messages reach the other person exactly as typed, so we cannot check every message in advance. Whoever posts or sends a message is responsible for its content.",
          )}
        </P>

        <Sub>{t('ทีมงานที่เป็นคนตรวจรายงาน', 'Real people review reports')}</Sub>
        <P>
          {t(
            'เมื่อมีการรายงาน ทีมงานจะดูโปรไฟล์และเนื้อหาที่เกี่ยวข้องกับรายงานนั้น แล้วตัดสินตามกติกาชุมชนและกฎหมาย คนที่ถูกรายงานจะไม่รู้ว่าใครเป็นคนรายงาน การรายงานเท็จเพื่อกลั่นแกล้งคนอื่นถือเป็นการทำผิดกติกาเช่นกัน',
            'When something is reported, our team looks at the profiles and content involved in that report, then decides based on the community rules and the law. The reported person is not told who reported them. Making false reports to harass others is also a breach of the rules.',
          )}
        </P>

        <Sub>{t('สิ่งที่เราอาจทำ', 'What we may do')}</Sub>
        <P>{t('ขึ้นอยู่กับความร้ายแรงและการทำซ้ำ เราอาจ', 'Depending on how serious it is and whether it is repeated, we may:')}</P>
        <List>
          <li>{t('ตักเตือน', 'Give a warning')}</li>
          <li>{t('ลบเนื้อหาที่ผิดกติกา', 'Remove content that breaks the rules')}</li>
          <li>{t('จำกัดการใช้งานบางส่วน', 'Restrict some features')}</li>
          <li>{t('ระงับบัญชีชั่วคราว', 'Suspend the account temporarily')}</li>
          <li>{t('ปิดบัญชีถาวร', 'Close the account permanently')}</li>
        </List>
        <P>
          {t(
            'ในกรณีร้ายแรง เช่น มีอันตรายต่อผู้อื่นหรือเกี่ยวกับความปลอดภัยของเด็ก เราอาจระงับบัญชีทันทีโดยไม่ตักเตือนก่อน และส่งข้อมูลให้หน่วยงานที่มีอำนาจตามกฎหมาย',
            'In serious cases, such as danger to others or matters of child safety, we may suspend an account immediately without a prior warning, and pass information to the authorities empowered by law.',
          )}
        </P>

        <Sub>{t('การแจ้งและการอุทธรณ์', 'Notices and appeals')}</Sub>
        <P>
          {tn(
            <>
              เมื่อเราพักบัญชี แอปจะบอกว่าพักถึงวันไหนเมื่อคุณลองโพสต์หรือส่งข้อความ และคุณขอทราบเหตุผลได้ที่ {EMAIL} ถ้าคิดว่าเราตัดสินผิด
              อุทธรณ์ได้ที่อีเมลเดียวกันภายใน <Ph>จำนวน</Ph> วัน เราจะทบทวนเรื่องอีกครั้งและตอบกลับภายใน <Ph>จำนวน</Ph> วัน
            </>,
            <>
              When we suspend an account, the app shows the date the suspension ends when you try to post or send a message, and you can ask for the reason at{' '}
              {EMAIL}. If you think we got it wrong, you can appeal to the same email within <Ph>number</Ph> days. We will review the case again and reply within{' '}
              <Ph>number</Ph> days.
            </>,
          )}
        </P>
        <Note>ทบทวนว่าการไม่มีระบบกรองอัตโนมัติกระทบความรับผิดของผู้ให้บริการตาม พ.ร.บ.คอมพิวเตอร์ มาตรา 15 และประกาศกระทรวงฯ เรื่องการแจ้งเตือนและการนำข้อมูลออกอย่างไร และกำหนดระยะเวลาตอบรายงาน</Note>
      </>
    ),
  },
  {
    id: 'content',
    title: t('เนื้อหาของคุณและสิทธิ์ในการใช้', 'Your content and our permission to use it'),
    body: (
      <>
        <P>
          {t(
            'ข้อความ คำตอบ โพสต์ และข้อมูลโปรไฟล์ที่คุณสร้างยังเป็นของคุณ เพื่อให้บริการทำงานได้ คุณอนุญาตให้เราเก็บ ทำสำเนา แสดง และปรับรูปแบบการแสดงผลเนื้อหานั้น ได้โดยไม่มีค่าตอบแทนและไม่ผูกขาด เฉพาะเพื่อให้บริการ ดูแลความปลอดภัย และปรับปรุง moshimoshi',
            'The messages, answers, posts and profile information you create remain yours. So that the service can work, you allow us, free of charge and on a non-exclusive basis, to store, copy, display and adjust the display format of that content, solely to provide the service, keep it safe, and improve moshimoshi.',
          )}
        </P>
        <P>
          {t(
            'การอนุญาตนี้สิ้นสุดเมื่อคุณลบเนื้อหาหรือลบบัญชี ยกเว้นสำเนาในข้อมูลสำรองที่ลบตามรอบ เนื้อหาที่ต้องเก็บไว้ตามกฎหมายหรือเพื่อตรวจรายงาน และสิ่งที่ผู้ใช้คนอื่นอาจจดจำหรือบันทึกไว้แล้ว',
            'This permission ends when you delete the content or your account, except for copies in backups that are deleted on a rolling cycle, content that must be kept by law or to review reports, and anything other users may already have remembered or saved.',
          )}
        </P>
        <P>
          {t(
            'คุณรับรองว่ามีสิทธิ์ในเนื้อหาที่โพสต์ และเนื้อหานั้นไม่ละเมิดสิทธิของใคร',
            "You confirm that you have the rights to the content you post, and that it does not infringe anyone's rights.",
          )}
        </P>
        <P>
          {t(
            'ชื่อ moshimoshi ตัวละครโมชิ การออกแบบ และซอฟต์แวร์ของบริการเป็นของเราหรือผู้อนุญาตให้เราใช้ ห้ามนำไปใช้โดยไม่ได้รับอนุญาต',
            'The moshimoshi name, the Mochi character, the design and the software of the service belong to us or to those who license them to us, and may not be used without permission.',
          )}
        </P>
      </>
    ),
  },
  {
    id: 'termination',
    title: t('การเลิกใช้และการปิดบัญชี', 'Leaving and account closure'),
    body: (
      <P>
        {t(
          'คุณเลิกใช้บริการได้ทุกเมื่อ เราอาจระงับหรือปิดบัญชีที่ทำผิดข้อตกลงนี้ หรือเมื่อกฎหมายกำหนด ข้อที่โดยลักษณะควรมีผลต่อไปหลังปิดบัญชี เช่น สิทธิ์ในเนื้อหาที่ค้างอยู่ในข้อมูลสำรอง ข้อจำกัดความรับผิด และกฎหมายที่ใช้บังคับ ยังคงมีผลต่อไป',
          'You can stop using the service at any time. We may suspend or close accounts that breach these terms, or when the law requires. Clauses that by their nature should continue after an account is closed, such as rights in content remaining in backups, limitations of liability and governing law, remain in effect.',
        )}
      </P>
    ),
  },
  {
    id: 'disclaimer',
    title: t('ข้อจำกัดความรับผิดชอบ', 'Disclaimer'),
    body: (
      <>
        <P>
          {t(
            'เราให้บริการ “ตามสภาพ” และ “ตามที่มีให้บริการ” เราตั้งใจดูแลให้บริการใช้ได้ดีเสมอ แต่ไม่รับประกันว่าบริการจะไม่สะดุด ไม่มีข้อผิดพลาด หรือว่าคุณจะได้เจอเพื่อนที่เข้ากันได้',
            'We provide the service “as is” and “as available”. We aim to keep the service working well at all times, but we do not guarantee that it will be uninterrupted or error-free, or that you will find friends you get along with.',
          )}
        </P>
        <P>
          {t(
            'การคุยและการพบกันระหว่างผู้ใช้เป็นเรื่องระหว่างผู้ใช้ด้วยกัน เราไม่รับรองความถูกต้องของข้อมูลที่ผู้ใช้คนอื่นให้ไว้',
            'Conversations and meetings between users are a matter between those users. We do not vouch for the accuracy of information other users provide.',
          )}
        </P>
        <Note>ตรวจถ้อยคำให้สอดคล้องกับ พ.ร.บ.ว่าด้วยข้อสัญญาที่ไม่เป็นธรรม พ.ศ. 2540 และกฎหมายคุ้มครองผู้บริโภค</Note>
      </>
    ),
  },
  {
    id: 'liability',
    title: t('การจำกัดความรับผิด', 'Limitation of liability'),
    body: (
      <>
        <P>
          {tn(
            <>
              เท่าที่กฎหมายอนุญาต เราไม่ต้องรับผิดต่อความเสียหายทางอ้อม ความเสียหายต่อเนื่อง การสูญเสียข้อมูล หรือความเสียหายที่เกิดจากการกระทำของผู้ใช้คนอื่น
              และความรับผิดรวมทั้งหมดของเราต่อคุณจะไม่เกิน <Ph>จำนวนเงินสูงสุด</Ph>
            </>,
            <>
              To the extent permitted by law, we are not liable for indirect damages, consequential damages, loss of data, or damage caused by the actions of other
              users, and our total liability to you will not exceed <Ph>maximum amount</Ph>.
            </>,
          )}
        </P>
        <P>
          {t(
            'ข้อนี้ไม่จำกัดความรับผิดของเราที่เกิดจากการกระทำโดยจงใจหรือประมาทเลินเล่ออย่างร้ายแรง หรือความรับผิดที่กฎหมายห้ามจำกัด',
            'This clause does not limit our liability arising from intentional acts or gross negligence, or any liability that the law does not allow to be limited.',
          )}
        </P>
        <Note>กำหนดเพดานความรับผิด และตรวจกับประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 373 ว่าข้อยกเว้นใดใช้บังคับได้จริง</Note>
      </>
    ),
  },
  {
    id: 'changes',
    title: t('การเปลี่ยนแปลงข้อตกลง', 'Changes to these terms'),
    body: (
      <P>
        {tn(
          <>
            เราอาจปรับปรุงข้อตกลงนี้และจะแก้วันที่ “แก้ไขล่าสุด” ด้านบน ถ้าเป็นการเปลี่ยนแปลงสำคัญ เราจะแจ้งในแอปหรือทางอีเมลล่วงหน้าอย่างน้อย <Ph>จำนวน</Ph> วันก่อนมีผล
            ถ้าคุณยังใช้บริการหลังข้อตกลงใหม่มีผล ถือว่ายอมรับข้อตกลงใหม่ ถ้าไม่ยอมรับ คุณเลิกใช้และขอลบบัญชีได้
          </>,
          <>
            We may update these terms and will change the “Last updated” date above. For significant changes, we will notify you in the app or by email at least{' '}
            <Ph>number</Ph> days before they take effect. If you keep using the service after the new terms take effect, you are deemed to accept them. If you do
            not accept them, you can stop using the service and ask us to delete your account.
          </>,
        )}
      </P>
    ),
  },
  {
    id: 'law',
    title: t('กฎหมายที่ใช้บังคับ', 'Governing law'),
    body: (
      <P>
        {tn(
          <>
            ข้อตกลงนี้อยู่ภายใต้กฎหมายไทย ถ้ามีข้อขัดแย้ง เราอยากคุยกันก่อน ติดต่อเราได้ที่ {EMAIL} ถ้าตกลงกันไม่ได้ ให้ศาลไทยที่มีเขตอำนาจเป็นผู้พิจารณา
          </>,
          <>
            These terms are governed by Thai law. If a dispute arises, we would like to talk it through first: contact us at {EMAIL}. If we cannot reach an
            agreement, the dispute will be decided by the competent Thai courts.
          </>,
        )}
      </P>
    ),
  },
  {
    id: 'contact',
    title: t('ติดต่อเรา', 'Contact us'),
    body: (
      <>
        <List>
          <li>{COMPANY}</li>
          <li>
            {t('ที่อยู่:', 'Address:')} {ADDRESS}
          </li>
          <li>
            {t('อีเมล:', 'Email:')} {EMAIL}
          </li>
        </List>
        <P>
          {tn(
            <>
              ข้อตกลงนี้มีผลตั้งแต่ {EFFECTIVE} แก้ไขล่าสุดเมื่อ {lastUpdated()}
            </>,
            <>
              These terms take effect on {EFFECTIVE}. Last updated {lastUpdated()}.
            </>,
          )}
        </P>
      </>
    ),
  },
]

/** '/terms' — terms of use and community rules (draft for legal review). */
export default function TermsPage() {
  return (
    <LegalShell
      title={t('ข้อตกลงการใช้งาน', 'Terms of Use')}
      lead={t(
        'moshimoshi เป็นที่ให้คนอายุ 20 ปีขึ้นไปเจอเพื่อนจากเรื่องที่ชอบ แล้วค่อยๆ สนิทกันแบบอุ่นใจ ข้อตกลงนี้บอกว่าเราดูแลบริการอย่างไร และเราขอให้ทุกคนดูแลกันและกันอย่างไร',
        'moshimoshi is a place for people aged 20 and over to find friends through what they love, and grow closer step by step with peace of mind. These terms explain how we run the service, and how we ask everyone to look out for each other.',
      )}
      summary={summary()}
      sections={sections()}
      contact={tn(
        <>มีคำถามเรื่องข้อตกลงนี้ เขียนมาคุยกับเราได้ที่ {EMAIL}</>,
        <>Questions about these terms? Write to us at {EMAIL}.</>,
      )}
    />
  )
}
