import './Header.css'
import {Link} from 'react-router-dom'
function Header(){
    return(
        <div>
    <div class="header">
      <Link to="/">Home</Link>
      <Link to="/about">About us</Link>
      <Link to="/contact">Contact us</Link>
      <Link to="/login">Login</Link>
      <Link to="/register">Register</Link>
     </div>
        </div>
    )
}
export default Header