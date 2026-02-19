"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { proxy } from "@/app/proxy";

export default function Header() {
 const isAuthenticated = useAuth();

 const handleLogout = async() => {
  try {
    const token = localStorage.getItem('accessToken');
    console.log('Token found:', token ? 'Yes' : 'No');
    console.log('Token value:', token);
    
    const response = await axios.post(
      `${proxy}/api/v1/users/logout`, 
      {}, 
      { 
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log('Logout response:', response)
    localStorage.clear();
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
    }
    // Clear local storage even if logout fails
    localStorage.clear();
    window.location.href = '/login';
  }
 }
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200"
      style={{ borderBottomColor: "rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 md:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link
            href="/"
            className="text-lg md:text-xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity"
          >
            ENUM
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link
              href="#features"
              className="font-mono text-xs font-medium text-gray-500 hover:text-black transition-colors tracking-[0.15em]"
            >
              FEATURES
            </Link>
            <Link
              href="#simulations"
              className="font-mono text-xs font-medium text-gray-500 hover:text-black transition-colors tracking-[0.15em]"
            >
              SIMULATIONS
            </Link>
            <Link
              href="#colleges"
              className="font-mono text-xs font-medium text-gray-500 hover:text-black transition-colors tracking-[0.15em]"
            >
              COLLEGES
            </Link>
          </nav>

          {/* Auth buttons */}
          {!isAuthenticated ? <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/login"
              className="font-mono text-xs font-medium text-gray-700 hover:text-black transition-colors tracking-wider hidden sm:inline"
            >
              LOGIN
            </Link>
            <Link
              href="/start"
              className="px-5 py-2 bg-black text-white font-mono text-xs tracking-wider hover:bg-gray-900 transition-colors"
            >
              START FREE
            </Link>
          </div> : <button onClick={handleLogout} className="border px-3 py-1">Logout</button>}
        </div>
      </div>
    </header>
  );
}
