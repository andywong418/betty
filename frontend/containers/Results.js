import React from 'react'
import { connect } from 'react-redux'
import ResultList from '../components/ResultList'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { getMatches } from '../actions/index'

class Result extends React.Component {
  componentDidMount () {
    this.props.getMatches()
  }
  render () {
    return (
      <div className='text-center main-body'>
        <Header name={this.props.name} />
        <ResultList results={this.props.matchesPlayed}/>
        <Footer />
      </div>
    )
  }
}
const mapStateToProps = (state) => {
  return {
    matchesPlayed: state.matchReducer.matchesPlayed
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    getMatches: () => dispatch(getMatches())
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Result)
