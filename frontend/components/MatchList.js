import React from 'react'
import ErrorMessage from './ErrorMessage'
import BetModal from './BetModal'
function dateTime (dateStr) {
  const d = new Date(dateStr)
  return d.toDateString()
}
class MatchList extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      showModal: false,
      matchPicked: null
    }
  }

  showMatchToBet (match) {
    this.setState({
      showModal: !this.state.showModal
    }, () => {
      if (this.state.showModal) {
        this.setState(
          { matchPicked: match }
        )
      }
    })
  }

  render () {
    return (
      <div className='container' style ={{marginTop: '20px'}}>
      <div className='row'>
        {this.props.matchesNotPlayed.length > 0 ? this.props.matchesNotPlayed.slice(0, 12).map(match => {
          return (
            <div className='match-item-container col-4' key={match.id}>
              <div className='match-item' key={match.team1 + match.team2}>
                <p> 
                  <span>MatchTime: </span> 
                  <span style={{color: '#2ecc71'}}> {dateTime(match.matchTime)} </span> 
                </p>
                <span className='match-teams'>
                  <span>
                  <strong>{match.team1}</strong>
                  </span>

                  <span>
                    vs
                  </span>

                  <span>
                    <strong> {match.team2} </strong>
                  </span>
                </span>

                <div style= {{textAlign: 'center', marginTop: '20px'}}>
                  <span className='btn btn-primary' onClick={() => {this.showMatchToBet(match)}}> Place bet </span>
                </div>
              </div>
            </div>
          )
        }) : <ErrorMessage />
        }
        </div>
        {this.state.showModal && this.state.matchPicked ? <BetModal match={this.state.matchPicked} /> : null }
      </div>
    )
  }
}

export default MatchList
