import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">💚</span>
            <span className="text-xl font-bold text-primary-600">心灵驿站</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors">
              首页
            </Link>
            <Link to="/posts" className="text-gray-600 hover:text-primary-600 transition-colors">
              倾诉广场
            </Link>
            <Link to="/counselors" className="text-gray-600 hover:text-primary-600 transition-colors">
              咨询师
            </Link>
            <Link to="/groups" className="text-gray-600 hover:text-primary-600 transition-colors">
              互助小组
            </Link>
            <Link to="/crisis" className="text-red-500 hover:text-red-600 transition-colors">
              危机援助
            </Link>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="text-gray-600 hover:text-primary-600 transition-colors">
                  个人中心
                </Link>
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="text-purple-600 hover:text-purple-700 transition-colors">
                    管理后台
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
