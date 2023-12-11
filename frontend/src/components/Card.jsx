import React from 'react'
import HL from '../Images/HomeLoan.png'
import SL from '../Images/study.png'
import PL from '../Images/professionals.png'
import SEL from '../Images/secure.png'
import BL from '../Images/portfolio.png'
import IL from '../Images/i.png'






import './card.css'
const Card = () => {
    return (
        <div className='cardz'>
            <div className='outer'>
                <div className="image-container">
                    <img src={HL} />
                </div>
                <h1 className='written'>HOME LOAN</h1>
                <p className='written para'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Eligendi, iste explicabo placeat voluptatum</p>
                <button>EXPLORE OPTION</button>

            </div>
            <div className='outer'>
                <div className="image-container">
                    <img src={BL} />
                </div>
                <h1 className='written'>BUSINESS LOAN</h1>
                <p className='written para'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Eligendi, iste explicabo placeat voluptatum</p>
                <button>EXPLORE OPTION</button>

            </div>
            <div className='outer'>
                <div className="image-container ">
                    <img className='white-background' src={IL} />
                </div>
                <h1 className='written '>INSTANT LOAN</h1>
                <p className='written para'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Eligendi, iste explicabo placeat voluptatum</p>
                <button>EXPLORE OPTION</button>

            </div>
            
            <div className='outer'>
                <div className="image-container">
                    <img src={SEL} />
                </div>
                <h1 className='written'>SECURE LOAN</h1>
                <p className='written para'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Eligendi, iste explicabo placeat voluptatum</p>
                <button>EXPLORE OPTION</button>

            </div>
        </div>

    )
}

export default Card