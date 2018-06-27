import React from 'react'
import dateTime from '../utils/DateString'
import { connect } from 'react-redux'
import { postBetInfo, postOpposingBetInfo } from '../actions/index'
class BetModal extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      address: '',
      bettingTeam: null,
      errorMessage: null,
      email: '',
      name: ''
    }
    if (props.bet) {
      this.state.bettingTeam = props.bet.bettingTeam === props.bet.match.team1 ? props.bet.match.team2 : props.bet.match.team1
    }
  }

  handleInputChange (event) {
    const target = event.target
    var value = target.type === 'checkbox' ? target.checked : target.value
    const name = target.name
    this.setState({
      [name]: value
    })
  }

  postBetInfoValidate () {
    const { address, bettingTeam, email, name } = this.state

    if (!address || !bettingTeam || !email || !name) {
      this.setState({
        errorMessage: true
      })
      return
    }

    if (!this.props.bet) {
      this.props.postBetInfo({
        address,
        bettingTeam,
        matchId: this.props.match.id,
        email,
        name
      })
    } else {
      this.props.postOpposingBetInfo({
        address,
        bettingTeam,
        matchId: this.props.bet.matchId,
        opposingBet: this.props.bet.destinationTag,
        email,
        name
      })
    }
  }

  resetInfo () {
    // TODO: reset DestinationTag after close. Or maybe on place bet remove
  }
  render () {
    const { match, closeModal, sharedAddress, postBetInfo, bettingTeam, betInfoError, destinationTag, address, bet, walletAddress} = this.props

    return (
      <div className='cover'>
        <div className="modal">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submitting bet for {match.team1} vs {match.team2}</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={() => closeModal()}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {
                  destinationTag
                    ? <div>
                      <span> You bet on { bettingTeam }! You can now send a transaction from a wallet of your choice. In your transaction, please specify: </span>
                      <ul className='bet-info'>
                        <li className='destination-address'> Destination XRP address: <span> { walletAddress } </span></li>
                        <li className='destination-tag'> Destination Tag: <span> {destinationTag} </span> </li>
                      </ul>
                      <p> You must send the transaction before the game starts at <strong>{dateTime(match.matchTime)}</strong>. <strong> Any transactions after this time will be rejected </strong>. If you lose the above information you can just bet for the same team in the same match again.</p>
                      <p> Once your transaction has been received we will email you with a confirmation of the bet! </p>
                    </div>
                    : <form>
                      <div className='form-group row'>
                        <label className='col-sm-2 col-form-label'>XRP address</label>
                        <div className='col-sm-10'>
                          <input type='text' name='address' className='form-control' placeholder='XRP address' onChange={(event) => this.handleInputChange(event)}/>
                        </div>

                      </div>
                      <div className='form-group row'>
                        <label className='col-sm-2 col-form-label'>Winner</label>
                        <div className='col-sm-10'>
                          <select defaultValue={this.state.bettingTeam} className='custom-select' name='bettingTeam' onChange={(event) => this.handleInputChange(event)} readOnly={true}>
                            <option disabled={bet !== undefined}> Choose team </option>
                            <option value = {match.team1} disabled = {bet && match.team1 !== this.state.bettingTeam}>{match.team1}</option>
                            <option value = {match.team2} disabled = {bet && match.team2 !== this.state.bettingTeam}>{match.team2}</option>
                          </select>
                        </div>
                      </div>
                      <div className='form-group row'>
                        <label className='col-sm-2 col-form-label'>Name</label>
                        <div className='col-sm-10'>
                          <input type='text' name='name' className='form-control' placeholder='Name' onChange={(event) => this.handleInputChange(event)}/>
                        </div>
                      </div>
                      <div className='form-group row'>
                        <label className='col-sm-2 col-form-label'>Email</label>
                        <div className='col-sm-10'>
                          <input type='text' name='email' className='form-control' placeholder='Email' onChange={(event) => this.handleInputChange(event)}/>
                        </div>
                      </div>
                      <span style={{fontSize: '15px', color: 'grey'}}> {bet === undefined ? 'Friendly reminder: Since you will be sending money from a wallet of your choice to our XRP address, you can choose the amount when you send the transaction!' : `Friendly reminder: Since this is an equal opposing bet, you have to send ${bet.amount} XRP`}</span>
                    </form>
                }
              </div>
              <div className="modal-footer">
                {this.state.errorMessage ? <span className='betInfoError'>Please fill in all fields above</span> : null }
                {betInfoError ? <span className='betInfoError'> Error submitting bet info - {betInfoError}</span> : null}
                {destinationTag ? null : <button type="button" className="btn btn-primary" onClick={() => this.postBetInfoValidate()}>Submit bet info </button>}
                <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={() => closeModal()}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
const mapStateToProps = (state) => {
  return {
    walletAddress: state.addressReducer.address,
    betInfoError: state.betReducer.betInfoError,
    address: state.betReducer.address,
    destinationTag: state.betReducer.destinationTag,
    bettingTeam: state.betReducer.bettingTeam
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    postBetInfo: (betObj) => dispatch(postBetInfo(betObj)),
    postOpposingBetInfo: (betObj) => dispatch(postOpposingBetInfo(betObj))
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(BetModal)
