import express from 'express'
import { getDatabase } from '../db.mjs'
import { SMTPClient } from 'emailjs'


const SMTPConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST,
  ssl: false,
}
const client = new SMTPClient(SMTPConfig)

// send the message and get a callback with an error or details of the message that was sent
const sendConfirmationEmail = (address) => {
  const email = {
    text: 'Welcome!',
    from: 'epsilon.sh waitlist <waitlist@epsilon.sh>',
    to: address,
    subject: 'Welcome to the waitlist!',
  }
  client.send(email,
    (err, message) => {
      console.log(err || message)
    }
  )
}

const router = express.Router()

// Add middleware to parse both JSON and form data
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

// GET /waitlist - Retrieve all waitlist entries
router.get('/', (_req, res, next) => {
  try {
    const db = getDatabase()
    const stmt = db.prepare('SELECT email, source, created_at FROM waitlist ORDER BY created_at DESC')
    const waitlist = stmt.all()
    res.json(waitlist)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    // Handle both JSON and form data submissions
    const email = req.body.email
    const source = req.body.source || 'website'

    if (!email) {
      // For JSON requests, return error JSON
      if (req.is('json'))
        return res.status(400).json({ error: 'Email is required' })

      // For form submissions, redirect back with error
      return res.redirect('/#error=Email is required')
    }

    const db = getDatabase()
    db.prepare(
      'INSERT OR IGNORE INTO waitlist (email, source) VALUES (?, ?)',
    ).run(email, source)

    console.log(`waitlist ${email}`)
    sendConfirmationEmail(email)

    // Handle response based on request type
    if (req.is('json'))
      return res.status(200).json({ message: 'Successfully joined waitlist' })

    // Redirect form submissions back to homepage with success message
    return res.redirect(new URL('#success=Thanks for joining our waitlist!', process.env.FRONTEND_URL))
  } catch (error) {
    next(error)
  }
})

export default router
