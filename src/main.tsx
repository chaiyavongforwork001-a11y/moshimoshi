import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import { Backdrop } from '@/app/Backdrop'
import { router } from '@/app/router'
import { MochiCursor } from '@/components/motion'
import { Stage3D } from '@/components/three'
import '@/styles/index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Backdrop />
      <Stage3D />
      <RouterProvider router={router} />
      <MochiCursor />
    </MotionConfig>
  </StrictMode>,
)
