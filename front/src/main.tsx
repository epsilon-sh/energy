import React from 'react'

import ReactDOM from 'react-dom/client'
// import Smartlook from 'smartlook-client'

import {Provider as StoreProvider} from 'react-redux'
import App from './App.tsx'
import store from './store.ts'

// const API_LOCATION = new URL(window.location)

// Smartlook.init('433d57fcb5e50aee3c1612a82248f8ebb007eceb', {
//   relayProxyUrl: `${(API_LOCATION || window.location).origin}/analytics`,
// });

const appMount = document.getElementById('app')

ReactDOM.createRoot(appMount!)
  .render(
    <React.StrictMode>
      <StoreProvider store={store}>
        <App/>
      </StoreProvider>
    </React.StrictMode>)

const cta = document.querySelector('form[name="waitlist"]')!
const mail: HTMLInputElement = cta.querySelector('input[name="email"]')!
cta.addEventListener('submit', () => console.log(`submit ${mail.value}`))
mail.removeAttribute('required')
console.log(cta)
