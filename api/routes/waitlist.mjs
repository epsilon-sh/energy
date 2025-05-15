import express from 'express'
import { getDatabase } from '../db.mjs'
import { SMTPClient } from 'emailjs'

const SMTPConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST,
  ssl: false,
  tls: process.env.EMAIL_TLS === 'true' ? { ciphers: 'SSLv3' } : undefined,
}
const mailClient = new SMTPClient(SMTPConfig)

const waitlistOperations = {
  getWaitlistCount: (db) => {
    const stmt = db.prepare('SELECT COUNT(*) FROM waitlist')
    return stmt.get()['COUNT(*)']
  },
  // getAllWaitlistEntries: (db) => {
  //   console.warn('getAllWaitlistEntries is strictly reserved for admin use.')
  //   const stmt = db.prepare('SELECT email, source, created_at FROM waitlist ORDER BY created_at DESC')
  //   return stmt.all()
  // },
  addToWaitlist: (db, email, source) => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    db.prepare('INSERT OR IGNORE INTO waitlist (email, source) VALUES (?, ?)').run(email, source)

    const recentThresholdSeconds = 60
    let recentActivationInfo = db.prepare(
      `SELECT code FROM confirm_codes
       WHERE email = ? AND type = 'activation' AND used_at IS NULL AND expires_at > ? AND created_at > ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(email, nowInSeconds, nowInSeconds - recentThresholdSeconds)

    if (recentActivationInfo) {
      console.log(`addToWaitlist: Activation email recently sent for ${email}. Using existing codes.`)
      let existingUnsubscribeInfo = db.prepare(
        `SELECT code FROM confirm_codes
         WHERE email = ? AND type = 'unsubscribe' AND used_at IS NULL AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`
      ).get(email, nowInSeconds)

      if (existingUnsubscribeInfo) {
        return { status: 'resent_recent', activationCode: recentActivationInfo.code, unsubscribeCode: existingUnsubscribeInfo.code }
      } else {
        const newUnsubscribeCode = Math.random().toString(36).substring(2, 12).toUpperCase()
        const unsubscribeExpiresAt = nowInSeconds + (365 * 24 * 60 * 60) // 1 year
        db.prepare('INSERT INTO confirm_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)')
          .run(email, newUnsubscribeCode, 'unsubscribe', unsubscribeExpiresAt)
        return { status: 'resent_recent_new_unsubscribe', activationCode: recentActivationInfo.code, unsubscribeCode: newUnsubscribeCode }
      }
    } else {
      console.log(`addToWaitlist: Generating new codes for ${email}.`)
      // Expire old codes
      db.prepare(`UPDATE confirm_codes SET expires_at = ? WHERE email = ? AND type = 'activation' AND used_at IS NULL AND expires_at > ?`)
        .run(nowInSeconds, email, nowInSeconds)
      db.prepare(`UPDATE confirm_codes SET expires_at = ? WHERE email = ? AND type = 'unsubscribe' AND used_at IS NULL AND expires_at > ?`)
        .run(nowInSeconds, email, nowInSeconds)

      const activationGenCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const activationExpiresAt = nowInSeconds + (15 * 60) // 15 minutes
      db.prepare('INSERT INTO confirm_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)')
        .run(email, activationGenCode, 'activation', activationExpiresAt)

      const unsubscribeGenCode = Math.random().toString(36).substring(2, 12).toUpperCase()
      const unsubscribeExpiresAt = nowInSeconds + (365 * 24 * 60 * 60) // 1 year
      db.prepare('INSERT INTO confirm_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)')
        .run(email, unsubscribeGenCode, 'unsubscribe', unsubscribeExpiresAt)

      return { status: 'new_codes_generated', activationCode: activationGenCode, unsubscribeCode: unsubscribeGenCode }
    }
  },
  leaveWaitlist: (db, code) => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const confirmCodeEntry = db.prepare(
      `SELECT id, email FROM confirm_codes
       WHERE code = ? AND type = 'unsubscribe' AND used_at IS NULL AND expires_at > ?
       LIMIT 1`
    ).get(code, nowInSeconds)

    if (!confirmCodeEntry) {
      return { success: false, message: 'Invalid or expired unsubscribe link.' }
    }

    db.prepare('DELETE FROM waitlist WHERE email = ?').run(confirmCodeEntry.email)
    db.prepare('UPDATE confirm_codes SET used_at = ? WHERE id = ?').run(nowInSeconds, confirmCodeEntry.id)
    // Expire other active 'unsubscribe' codes for this user
    db.prepare(`UPDATE confirm_codes SET expires_at = ? WHERE email = ? AND type = 'unsubscribe' AND used_at IS NULL AND expires_at > ? AND id != ?`)
      .run(nowInSeconds, confirmCodeEntry.email, nowInSeconds, confirmCodeEntry.id)

    return { success: true, email: confirmCodeEntry.email }
  },
  confirm: (db, code) => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const confirmCodeEntry = db.prepare(
      `SELECT id, email FROM confirm_codes
       WHERE code = ? AND type = 'activation' AND used_at IS NULL AND expires_at > ?
       LIMIT 1`
    ).get(code, nowInSeconds)

    if (!confirmCodeEntry) {
      return { success: false, message: 'Invalid or expired confirmation link.' }
    }

    // Mark this code as used
    db.prepare('UPDATE confirm_codes SET used_at = ? WHERE id = ?').run(nowInSeconds, confirmCodeEntry.id)

    // Expire other active 'activation' codes for the same email
    db.prepare(
      `UPDATE confirm_codes SET expires_at = ? 
       WHERE email = ? AND type = 'activation' AND used_at IS NULL AND expires_at > ? AND id != ?`
    ).run(nowInSeconds, confirmCodeEntry.email, nowInSeconds, confirmCodeEntry.id)

    console.log(`WAITLIST CONFIRM: Email ${confirmCodeEntry.email} confirmed with code ${code}. Future: create/verify user account.`)
    // TODO: Future - Create user account if not exists / mark email as verified in a users table.

    return { success: true, email: confirmCodeEntry.email, message: 'Email confirmed successfully.' }
  },
}

const sendConfirmationEmail = (mailer, address, activationCode, unsubscribeCode) => {
  const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 8989}`
  const unsubscribeLink = `${apiUrl}/waitlist/bye?code=${unsubscribeCode}`
  const activationLink = `${apiUrl}/waitlist/confirm?code=${activationCode}`
  const email = {
    from: 'Epsilon Echo <echo@epsilon.sh>',
    to: address,
    subject: 'Welcome to the waitlist!',
    text: `Welcome to the waitlist!

    We're excited to have you on board.

    Your confirmation code is: ${activationCode}
    [ or click here: ${activationLink} ]

    We'll keep you posted on our progress and when we launch.

    Feel free to reply to this email with any questions.

    Thanks for your interest!

    ---
    To unsubscribe from future communications, please click here: ${unsubscribeLink}`
  }

  mailer.send(email,
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
router.get('/count', async (_req, res, next) => {
  try {
    const db = await getDatabase()
    const waitlist = await waitlistOperations.getWaitlistCount(db)
    res.json(waitlist)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const email = req.body.email
    const source = req.body.source || 'website'

    if (!email) {
      if (req.is('json')) return res.status(400).json({ error: 'Email is required' })
      return res.redirect('/#error=Email is required')
    }

    const db = getDatabase()
    const result = waitlistOperations.addToWaitlist(db, email, source)

    if (result.status === 'resent_recent' || result.status === 'resent_recent_new_unsubscribe' || result.status === 'new_codes_generated') {
      if (result.activationCode && result.unsubscribeCode) {
        sendConfirmationEmail(mailClient, email, result.activationCode, result.unsubscribeCode)
        console.log(`Waitlist: ${result.status} for ${email}. Codes: Act-${result.activationCode}, Unsub-${result.unsubscribeCode}`)
      } else {
        // Should not happen if status indicates codes are available
        console.error(`Waitlist: addToWaitlist returned status ${result.status} but codes are missing for ${email}`)
      }
    }
    // For other statuses or if no email needs to be sent based on result, just proceed to response.

    if (req.is('json')) {
      return res.status(200).json({ message: 'Successfully processed waitlist request. Please check your email.' })
    }
    return res.redirect(new URL('#success=Thanks for joining our waitlist! Please check your email.', process.env.FRONTEND_URL))

  } catch (error) {
    console.error('POST /waitlist error:', error)
    next(error)
  }
})

router.get('/bye', async (req, res, next) => {
  try {
    const { code } = req.query
    if (!code) {
      return res.status(400).send('Unsubscribe code is missing.')
    }

    const db = getDatabase()
    const result = waitlistOperations.leaveWaitlist(db, code)

    if (result.success) {
      console.log(`Waitlist: User with email ${result.email} unsubscribed via code ${code}.`)
      res.status(200).send('Properly unsubscribed. Ok bye!')
    } else {
      console.log(`Waitlist: Failed unsubscribe attempt with code ${code}. Reason: ${result.message}`)
      res.status(400).send(result.message || 'Invalid or expired unsubscribe link.')
    }
  } catch (error) {
    console.error('GET /bye error:', error)
    res.status(500).send('An error occurred while processing your unsubscribe request.')
  }
})

router.get('/confirm', async (req, res, next) => {
  try {
    const { code } = req.query
    if (!code) {
      return res.status(400).send('Confirmation code is missing.')
    }

    const db = getDatabase()
    const result = waitlistOperations.confirm(db, code)

    if (result.success) {
      res.status(200).send(result.message)
    } else {
      res.status(400).send(result.message || 'Invalid or expired confirmation link.')
    }
  } catch (error) {
    console.error('GET /confirm error:', error)
    res.status(500).send('An error occurred while processing your confirmation request.')
  }
})

export default router
