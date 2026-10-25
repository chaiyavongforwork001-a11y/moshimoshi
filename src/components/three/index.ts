import { lazy } from 'react'

/*
 * Light entry point: importing from here never pulls three/R3F into a page's
 * chunk. The canvas, the drei View and every scene load on demand, so text and
 * controls paint first and the 3D drops in when ready. Constants such as
 * MOCHI_FOOT and eager versions of the primitives live in './primitives'.
 */
export { Stage3D } from './Stage3DRoot'
export { View3D } from './View3D'

const scenes = () => import('./scenes')
const lights = () => import('./Lights')
const deco = () => import('./FloatingDeco')
const props = () => import('./props')
const clouds = () => import('./clouds')

// ready-made scene contents
export const HeroScene = lazy(() => scenes().then((m) => ({ default: m.HeroScene })))
export const MochiStage = lazy(() => scenes().then((m) => ({ default: m.MochiStage })))
export const MochiCrowd = lazy(() => scenes().then((m) => ({ default: m.MochiCrowd })))
export const CallScene = lazy(() => scenes().then((m) => ({ default: m.CallScene })))
// scroll-driven landing story (reads progress from '@/lib/scrollStory')
export const StoryScene = lazy(() => import('./story/StoryScene').then((m) => ({ default: m.StoryScene })))

// primitives for custom scenes
export const Mochi = lazy(() => import('./Mochi').then((m) => ({ default: m.Mochi })))
export const RetroPhone = lazy(() => import('./RetroPhone').then((m) => ({ default: m.RetroPhone })))
export const SpeechBubble = lazy(() => import('./SpeechBubble').then((m) => ({ default: m.SpeechBubble })))
export const SoftLights = lazy(() => lights().then((m) => ({ default: m.SoftLights })))
export const ViewCamera = lazy(() => lights().then((m) => ({ default: m.ViewCamera })))
export const FloatingDeco = lazy(() => deco().then((m) => ({ default: m.FloatingDeco })))
export const SignalArc = lazy(() => deco().then((m) => ({ default: m.SignalArc })))
export const Pedestal = lazy(() => props().then((m) => ({ default: m.Pedestal })))
export const PuffyCushion = lazy(() => props().then((m) => ({ default: m.PuffyCushion })))
export const BlobShadow = lazy(() => props().then((m) => ({ default: m.BlobShadow })))
export const CloudCushion = lazy(() => clouds().then((m) => ({ default: m.CloudCushion })))
export const CloudBank = lazy(() => clouds().then((m) => ({ default: m.CloudBank })))
export const SkyClouds = lazy(() => clouds().then((m) => ({ default: m.SkyClouds })))

export type { FrameSphere, ViewCameraProps } from './Lights'
export type { MochiAccessory, MochiDetail, MochiExpression, MochiFaceExpression, MochiProps, MochiVariant } from './Mochi'
export type { RetroPhoneProps } from './RetroPhone'
export type { SpeechBubbleProps } from './SpeechBubble'
export type { DecoKind, FloatingDecoProps } from './FloatingDeco'
