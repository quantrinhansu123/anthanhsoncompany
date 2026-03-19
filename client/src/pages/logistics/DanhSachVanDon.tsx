import React from 'react';

export function DanhSachVanDon() {
  return (
    <div className="absolute inset-0 -m-3 sm:-m-4 md:-m-6 w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
      <iframe
        src="https://view-bang-web.vercel.app/customers"
        className="w-full h-full border-0"
        title="Danh sách vận đơn"
        allow="fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
      />
    </div>
  );
}
