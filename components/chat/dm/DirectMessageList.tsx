'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DirectMessageCard } from './DirectMessageCard'
import { DirectMessage } from '@/types/models/channel'
import { CreateDMDialog } from '@/components/dialogs/CreateDMDialog'

interface DirectMessageListProps {
  isCollapsed?: boolean
  directMessages: DirectMessage[]
  onCreateDM?: (userId: string) => Promise<void>
}

export function DirectMessageList({ 
  isCollapsed = false,
  directMessages,
  onCreateDM
}: DirectMessageListProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="p-4 border-t border-gray-800">
      {!isCollapsed && (
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase text-zinc-400 hover:text-white/90 transition-colors">Direct Messages</h2>
          <CreateDMDialog onCreateDM={onCreateDM}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CreateDMDialog>
        </div>
      )}
      <ScrollArea className="max-h-[30vh]">
        {directMessages.map((dm) => (
          <DirectMessageCard
            key={dm.id}
            directMessage={dm}
            isCollapsed={isCollapsed}
            isActive={pathname === `/dm/${dm.id}`}
            onSelect={() => router.push(`/dm/${dm.id}`)}
          />
        ))}
      </ScrollArea>
    </div>
  )
} 