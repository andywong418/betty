const { createTransport } = require('nodemailer')
const debug = require('debug')('betty:send-email')

function sendEmail (message) {
  const transporter = createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS
    }
  })

  const mailOpts = {
    from: process.env.EMAIL_FROM,
    to: message.to, // e.g., [ 'alice@gmail.com', 'bob@gmail.com' ]
    subject: message.subject,
    text: message.text
  }

  transporter.sendMail(mailOpts, (error, info) => {
    if (error) {
      debug(`Unable to send email, opts: ${JSON.stringify(mailOpts, null, 1)}`)
      throw error
    }
    debug(`Message sent: ${info.messageId}`)
  })
}

module.exports = {
  sendEmail
}
