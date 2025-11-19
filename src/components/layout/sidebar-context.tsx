'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

type SidebarContextType = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // 書類作成ページかどうかをチェック
  const isDocumentCreationPage = pathname?.includes('/new') || pathname?.includes('/edit')

  // localStorageから初期状態を読み込み、書類作成ページの場合は自動で折りたたむ
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (isDocumentCreationPage) {
      setCollapsed(true)
    } else if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === 'true')
    }
  }, [isDocumentCreationPage])

  // 折りたたみ状態をlocalStorageに保存
  const toggleCollapsed = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    localStorage.setItem('sidebar-collapsed', String(newCollapsed))
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
