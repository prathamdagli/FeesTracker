import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-surface">
      {/* SideNavBar Shell */}
      <Sidebar />

      {/* Main Canvas Shell */}
      <main className="ml-72 flex-1 flex flex-col min-h-screen">
        {/* TopNavBar Shell */}
        <Topbar />

        {/* Content Canvas */}
        <div className="p-10 flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              key={window.location.pathname}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
