import React from 'react'
import ErrorMessage from './ErrorMessage'
class MatchList extends React.Component {
  constructor (props) {
    super(props)
  }

  render () {
    return (
      <div>
        {this.props.matchesNotPlayed.length > 0 ? this.props.matchesNotPlayed.slice(0, 10).map(match => {
          return (
            <div key={match.team1 + match.team2}>
              <span>{match.team1} vs {match.team2} </span>
            </div>
          )
        }) : <ErrorMessage />
        }
      </div>
    )
  }
}

export default MatchList
