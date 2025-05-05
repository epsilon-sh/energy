import express from 'express'
import cors from 'cors'
import pricesRouter from './routes/prices.mjs'
import consumptionRouter from './routes/consumption.mjs'
import waitlistRouter from './routes/waitlist.mjs'
import meteringPointsRouter from './routes/meteringPoints.mjs'
import { initializeDatabase } from './db.mjs'
import http from 'http'

const app = express()

if (process.env.TRUST_PROXY)
  app.set('trust proxy', process.env.TRUST_PROXY)

const PORT = process.env.PORT || 8989

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', // Restrict to frontend URL if provided
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

// Log request details
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.url}`)
  if (Object.keys(req.query).length > 0)
    console.log('Query params:', req.query)

  next()
})

// Setup routes
app.use('/prices', pricesRouter)
app.use('/consumption', consumptionRouter)
app.use('/meteringPoints', meteringPointsRouter)
app.use('/waitlist', waitlistRouter)

// Basic root route
app.get('/', (_req, res) => {
  res.send('OK')
})

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).send('Something went wrong!')
})

let server

const startServer = () => {
  return new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(PORT, () => {
      console.log(`Server running at http://${process.env.HOST || 'localhost'}:${PORT}`)
      resolve(server) // Resolve with the server instance
    })
  })
}

const stopServer = () => {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          console.error('Error stopping server:', err)
          return reject(err)
        }
        console.log('Server stopped')
        resolve()
      })
    } else {
      resolve() // Resolve if server wasn't started
    }
  })
}

// Start server only if this script is run directly
if (process.env.NODE_ENV !== 'test') {
  // Initialize DB first for non-test environments
  initializeDatabase()
    .then(() => {
      // Then start the server
      return startServer()
    })
    .catch(error => {
      console.error('Failed to initialize database or start server:', error)
      process.exit(1)
    })
}

// Export app and server control functions for testing
export { app, startServer, stopServer }
