import React from 'react'
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#D3DDD7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm />
        <p className="text-center text-gray-600 text-xs mt-6"> 2025 BBM Bangladesh. All rights reserved.</p>
      </div>
    </div>
  );
}

