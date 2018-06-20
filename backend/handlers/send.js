const debug = require('debug')('betty:bets')
const RippleAPI = require('ripple-lib').RippleAPI
const address = 'r4iV8xADLRERfho4ZC9VLTqN6MMP6U8ezk'
const secret = 'shg7Fcqb7PcCvTYvkSxF55V5omEt6'

const ripple = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net:51233' // Public rippled server
})

const payment = {
  source: {
    address: address,
    maxAmount: {
      value: '0.01',
      currency: 'XRP'
    },
    tag: 1000001
  },
  destination: {
    address: 'rULzgNDEEF8T292ZLYWSb8n5xVKG2JPMZt',
    amount: {
      value: '0.00',
      currency: 'XRP'
    },
    tag: 1000001
  },
  memos: [
    {
      data: 'I vote for spain!!!',
      format: 'plain/text'
    },
    {
      data: 'I vote for spain!!!',
      format: 'plain/text'
    }
  ]
}

const instructions = {maxLedgerVersionOffset: 5}
function quit (message) {
  console.log(message)
  process.exit(0)
}

function fail (message) {
  console.error(message)
  process.exit(1)
}

ripple.connect().then(() => {
  console.log('Connected...')
  return ripple.preparePayment(address, payment, instructions).then(prepared => {
    console.log('Payment transaction prepared...')
    const {signedTransaction} = ripple.sign(prepared.txJSON, secret)
    console.log('Payment transaction signed...')
    ripple.submit(signedTransaction).then(quit, fail)
  })
}).catch(console.error)
