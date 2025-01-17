import { redirect } from 'next/navigation'

export default async function LoginPage() {
  redirect('/api/auth/login')
} 