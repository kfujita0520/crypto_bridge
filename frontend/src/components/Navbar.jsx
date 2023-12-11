
import { Link } from 'react-router-dom';
import '../components/Navbar.css'
import '@fortawesome/fontawesome-free/css/all.css';
import Connect from './ConnectButton';
const Navbar = () => {
  return (
      <nav>
        <div className='nav_container'>
          <ul className='nav_links'>
            {/* New links */}
            <li><Link to="/loan-application">Loan Application</Link></li>
            <li><Link to="/loan-term-detail">Loan Term Detail</Link></li>
            {/* Account options */}
            <div className="account">
            <Connect/>
            </div>
          </ul>
        </div>
      </nav>
  );
};

export default Navbar;
