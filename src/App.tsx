import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom'
import './App.css'
import Index from './Index/Index'

const router = createHashRouter([
  {
    path: '/',
    children: [
      { path: '', index: true, element: <Index /> },
      { path: 'calendar', element: <div>calendar</div> },
    ],
    element: (
      <div className="app">
        <main className="main">
          <Outlet />
        </main>
        <nav className="nav">nav</nav>
      </div>
    ),
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
