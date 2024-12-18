import express from 'express'
import cors from 'cors'
import pricesRouter from './routes/prices.mjs'
import consumptionRouter from './routes/consumption.mjs'
import waitlistRouter from './routes/waitlist.mjs'
import { initializeDatabase } from './db.mjs'

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

app.use('/prices', pricesRouter)
app.use('/consumption', consumptionRouter)
app.use('/waitlist', waitlistRouter)

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).send('Something went wrong!')
})

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server running at http://${process.env.HOST || 'localhost'}:${PORT}`)
    })

    await initializeDatabase()

    // process.on('SIGTERM', () => {
    //   console.log('SIGTERM, goodbye!')
    //   process.exit(0)
    // })

    // process.on('SIGINT', () => {
    //   console.log('SIGINT, goodbye!')
    //   process.exit(0)
    // })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer().then(_ => console.log('server running.'))
