const debug = require('debug')('betty:bets')
const RippleAPI = require('ripple-lib').RippleAPI
const account = 'rULzgNDEEF8T292ZLYWSb8n5xVKG2JPMZt'

const ripple = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net:51233' // Public rippled server
})

// TODO: support placing multiple bets at once - specify amt to be applied to bet??
ripple.connect().then(() => {
  ripple.connection.on('transaction', (result) => {
    const transaction = result.transaction
    console.log(JSON.stringify(transaction, null, 2))
    const memos = JSON.parse(transaction.Memos)
    const tag = transaction.DestinationTag
    console.log(JSON.stringify(memos))
  })

  return ripple.connection.request({
    command: 'subscribe',
    accounts: [ account ]
  })
}).catch(console.error)

// TODO: notify user via the ui whether the bet has been placed
