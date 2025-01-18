import { useState, useEffect, useCallback } from 'react'
import { Group } from '@/types/models/group'
import { logger } from '@/lib/logger'
import { fetchApi } from '@/lib/api-client'

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set())

  const fetchGroups = async () => {
    logger.debug('Fetching groups')
    try {
      setIsLoading(true)
      const response = await fetchApi('/api/groups')
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.statusText}`)
      }
      const data = await response.json()
      setGroups(data.groups || [])
    } catch (error) {
      logger.error('Error fetching groups:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = useCallback(() => {
    setVersion(v => v + 1)
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [version])

  const removeGroup = useCallback(async (groupId: string) => {
    logger.info('Removing group', { groupId })
    
    try {
      setPendingDeletions(prev => new Set(prev).add(groupId))
      setGroups(prevGroups => {
        const newGroups = prevGroups.filter(g => g.id !== groupId)
        logger.debug('Groups updated optimistically', {
          removedId: groupId,
          previousCount: prevGroups.length,
          newCount: newGroups.length
        })
        return newGroups
      })

      const response = await fetchApi(`/api/groups/${groupId}`, {
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

  const clearPendingDeletion = useCallback((groupId: string) => {
    setPendingDeletions(prev => {
      const next = new Set(prev)
      next.delete(groupId)
      return next
    })
  }, [])

  return {
    groups,
    isLoading,
    refetch,
    removeGroup,
    clearPendingDeletion,
    pendingDeletions
  }
} 