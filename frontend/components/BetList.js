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
        <div className='row'>
          {keys.length > 0
            ? keys.map(key => {
              const bet = this.props.bets[key]
              const otherTeam = bet.bettingTeam === bet.match.team1 ? bet.match.team2 : bet.match.team1
              return (
                <div className="card col-12" style={{padding: '0', marginBottom: '40px'}} key={key}>
                  <h5 className="card-header">{bet.name} put {bet.amount} XRP on {bet.bettingTeam} against {otherTeam}</h5>
                  <div className="card-body">
                    <h5 className="card-title">Place an equal opposing bet of {bet.amount} XRP on {otherTeam}</h5>
                    <span className="btn btn-primary" onClick={() => this.showBet(bet)} >Place bet</span>
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
