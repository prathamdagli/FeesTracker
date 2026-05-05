import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Receipt, BarChart3, FileText, Upload, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Students', icon: <Users size={20} />, path: '/students' },
    { name: 'Fee Structure', icon: <Receipt size={20} />, path: '/fees' },
    { name: 'Payments', icon: <FileText size={20} />, path: '/payments' },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '/analytics' },
    { name: 'Smart Update', icon: <Upload size={20} />, path: '/smart-update' },
  ];

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'LZ';

  return (
    <aside className="h-screen w-72 fixed left-0 top-0 bg-surface-container-lowest flex flex-col gap-2 p-6 antialiased z-50 shadow-[4px_0_24px_rgba(25,28,29,0.04)]">
      {/* Logo */}
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-on-primary text-[20px]">school</span>
        </div>
        <div>
          <h1 className="text-base font-black tracking-tight text-primary leading-none">Learners Zone</h1>
          <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-widest">Academic Atelier</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-full font-bold transition-all duration-200'
                : 'flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all duration-200'
            }
          >
            {item.icon}
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="mt-auto pt-4 border-t border-surface-container-low">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-black text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-on-surface truncate">{user?.displayName || 'Admin'}</p>
            <p className="text-[10px] text-on-surface-variant truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-error hover:bg-error/5 rounded-full transition-colors text-sm font-bold"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
