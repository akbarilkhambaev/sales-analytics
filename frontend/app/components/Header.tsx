'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Header() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user) return null;

  const roleIcons: Record<string, React.ElementType> = {
    SUPER_ADMIN: ShieldCheck,
    ADMIN: ShieldCheck,
    MANAGER: UserCheck,
    VIEWER: User,
  };

  const RoleIcon = roleIcons[user.role] || User;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700">
            <RoleIcon className="w-5 h-5" />
            <span className="font-medium">{user.username}</span>
          </div>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            {user.role_display}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Профиль</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </div>
    </div>
  );
}
