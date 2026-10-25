import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router'
import { LiveBoot, LiveToast, RequireAuth } from '@/pages/auth/guards'
import { AppShell } from './AppShell'
import { RouteError } from './RouteError'

// Each page is its own chunk so the landing page loads fast.
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'))
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'))
const HomePage = lazy(() => import('@/pages/home/HomePage'))
const PostIntentPage = lazy(() => import('@/pages/post/PostIntentPage'))
const RoomsPage = lazy(() => import('@/pages/rooms/RoomsPage'))
const RoomPage = lazy(() => import('@/pages/rooms/RoomPage'))
const PeoplePage = lazy(() => import('@/pages/people/PeoplePage'))
const ProfilePage = lazy(() => import('@/pages/people/ProfilePage'))
const ChatsPage = lazy(() => import('@/pages/chats/ChatsPage'))
const ChatPage = lazy(() => import('@/pages/chats/ChatPage'))
const MePage = lazy(() => import('@/pages/me/MePage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage'))
// dev-only 3D gallery for tuning characters and scenes (not routed in production builds)
const Gallery3D = import.meta.env.DEV ? lazy(() => import('@/pages/dev/Gallery3D')) : null
const StoryPreview = import.meta.env.DEV ? lazy(() => import('@/pages/dev/StoryPreview')) : null

function PageFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-label="กำลังโหลด">
      <span className="size-12 animate-bounce rounded-full bg-peach shadow-[var(--shadow-puffy)]" />
    </div>
  )
}

const page = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>

function Root() {
  return (
    <>
      <ScrollRestoration />
      <LiveBoot />
      <Outlet />
      <LiveToast />
    </>
  )
}

/** Installed PWA opens straight into the app instead of the marketing page. */
function LandingOrApp() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  return standalone ? <Navigate to="/app" replace /> : page(<LandingPage />)
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <LandingOrApp /> },
      { path: '/login', element: page(<LoginPage />) },
      { path: '/auth/callback', element: page(<AuthCallbackPage />) },
      { path: '/onboarding', element: <RequireAuth onboarding>{page(<OnboardingPage />)}</RequireAuth> },
      ...(Gallery3D ? [{ path: '/dev/3d', element: page(<Gallery3D />) }] : []),
      ...(StoryPreview ? [{ path: '/dev/story', element: page(<StoryPreview />) }] : []),
      {
        path: '/app',
        // live mode: signed in + onboarded (demo mode passes straight through)
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: page(<HomePage />) },
          { path: 'post', element: page(<PostIntentPage />) },
          { path: 'rooms', element: page(<RoomsPage />) },
          { path: 'rooms/:roomId', element: page(<RoomPage />) },
          { path: 'people', element: page(<PeoplePage />) },
          { path: 'people/:userId', element: page(<ProfilePage />) },
          { path: 'chats', element: page(<ChatsPage />) },
          { path: 'chats/:chatId', element: page(<ChatPage />) },
          { path: 'me', element: page(<MePage />) },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
