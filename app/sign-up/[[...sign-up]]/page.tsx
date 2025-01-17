'use client'

import { useEffect } from 'react'

export default function SignUpPage() {
  useEffect(() => {
    window.location.href = '/api/auth/login?screen_hint=signup'
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        Redirecting to sign up...
      </div>
    </div>
  )
} 