import React from 'react'
import dateTime from '../utils/DateString'
class ResultList extends React.Component {
  render () {
    const {results} = this.props
    console.log('resulkts', results)
    return (
      <div className='container' style ={{marginTop: '20px', minHeight: '400px'}}>
        <h5 className='section-descriptor'> Results </h5>
        <p className='section-description'> Scores from previous games</p>
        <div className='row'>
          { results.map(result => {
            if (result.team1Score) {
              return (
                <div className='col-6' style={{padding: '10px'}} key={result.id}>
                  <div className="card" style={{padding: '0', marginBottom: '40px'}}>
                    <h6 className="card-header">{result.round}</h6>
                    <div className="card-body result-card-body">
                      <p>{dateTime(result.matchTime)}</p>
                      <span> <strong>{result.team1}</strong> <strong className='score'>{result.team1Score}</strong> </span>
                      <span> : </span>
                      <span><strong className='score'>{result.team2Score} </strong> <strong>{result.team2}</strong></span>
                    </div>
                  </div>
                </div>
              )
            }
          })
          }
        </div>
      </div>
    )
  }
}

export default ResultList
