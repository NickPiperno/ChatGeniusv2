import { setupServer } from 'msw/node'
import { rest } from 'msw'

// Define handlers
const handlers = [
  rest.get('/api/groups', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: '1',
          name: 'Test Group',
          creatorId: 'user1'
        }
      ])
    )
  }),

  rest.post('/api/groups', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: '2',
        name: 'New Group',
        creatorId: 'user1'
      })
    )
  }),

  rest.delete('/api/groups/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ success: true })
    )
  })
]

export const server = setupServer(...handlers) 