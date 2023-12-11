import React from 'react'
import Image from '../Images/Background.jpg'
import UF from '../Images/UF.png'
import INT from '../Images/int.png'
import ONE from '../Images/ONE.png'
import DOCS from '../Images/DOCS.png'
import PER from '../Images/PER.png'





import Video from '../Images/Loan1.mp4'
import '../components/Home.css'
import Card from './Card'
import CreditScore from '../Images/creditScore.jpg'
const Home = () => {
    return (
        <div className='home'>
            <div className="video-container">
                <video className='video' autoPlay loop muted playsInline>
                    <source src={Video} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
            <div className='heading'>
                <h1 className='one'>Empowering Dreams</h1>
                <h1 className='two'>Bridging Futures</h1>
                <h3 className='three'>Your Trusted Partner in Financial Freedom</h3>
            </div>


            <Card />
            <div className="creditScore">
                <div className="credit-img">
                    <img src={CreditScore} />
                </div>
                <div className="info">
                    <h1>WHAT IS YOUR <br /><span>CREDIT SCORE </span>?</h1>
                    <p>Check your credit score and get a credit
                        report within a minute</p>
                    <button>CHECK CREDIT SCORE</button>
                </div>

            </div>
            <div className="title">
                <h1>ADVANTAGES OF CRYPTO BRIDGE</h1>
            </div>
            <div className="advantages-container">
                <div className="advantage">

                    <div className="advantage-container">
                        <div className="count">1</div>
                        <div className="content">
                            <img src={INT} />

                            <h3>Lowest <br />
                                Interest Rate</h3>

                        </div>
                    </div>
                </div>
                <div className="advantage">

                    <div className="advantage-container">
                        <div className="count">2</div>
                        <div className="content">
                            <img src={ONE} />
                            <h3>One-day <br />
                                Approval </h3>

                        </div>
                    </div>
                </div>
                <div className="advantage">

                    <div className="advantage-container">
                        <div className="count">3</div>
                        <div className="content">
                            <img src={DOCS} />
                            <h3>Minimal <br />
                                documents</h3>

                        </div>
                    </div>
                </div>
                <div className="advantage">

                    <div className="advantage-container">
                        <div className="count">4</div>
                        <div className="content">
                            <img src={PER} />
                            <h3>Personalized <br />
                                Personal Loan</h3>

                        </div>
                    </div>
                </div>
                <div className="advantage">

                    <div className="advantage-container">
                        <div className="count">5</div>
                        <div className="content">
                            <img src={UF} />
                            <h3>User-Friendly <br />
                                Experience</h3>

                        </div>
                    </div>
                </div>


            </div>

            



        </div>
    )
}

export default Home