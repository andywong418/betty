import React from 'react'
import {Link} from 'react-router-dom'

const Header = () => {
    return (
        <div className='header'>
            <div className='content-wrapper'>
            <span className='title'> Betty </span>
            <div className='image-container'>
                <img width ={200} src= '/images/world-cup.svg' />
            </div>
            <span className='world-cup-title'> 2018 </span>
            </div>
        <p>The first decentralized betting platform for the Russian World Cup built on Codius </p>
        <div className='link-list'>
            <span> <Link to='/'> Home</Link> </span>
            <span> <Link to='/bets'> Bets</Link> </span>
            <span> <Link to='/matches'> Matches</Link> </span>
            <span> <Link to='/results'> Results</Link> </span>
            
        </div>
      </div>
    )
}

export default Header