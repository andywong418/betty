const { multisign } = require('./multisign.js')
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s1.ripple.com:443' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })
const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:testMultisign')
const senderAddr = 'rM7yN6rhasjn2rwq8v1EXNYa2QRZS3ymFH'
const { preparePayment } = require('./preparePayment.js')
const payment = {
  source: {
    address: senderAddr,
    maxAmount: {
      value: '0.01',
      currency: 'XRP'
    },
    tag: 1000001
  },
  destination: {
    address: 'rULzgNDEEF8T292ZLYWSb8n5xVKG2JPMZt',
    amount: {
      value: '0.01',
      currency: 'XRP'
    },
    tag: 1000001
  }
}
function sign () {
  const keypair = { address: 'rMMEujjj6Gr8jRZoe2Ao5oM9xGbdMttqKB', secret: 'sh94UkgfSv6wyANJfpcPjBxbMAuMU' }
  ripple.connect().then(() => {
    console.log('Connected...')
    preparePayment(payment, ripple)
  })
}

sign()
