import React from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Topbar = () => {
  const { user } = useAuth();

  return (
    <header className="w-full sticky top-0 z-40 bg-white/80 backdrop-blur-xl flex justify-between items-center h-20 px-8 shadow-[0_24px_48px_rgba(25,28,29,0.06)] border-b border-white/20">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={18} />
          <input 
            className="w-full bg-surface-container-low border-none rounded-full py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 text-sm font-body outline-none" 
            placeholder="Search student records or transactions..." 
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="hover:bg-slate-50 rounded-full p-2 transition-all relative">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
          </button>
          <button className="hover:bg-slate-50 rounded-full p-2 transition-all">
            <Settings size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant/30"></div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-blue-900">{user?.displayName || 'Admin Portal'}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{user?.role || 'Super Admin'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center p-0.5">
            <img 
              alt="Administrator Profile" 
              className="w-full h-full rounded-full object-cover shadow-sm bg-white" 
              src={`https://ui-avatars.com/api/?name=${user?.displayName || 'Admin'}&background=00288e&color=fff`} 
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
