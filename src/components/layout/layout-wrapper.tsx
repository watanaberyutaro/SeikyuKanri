'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { SidebarProvider, useSidebar } from './sidebar-context'

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

function LayoutContent({ children, shouldShowSidebar }: { children: React.ReactNode, shouldShowSidebar: boolean }) {
  const { collapsed } = useSidebar()

  if (shouldShowSidebar) {
    return (
      <>
        <Sidebar />
        <main className={`transition-all duration-300 p-4 md:p-6 lg:p-8 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          {children}
        </main>
      </>
    )
  }

  return <>{children}</>
}

export function LayoutWrapper({ children, isLoggedIn }: LayoutWrapperProps) {
  const pathname = usePathname()
  const shouldShowSidebar = isLoggedIn && !noSidebarPaths.includes(pathname)

  return (
    <SidebarProvider>
      <LayoutContent shouldShowSidebar={shouldShowSidebar}>
        {children}
      </LayoutContent>
    </SidebarProvider>
  )
}
