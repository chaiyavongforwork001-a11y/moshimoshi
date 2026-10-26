import { MochiStage, View3D, type MochiAccessory, type MochiExpression } from '@/components/three'
import { t } from '@/lib/i18n'
import type { MochiColor } from '@/lib/types'
import { ACCESSORY_LABEL, COLOR_LABEL, FACE_LABEL } from '../options'
import { StageFx } from './Fx'
import { NameTag } from './NameTag'

interface StageBoxProps {
  color: MochiColor
  expression: MochiExpression
  accessory: MochiAccessory
  name: string
  pulse: number
  /** must include an explicit height, e.g. "h-60" */
  heightClass: string
  showName?: boolean
}

/**
 * The 3D mochi preview. The box stays transparent on purpose: the WebGL
 * canvas sits behind the DOM, so anything opaque here would hide it.
 */
export function StageBox({ color, expression, accessory, name, pulse, heightClass, showName = true }: StageBoxProps) {
  const acc = accessory === 'none' ? '' : t(` ใส่${ACCESSORY_LABEL[accessory]}`, `, ${ACCESSORY_LABEL[accessory].toLowerCase()}`)
  return (
    <div className="relative">
      <View3D className={`${heightClass} w-full`} label={t(`โมชิของเรา สี${COLOR_LABEL[color]} หน้า${FACE_LABEL[expression]}${acc}`, `Your Mochi: ${COLOR_LABEL[color]}, ${FACE_LABEL[expression].toLowerCase()}${acc}`)}>
        <MochiStage color={color} expression={expression} accessory={accessory} />
      </View3D>
      <StageFx pulse={pulse} color={color} />
      {showName && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
          <NameTag name={name} />
        </div>
      )}
    </div>
  )
}
