import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import Home from './pages/home.jsx'
import About from './pages/about.jsx'
import contact from './pages/contact.jsx'
import {Routes,Route} from 'react-router-dom'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter><App/></BrowserRouter>
  </StrictMode>,
)
