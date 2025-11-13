"use client"

import React, { useState } from 'react'
import { Search, Bell, X } from 'lucide-react'
import { useMenu } from '@/components/showroomAdmin/ShowroomMenuContext'

interface NavbarProps {
  userName?: string
  subtitle?: string
}

export default function ShowroomNavbar({
  userName = 'BBM Bangladesh',
  subtitle = 'আপনার শোরুমের তথ্য ও কার্যক্রম দেখুন',
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { toggle } = useMenu()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Search query:', searchQuery)
  }

  return (
    <div className="bg-[#F7F7F7] border-gray-200 px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">

        <div className="text-center sm:text-left w-full sm:w-auto flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="md:hidden inline-flex flex-col justify-center items-center w-10 h-10 bg-[#D3DDD7] rounded-lg hover:bg-[#c5cdc8] transition"
            aria-label="মেনু খুলুন"
          >
            <span className="block w-6 h-0.5 bg-[#3E4C3A] mb-1" />
            <span className="block w-6 h-0.5 bg-[#3E4C3A] mb-1" />
            <span className="block w-6 h-0.5 bg-[#3E4C3A]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              হ্যালো BBM বাংলাদেশ
            </h1>
            <p className="text-gray-600 text-sm mt-1 max-w-xs sm:max-w-none mx-auto sm:mx-0">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <form
            onSubmit={handleSearch}
            className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="যেকোনো কিছু খুঁজুন..."
              className="px-4 py-2 rounded-full bg-white border text-black border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 w-full sm:w-64 md:w-72 transition-all"
            />
            <button
              type="submit"
              className="p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
          <div />
          <div />
        </div>
      </div>
    </div>
  )
}


