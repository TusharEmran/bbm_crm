'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginForm() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const router = useRouter()

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    return newErrors
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newErrors = validateForm()

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const response = await fetch(`${baseUrl}/api/user/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (typeof window !== 'undefined' && data?.token) {
            try { sessionStorage.removeItem('auth_failed'); } catch { }
            localStorage.setItem('token', data.token)
            if (data?.user) {
              try { localStorage.setItem('user', JSON.stringify(data.user)); } catch { }
            }
            try {
              const maxAge = 7 * 24 * 60 * 60; // 7 days
              document.cookie = `token=${data.token}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
            } catch {}
          }
          const role = data?.user?.role

          if (role === 'admin') {
            router.replace('/admin')
          } else if (role === 'officeAdmin') {
            router.replace('/office-admin')
          } else if (role === 'showroom') {
            router.replace('/showroom-account')
          } else {
            setErrors({ email: 'Unknown role. Contact support.' })
          }
        } else {
          setErrors({ email: 'Invalid credentials' })
        }
      } catch (error) {
        setErrors({ email: 'An error occurred. Please try again.' })
      } finally {
        setIsLoading(false)
      }
    } else {
      setErrors(newErrors)
    }
  }

  const handleForgotPassword = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    console.log('Forgot password clicked')
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
        <p className="text-gray-600">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors({ ...errors, email: undefined })
            }}
            placeholder="you@example.com"
            className={`w-full px-4 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 transition ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              }`}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors({ ...errors, password: undefined })
            }}
            placeholder="**********"
            className={`w-full px-4 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 transition ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
              }`}
          />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition duration-200 ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
            }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="text-center mt-6">
        <a
          href="#"
          onClick={handleForgotPassword}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
        >
          Forgot Password?
        </a>
      </div>
    </div>
  )
}


