const path = require('path')
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3002
const api = require('./backend/routes')
const RippleAPI = require('ripple-lib').RippleAPI
const WebSocket = require('ws')
if (typeof localStorage === 'undefined' || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('./scratch-' + process.env.PORT)
}
const wss = new WebSocket.Server({ port: Number(process.env.WEB_SOCKET) || 8002 })
// Put logic for host key gen in here.

const rippleAPI = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'})
// Change to wss://s1.ripple.com:443 for production

wss.on('connection', ws => {
  ws.on('message', message => {
    message = JSON.parse(message)
    if (message.keyGenInitiate) {
      rippleAPI.connect().then(() => {
        const { address, secret } = rippleAPI.generateAddress()
        localStorage.setItem('keypair', JSON.stringify({
          address,
          secret
        }))
        ws.send(JSON.stringify({
          address,
          walletAddress: true
        }))
      })
    }
    if (message.sendVerifiedSharedWallet) {
      const {address, hostList} = message
      localStorage.setItem('sharedWalletAddress', address)
      localStorage.setItem('hostList', JSON.stringify({
        hostList
      }))
      hostList.forEach(hostURL => {
        const ws = new WebSocket(hostURL)
        const newHostList = hostList.filter(host => {
          return host !== hostURL
        })
        ws.on('open', () => {
          ws.send(JSON.stringify({
            'shareAddressWithPeer': true,
            'address': address,
            'hostList': newHostList
          }))
          ws.close()
        })
      })
      console.log(localStorage.getItem('sharedWalletAddress'))
      console.log(localStorage.getItem('hostList'))
      // Propagate address to every thing sent in this peerList.
    }
    if (message.shareAddressWithPeer) {
      const {address, hostList} = message
      localStorage.setItem('sharedWalletAddress', address)
      localStorage.setItem('hostList', JSON.stringify({
        hostList
      }))
    }
  })
})

app.use(express.static(path.join(__dirname, 'public')))
app.use('*', (request, response, next) => {
  const multiSignContract = localStorage.getItem('sharedWalletAddress')
  if (multiSignContract) {
    next()
  } else {
    response.send('NO XRP ACCOUNT CREATED')
  }
})
app.use('/api', api)
app.get('*', (request, response) => {
  response.sendFile(__dirname + '/public/index.html')
})
app.use(express.static(path.join(__dirname, 'public')))
app.listen(PORT, error => {
  error
    ? console.error(error)
    : console.info(`==> 🌎 Listening on port ${PORT}. Visit http://localhost:${PORT}/ in your browser.`)
})
