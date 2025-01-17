import { Link } from 'react-router-dom'
import './Index.css'

export default function Index() {
  return (
    <div className="index">
      index
      <br />
      <Link to="calendar">(link example) go to calendar</Link>
    </div>
  )
}
