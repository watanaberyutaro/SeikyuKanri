'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'

type LayoutWrapperProps = {
  children: React.ReactNode
  isLoggedIn: boolean
}

const noSidebarPaths = [
  '/',
  '/login',
  '/signup',
  '/apply',
  '/forgot-password',
  '/reset-password',
]

export function LayoutWrapper({ children, isLoggedIn }: LayoutWrapperProps) {
  const pathname = usePathname()
  const shouldShowSidebar = isLoggedIn && !noSidebarPaths.includes(pathname)

  if (shouldShowSidebar) {
    return (
      <>
        <Sidebar />
        <main className="lg:ml-64 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </>
    )
  }

  return <>{children}</>
}
