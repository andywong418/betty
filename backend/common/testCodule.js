const broker = require('./broker.js')

broker.receive('epoch1', 'tag1', (i, m) => {
  console.log('Received a test_tag message from node #' + i + ': ' + m)
  broker.broadcast('epoch1', 'tag2', 'New message')
})
broker.receive('epoch1', 'tag2', (i, m) => console.log('Received a test_tag message from node #' + i + ': ' + m))

broker.broadcast('epoch1', 'test_tag', 'Hello World')
