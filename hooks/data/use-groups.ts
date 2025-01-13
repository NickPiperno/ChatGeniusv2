import { useState, useEffect, useCallback } from 'react'
import { Group } from '@/types/models/group'
import { logger } from '@/lib/logger'

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [version, setVersion] = useState(0)

  const fetchGroups = async () => {
    logger.debug('Fetching groups')
    try {
      setIsLoading(true)
      const response = await fetch('/api/groups')
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.statusText}`)
      }
      const data = await response.json()
      
      logger.debug('Groups fetched successfully', {
        count: data.length,
        groups: data.map((g: Group) => ({
          id: g.id,
          name: g.name,
          creatorId: g.creatorId
        }))
      })

      setGroups(data)
    } catch (error) {
      logger.error('Failed to fetch groups', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    logger.debug('Groups effect triggered', { version })
    fetchGroups()
  }, [version])

  const refetch = useCallback(() => {
    logger.debug('Refetching groups')
    setVersion(v => v + 1)
  }, [])

  const removeGroup = useCallback(async (groupId: string) => {
    logger.info('Removing group', { groupId })
    
    try {
      setGroups(prevGroups => {
        const newGroups = prevGroups.filter(g => g.id !== groupId)
        logger.debug('Groups updated optimistically', {
          removedId: groupId,
          previousCount: prevGroups.length,
          newCount: newGroups.length
        })
        return newGroups
      })

      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        logger.error('Failed to delete group, reverting UI', {
          groupId,
          status: response.status,
          statusText: response.statusText
        })
        refetch()
        
        if (response.status === 403) {
          throw new Error('Only the group creator can delete the group')
        } else {
          throw new Error(`Failed to delete group: ${response.statusText}`)
        }
      }

      logger.info('Group deleted successfully', { groupId })
    } catch (error) {
      logger.error('Error in group deletion', {
        groupId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }, [refetch])

  return {
    groups,
    isLoading,
    refetch,
    removeGroup
  }
} 