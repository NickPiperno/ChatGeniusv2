import { DirectMessage } from '@/types/models/channel'

export const users: DirectMessage[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    status: 'online'
  },
  {
    id: '2',
    name: 'Bob Smith',
    status: 'offline'
  },
  {
    id: '3',
    name: 'Carol Williams',
    status: 'online'
  },
  {
    id: '4',
    name: 'David Brown',
    status: 'offline'
  },
  {
    id: '5',
    name: 'Eve Davis',
    status: 'online'
  }
]

export const channels = [
  { id: '1', name: 'General' },
  { id: '2', name: 'Random' },
] 