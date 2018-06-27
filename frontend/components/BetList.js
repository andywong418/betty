import React from 'react'
import BetModal from './BetModal'
import {Link} from 'react-router-dom'
class BetList extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      showModal: false,
      betPicked: null
    }
  }

  showBet (bet) {
    this.setState({
      showModal: !this.state.showModal,
      betPicked: bet
    })
  }

  closeModal () {
    this.setState({
      showModal: false,
      betPicked: null
    })
  }
  render () {
    const keys = Object.keys(this.props.bets)
    return (
      <div className='container' style ={{marginTop: '20px'}}>
        <h5 className='section-descriptor'> Opposing bets to place </h5>
        <p className='section-description'>Place an opposite bet to ones that have already been made. Note that this is 1-1 and done on a first come first serve basis, so if someone transacted against this bet first, your transaction will create a new bet.</p>
        <div className='row'>
          {keys.length > 0
            ? keys.map(key => {
              const bet = this.props.bets[key]
              const otherTeam = bet.bettingTeam === bet.match.team1 ? bet.match.team2 : bet.match.team1
              const conversion = bet.amount /1000000
              return (
                <div className='col-6' style={{padding: '10px'}} key={key}>
                  <div className="card" style={{padding: '0', marginBottom: '40px'}}>
                    <h6 className="card-header">{bet.name} put {conversion} XRP on {bet.bettingTeam} against {otherTeam}</h6>
                    <div className="card-body">
                      <h6 className="card-title">Place an equal opposing bet of {conversion} XRP on {otherTeam}</h6>
                      <span className="btn btn-primary" onClick={() => this.showBet(bet)} >Place bet</span>
                    </div>
                  </div>
                </div>
              )
            })
            : <p> There haven't been any Bets which have made.
              <Link to={'/new-bets'}> Make a bet now! </Link></p>
          }
        </div>
        {this.state.showModal ? <BetModal bet={this.state.betPicked} match={this.state.betPicked.match} closeModal={() => this.closeModal()} /> : null}
      </div>
    )
  }
}

export default BetList
