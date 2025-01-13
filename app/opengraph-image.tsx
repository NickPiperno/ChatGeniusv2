import { ImageResponse } from 'next/og'
import { MessageSquare } from 'lucide-react'
 
export const runtime = 'edge'
 
export const alt = 'ChatGenius - Next-Gen Chat Intelligence'
export const size = {
  width: 1200,
  height: 630,
}
 
export const contentType = 'image/png'
 
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to right, #6366f1, #a855f7)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <MessageSquare
            style={{
              width: '64px',
              height: '64px',
              color: 'white',
              marginRight: '16px',
            }}
          />
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              background: 'white',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            ChatGenius
          </h1>
        </div>
        <p
          style={{
            fontSize: '32px',
            color: 'white',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Experience Next-Gen Chat Intelligence
        </p>
      </div>
    ),
    {
      ...size,
    }
  )
} 