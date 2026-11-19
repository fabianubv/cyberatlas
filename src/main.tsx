import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { loadData } from './data'
import SvgApp from './svg-map/SvgApp'
import './styles.css'

console.log('%cÉxito en tu ruta de ciberseguridad <3', 'color: #00ff9c; font-weight: 700')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SvgApp {...loadData()} />
  </StrictMode>,
)
