'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiUserPlus,
  FiDollarSign,
  FiCreditCard,
  FiFileText,
  FiActivity,
  FiMenu,
  FiX,
  FiLogOut,
  FiChevronDown,
} from 'react-icons/fi';
import './sidebar.css';

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

const Sidebar = ({ userName = "Usuário", userRole = "Admin" }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { 
      title: 'Dashboard',
      icon: <FiHome className="w-5 h-5" />,
      path: '/dashboard',
    },
    {
      title: 'Cadastro',
      icon: <FiUserPlus className="w-5 h-5" />,
      path: '/cadastro',
    },
    {
      title: 'Painel de Empréstimos',
      icon: <FiDollarSign className="w-5 h-5" />,
      path: '/emprestimos',
    },
    {
      title: 'Débito',
      icon: <FiCreditCard className="w-5 h-5" />,
      path: '/debitos',
    },
    {
      title: 'Relatório',
      icon: <FiFileText className="w-5 h-5" />,
      path: '/relatorio',
    },
    {
      title: 'Score',
      icon: <FiActivity className="w-5 h-5" />,
      path: '/score',
    },
  ];

  const sidebarVariants = {
    expanded: { width: '280px' },
    collapsed: { width: '88px' },
  };

  const mobileMenuVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 btn btn-circle btn-ghost"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        variants={isCollapsed ? sidebarVariants : mobileMenuVariants}
        initial="collapsed"
        animate={isMobileOpen ? 'open' : isCollapsed ? 'collapsed' : 'expanded'}
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-xl z-50
          ${isCollapsed ? 'w-22' : 'w-70'} 
          lg:translate-x-0 transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Toggle */}
          <div className="p-8 flex items-center justify-between ">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold text-green-600"
              >
                Sistema Financeiro
              </motion.div>
            )}
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="avatar placeholder">
                <div className="bg-green-600 text-white rounded-full w-10">
                  <span className="text-xl">{userName[0]}</span>
                </div>
              </div>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="font-medium text-gray-700 dark:text-gray-200">{userName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{userRole}</div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="menu menu-vertical gap-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`flex items-center p-3 rounded-lg transition-all duration-200 
                      ${pathname === item.path
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                        : 'hover:bg-green-50 dark:hover:bg-green-900/50'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="font-medium"
                        >
                          {item.title}
                        </motion.span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button className="btn btn-outline btn-error w-full flex items-center justify-center gap-2">
              <FiLogOut />
              {!isCollapsed && <span>Sair</span>}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;