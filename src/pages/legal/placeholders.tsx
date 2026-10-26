import { L, t, tx, type Txt } from '@/lib/i18n'
import { Ph } from './bits'

/** A blank that reads in the current language (it's read when it renders, not when this module loads). */
function Blank({ text }: { text: Txt }) {
  return <Ph>{tx(text)}</Ph>
}

// Blanks shared by both documents, filled in once the company details are final.
export const COMPANY = <Blank text={L('ชื่อบริษัท/ผู้ให้บริการ', 'Company / service provider name')} />
export const ADDRESS = <Blank text={L('ที่อยู่ผู้ให้บริการ', 'Provider address')} />
export const EMAIL = <Blank text={L('อีเมลติดต่อ', 'Contact email')} />
export const PRIVACY_EMAIL = <Blank text={L('อีเมลสำหรับเรื่องข้อมูลส่วนบุคคล', 'Personal data contact email')} />
export const EFFECTIVE = <Blank text={L('วันที่เริ่มเปิดให้บริการ', 'Service launch date')} />

// true until the lawyer-approved text is in and the blanks above are filled
export const IS_DRAFT = true

/** Shown as "แก้ไขล่าสุด …" / "Last updated …"; call while rendering. Keep all three dates in step. */
export const lastUpdated = () => t('25 ตุลาคม 2569', '25 October 2026')
export const LAST_UPDATED_ISO = '2026-10-25'
