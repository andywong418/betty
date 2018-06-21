import React from 'react'

class BetModal extends React.Component {
  constructor (props) {
    super(props)
  }

  render () {
    const { match, closeModal, sharedAddress } = this.props
    return (
      <div className='cover'>
        <div className="modal">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submitting bet for {match.team1} vs {match.team2}</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Please send transactions using your wallet of choice. The address you should send to is: </p>
                <p style={{color: '#2ecc71'}}> {sharedAddress} </p>
                <p> You must also include the team you are betting on (<strong>{match.team1} </strong> or <strong>{match.team2}</strong>) in the memo and the matchId {match.matchId} in the tag</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary">Save changes</button>
                <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={() => closeModal()}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default BetModal
