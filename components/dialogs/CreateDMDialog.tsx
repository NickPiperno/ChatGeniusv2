'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"
import { fetchApi } from '@/lib/api-client'

interface CreateDMDialogProps {
  children: React.ReactNode
  onCreateDM?: (userId: string) => Promise<void>
}

export function CreateDMDialog({ children, onCreateDM }: CreateDMDialogProps) {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<Array<{
    id: string
    displayName: string
    imageUrl?: string
  }>>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch users when dialog opens
  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && users.length === 0) {
      try {
        setLoading(true)
        const response = await fetchApi('/api/users')
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        // Filter out current user
        setUsers(data.filter((u: any) => u.id !== user?.id))
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSelectUser = async (userId: string) => {
    if (!onCreateDM) return
    try {
      setLoading(true)
      await onCreateDM(userId)
      setOpen(false)
    } catch (error) {
      console.error('Error creating DM:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Start a conversation with another user.
          </DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder="Search users..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <ScrollArea className="h-[200px]">
            {loading ? (
              <div className="p-4 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <CommandGroup>
                <CommandEmpty>No users found.</CommandEmpty>
                {users
                  .filter(user => 
                    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(user => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => handleSelectUser(user.id)}
                      className="flex items-center gap-2 p-2 cursor-pointer"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>
                          {user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.displayName}</span>
                    </CommandItem>
                  ))
                }
              </CommandGroup>
            )}
          </ScrollArea>
        </Command>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 