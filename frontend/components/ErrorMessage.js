import React from 'react'

class ErrorMessage extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      errorMessage: null
    }
  }
  componentDidMount () {
    setTimeout(function () {
      this.setState({errorMessage: 'If there is nothing displayed either the oracle has shut down or the shared XRP account has not been created. Try refreshing the page!'})
    }.bind(this), 3000)
  }

  render () {
    return (
      <div style={{paddingLeft: '15px'}}>
        <p> {this.state.errorMessage} </p>
      </div>
    )
  }
}
export default ErrorMessage
