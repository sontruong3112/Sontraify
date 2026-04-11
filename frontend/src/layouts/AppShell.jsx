import React, { useEffect, useMemo, useState } from 'react'

function AppShell({
  leftSidebar,
  mainContent,
  rightSidebar,
  audioNode,
  footerNode,
  isLeftSidebarCollapsed = false,
  leftSidebarWidth = 320,
  rightSidebarWidth = 360,
  isMobileSidebarOpen = false,
  onCloseMobileSidebar = () => {},
  mobileBottomNav,
}) {
  const collapsedWidth = 96
  const leftWidth = isLeftSidebarCollapsed ? collapsedWidth : leftSidebarWidth
  const [isXlDesktop, setIsXlDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : false))
  const [is2XlDesktop, setIs2XlDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1536 : false))

  useEffect(() => {
    const updateLayoutBreakpoints = () => {
      setIsXlDesktop(window.innerWidth >= 1280)
      setIs2XlDesktop(window.innerWidth >= 1536)
    }

    updateLayoutBreakpoints()
    window.addEventListener('resize', updateLayoutBreakpoints)

    return () => {
      window.removeEventListener('resize', updateLayoutBreakpoints)
    }
  }, [])

  const desktopGridStyle = useMemo(() => {
    if (!isXlDesktop) {
      return undefined
    }

    if (is2XlDesktop) {
      return {
        gridTemplateColumns: `${leftWidth}px minmax(0, 1fr) ${rightSidebarWidth}px`,
      }
    }

    return {
      gridTemplateColumns: `${leftWidth}px minmax(0, 1fr)`,
    }
  }, [isXlDesktop, is2XlDesktop, leftWidth, rightSidebarWidth])

  return (
    <div className="smooth-ui min-h-screen bg-black text-white">
      <div
        className="grid min-h-screen grid-cols-1 gap-2 p-2 pb-24 transition-[grid-template-columns] duration-300 ease-in-out"
        style={desktopGridStyle}
      >
        <div className="hidden xl:block">
          {leftSidebar}
        </div>

        <div className="min-w-0">
          {mainContent}
        </div>

        <div className="2xl:hidden">
          {rightSidebar}
        </div>

        <div
          className="hidden 2xl:block"
          style={{ width: `${rightSidebarWidth}px` }}
        >
          {rightSidebar}
        </div>
      </div>

      {mobileBottomNav ? (
        <div className="fixed inset-x-0 bottom-24 z-30 px-2 xl:hidden">
          {mobileBottomNav}
        </div>
      ) : null}

      <div
        className={`fixed inset-0 z-40 xl:hidden ${isMobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onCloseMobileSidebar}
          className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Dong sidebar"
        />
        <div
          className={`absolute left-0 top-0 h-full w-[88vw] max-w-sm p-2 transition-transform duration-300 ease-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {leftSidebar}
        </div>
      </div>

      {audioNode}
      {footerNode}
    </div>
  )
}

export default AppShell
