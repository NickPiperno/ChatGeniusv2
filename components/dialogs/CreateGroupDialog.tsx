'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CreateGroupDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => Promise<void>
}

export function CreateGroupDialog({
  isOpen,
  onClose,
  onSave
}: CreateGroupDialogProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      setIsLoading(true)
      await onSave(name.trim())
      setName('')
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Enter group name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isLoading}
            >
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 