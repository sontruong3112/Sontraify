import React from 'react'

function AppShell({ leftSidebar, mainContent, rightSidebar, audioNode, footerNode }) {
  return (
    <div className="smooth-ui min-h-screen bg-black text-white">
      <div className="grid min-h-screen grid-cols-1 gap-2 p-2 pb-24 xl:grid-cols-[360px_1fr_360px]">
        {leftSidebar}
        {mainContent}
        {rightSidebar}
      </div>

      {audioNode}
      {footerNode}
    </div>
  )
}

export default AppShell
