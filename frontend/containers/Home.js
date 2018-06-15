import Proptypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import MatchList from '../components/MatchList'
import { getMatches } from '../actions/index'

class Home extends React.Component {
  constructor (props) {
    super(props)
    this.state = {

    }
  }

  componentDidMount () {
    this.props.getMatches()
  }
  render () {
    return (
      <div className='text-center'>
        <h1>{this.props.name}</h1>
        <Link to={'/anotherPage'}> Click Here </Link>
        <MatchList matchesNotPlayed={this.props.matchesNotPlayed} matchesPlayed={this.props.matchesPlayed} />
      </div>
    )
  }
}
const mapStateToProps = (state) => {
  return {
    name: state.rootReducer.name,
    matchesNotPlayed: state.matchReducer.matchesNotPlayed,
    matchesPlayed: state.matchReducer.matchesPlayed
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    getMatches: () => dispatch(getMatches())
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Home)
