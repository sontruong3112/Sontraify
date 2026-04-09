import React from 'react'

function AppShell({
  leftSidebar,
  mainContent,
  rightSidebar,
  audioNode,
  footerNode,
  isLeftSidebarCollapsed = false,
  isMobileSidebarOpen = false,
  onCloseMobileSidebar = () => {},
  mobileBottomNav,
}) {
  const desktopGridClassName = isLeftSidebarCollapsed
    ? 'xl:grid-cols-[96px_1fr] 2xl:grid-cols-[96px_1fr_360px]'
    : 'xl:grid-cols-[320px_1fr] 2xl:grid-cols-[320px_1fr_360px]'

  return (
    <div className="smooth-ui min-h-screen bg-black text-white">
      <div className={`grid min-h-screen grid-cols-1 gap-2 p-2 pb-24 ${desktopGridClassName} transition-[grid-template-columns] duration-300 ease-in-out`}>
        <div className="hidden xl:block">
          {leftSidebar}
        </div>

        <div className="min-w-0">
          {mainContent}
        </div>

        <div className="2xl:hidden">
          {rightSidebar}
        </div>

        <div className="hidden 2xl:block">
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
