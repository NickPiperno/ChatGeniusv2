import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'

export function ProfileSettingsForm() {
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetchApi('/api/user/update-displayname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update display name: ${response.statusText}`)
      }

      setSuccess(true)
      setDisplayName('')
    } catch (err) {
      logger.error('Error updating display name:', err)
      setError('Failed to update display name')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">Display name updated successfully!</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Display Name'}
      </Button>
    </form>
  )
} 