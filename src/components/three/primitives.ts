// Eager building blocks for code that already runs inside the 3D chunk
// (e.g. a new scene file). Pages should import from '@/components/three',
// which loads these lazily.
export { SoftLights, ViewCamera, type FrameSphere, type ViewCameraProps } from './Lights'
export { Mochi, type MochiAccessory, type MochiExpression, type MochiFaceExpression, type MochiProps, type MochiVariant } from './Mochi'
export { BODY_H, BODY_W, MOCHI_FOOT, MOCHI_TOP } from './mochiGeometry'
export { RetroPhone, type RetroPhoneProps } from './RetroPhone'
export { SpeechBubble, type SpeechBubbleProps } from './SpeechBubble'
export { FloatingDeco, SignalArc, type DecoKind, type FloatingDecoProps } from './FloatingDeco'
export { BlobShadow, Pedestal, PuffyCushion, CUSHION_TOP } from './props'
export { CloudBank, CloudCushion, CLOUD_SEAT, SkyClouds } from './clouds'
export { CallScene, HeroScene, MochiCrowd, MochiStage } from './scenes'
