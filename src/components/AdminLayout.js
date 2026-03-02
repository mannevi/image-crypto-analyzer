import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3, Users, FolderOpen, FileSearch, Activity,
  Settings, Shield, LogOut
} from 'lucide-react';
import './AdminLayout.css';

function AdminLayout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin/dashboard',          icon: <BarChart3 size={18} />,  label: 'Overview'     },
    { path: '/admin/dashboard?tab=users',icon: <Users size={18} />,      label: 'Users'        },
    { path: '/admin/dashboard?tab=assets',icon:<FolderOpen size={18} />, label: 'Assets'       },
    { path: '/admin/assets',             icon: <Shield size={18} />,     label: 'Track Assets' },
    { path: '/admin/verify',             icon: <FileSearch size={18} />, label: 'Verify'       },
    { path: '/admin/dashboard?tab=analytics', icon: <Activity size={18} />, label: 'Analytics' },
    { path: '/admin/dashboard?tab=settings',  icon: <Settings size={18} />, label: 'Settings'  },
  ];

  const isActive = (path) => {
    const basePath = path.split('?')[0];
    return location.pathname === basePath &&
      (!path.includes('?') || location.search === '?' + path.split('?')[1]);
  };

  return (
    <div className="admin-layout">
      {/* Top Nav */}
      <div className="admin-nav">
        <div className="nav-brand">
          <h2>🔍 Image Forensics App - Admin</h2>
        </div>
        <div className="nav-user">
          <span>Admin: {user?.username || user?.name || 'Admin'}</span>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="admin-body">
        {/* Sidebar */}
        <div className="admin-sidebar">
          <ul className="sidebar-menu">
            {navItems.map(({ path, icon, label }) => (
              <li
                key={path}
                className={isActive(path) ? 'active' : ''}
                onClick={() => navigate(path.split('?')[0])}
              >
                {icon} {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Page Content */}
        <div className="admin-main">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
