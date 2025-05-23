import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import './interop/env' //环境变量、扩展原型、平台初始化

import cssHasPseudo from 'css-has-pseudo/browser'
cssHasPseudo(document)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
