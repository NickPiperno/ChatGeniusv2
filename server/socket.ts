// Socket server wrapper
let io: any

// Only import the real socket server if we're not in Vercel
if (process.env.VERCEL !== '1') {
  io = require('./socket-server').default
} else {
  io = require('./mock-socket-server').default
}

export default io 