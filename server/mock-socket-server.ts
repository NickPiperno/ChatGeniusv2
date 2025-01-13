// Mock socket server for Vercel environment
const mockIo = {
  emit: (event: string, data: any) => {
    console.log('[Mock Socket] Would emit event:', event, 'with data:', data)
  },
  to: (room: string) => ({
    emit: (event: string, data: any) => {
      console.log('[Mock Socket] Would emit to room:', room, 'event:', event, 'with data:', data)
    }
  })
}

export default mockIo 