import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  MessageSquare, 
  Zap, 
  Shield, 
  Settings2
} from 'lucide-react'
import { Metadata } from "next"

export const metadata: Metadata = {
  title: 'ChatGenius - Next-Gen Chat Intelligence',
  description: 'Experience the future of messaging with ChatGenius. Real-time chat powered by AI, featuring end-to-end encryption and seamless customization.',
  keywords: ['chat', 'messaging', 'AI chat', 'secure messaging', 'real-time chat'],
  authors: [{ name: 'ChatGenius Team' }],
  openGraph: {
    title: 'ChatGenius - Next-Gen Chat Intelligence',
    description: 'Experience the future of messaging with ChatGenius. Real-time chat powered by AI.',
    type: 'website',
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'ChatGenius Preview'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatGenius - Next-Gen Chat Intelligence',
    description: 'Experience the future of messaging with ChatGenius',
    images: ['/og-image.jpg'],
  }
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-md z-50 border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-indigo-500" />
            <span className="text-xl font-bold">ChatGenius</span>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/api/auth/login">
              <Button variant="ghost">Sign In</Button>
            </a>
            <a href="/api/auth/login?screen_hint=signup">
              <Button>Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
            Experience Next-Gen Chat Intelligence
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            ChatGenius combines cutting-edge AI with intuitive design to deliver 
            a messaging experience that's both powerful and effortless.
          </p>
          <div className="flex justify-center space-x-4">
            <a href="/api/auth/login?screen_hint=signup">
              <Button size="lg" className="text-lg">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href="/api/auth/login">
              <Button size="lg" variant="outline" className="text-lg">
                Sign In
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose ChatGenius?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <Zap className="h-12 w-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Experience real-time messaging with zero latency and instant delivery.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <Shield className="h-12 w-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure by Design</h3>
              <p className="text-gray-600 dark:text-gray-300">
                End-to-end encryption and advanced security features keep your conversations private.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <Settings2 className="h-12 w-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Highly Customizable</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Personalize your chat experience with themes, layouts, and custom settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Experience ChatGenius?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have already transformed their messaging experience.
          </p>
          <a href="/api/auth/login?screen_hint=signup">
            <Button size="lg" className="text-lg">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-6 w-6 text-indigo-500" />
              <span className="font-bold">ChatGenius</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              © 2024 ChatGenius. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 