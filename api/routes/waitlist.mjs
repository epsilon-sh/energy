import express from 'express'
import { getDatabase } from '../db.mjs'

const router = express.Router()

// Add middleware to parse both JSON and form data
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

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
    await db.run(
      'INSERT OR IGNORE INTO waitlist (email, source) VALUES (?, ?)',
      [email, source],
    )

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
