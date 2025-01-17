'use client'

import { useEffect } from 'react'

export default function SignInPage() {
  useEffect(() => {
    window.location.href = '/api/auth/login'
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        Redirecting to login...
      </div>
    </div>
  )
} 