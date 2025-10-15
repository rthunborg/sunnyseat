import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  SunIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Admin Dashboard',
      href: '/admin',
      icon: HomeIcon,
      description: 'Venue management and polygon editing'
    },
    {
      name: 'Timeline Dashboard',
      href: '/timeline',
      icon: SunIcon,
      description: 'Sun exposure analysis and forecasting'
    }
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <nav className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <SunIcon className="h-8 w-8 text-yellow-500" />
              <span className="text-xl font-bold text-gray-900">SunnySeat</span>
              <span className="text-sm text-gray-500 font-medium">Admin</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200
                    ${isActive(item.href)
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  title={item.description}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Settings */}
          <div className="flex items-center">
            <button
              className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
              title="Settings"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation (if needed) */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  block pl-3 pr-4 py-2 text-base font-medium transition-colors duration-200
                  ${isActive(item.href)
                    ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center">
                  <Icon className="h-5 w-5 mr-3" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};