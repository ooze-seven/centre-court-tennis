import { MotionConfig, motion, useReducedMotion, useScroll } from 'framer-motion'
import { ReactLenis } from 'lenis/react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Account } from './components/Account.tsx'
import { AdminDesk, AdminHours, AdminLogins, AdminOverview, AdminPlayers } from './components/AdminDesk.tsx'
import { Anchor } from './components/Anchor.tsx'
import { AuthProvider } from './components/AuthProvider.tsx'
import { CourtMap } from './components/CourtMap.tsx'
import { Desk } from './components/Desk.tsx'
import { Footer } from './components/Footer.tsx'
import { Gallery } from './components/Gallery.tsx'
import { Grounds } from './components/Grounds.tsx'
import { Hero } from './components/Hero.tsx'
import { Intro } from './components/Intro.tsx'
import { Marquee } from './components/Marquee.tsx'
import { Nav } from './components/Nav.tsx'
import { RequireAuth } from './components/RequireAuth.tsx'
import { SignIn } from './components/SignIn.tsx'
import { SignUp } from './components/SignUp.tsx'
import { Specs } from './components/Specs.tsx'

const lenisOptions = {
  autoRaf: true,
  lerp: 0.085,
  smoothWheel: true,
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Site />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <Account />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth role="admin">
                  <AdminDesk />
                </RequireAuth>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="hours" element={<AdminHours />} />
              <Route path="players" element={<AdminPlayers />} />
              <Route path="desk" element={<AdminLogins />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}

function Site() {
  return (
    <Smooth>
      <Anchor className="skip" href="#page-title">
        Skip to the court
      </Anchor>
      <Sideline />
      <Intro />
      <Nav />
      <main id="top">
        <Hero />
        <Marquee />
        <Grounds />
        <CourtMap />
        <Specs />
        <Gallery />
        <Desk />
      </main>
      <Footer />
    </Smooth>
  )
}

function Smooth({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  if (reduce) return children
  return (
    <ReactLenis root options={lenisOptions}>
      {children}
    </ReactLenis>
  )
}

function Sideline() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  if (reduce) return null
  return <motion.div className="sideline" style={{ scaleY: scrollYProgress }} aria-hidden="true" />
}
