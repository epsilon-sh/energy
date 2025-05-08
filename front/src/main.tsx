import React from 'react'

import ReactDOM from 'react-dom/client'

import { Provider as StoreProvider } from 'react-redux'
import App from './App.tsx'
import store from './store.ts'
import { BrowserRouter } from 'react-router-dom'

const appMount = document.getElementById('app')

ReactDOM.createRoot(appMount!)
  .render(
    <React.StrictMode>
      <StoreProvider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StoreProvider>
    </React.StrictMode>)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8989';

const cta = document.querySelector('form[name="waitlist"]')!
const mail: HTMLInputElement = cta.querySelector('input[name="email"]')!

const handleWaitlistSubmit = async (email: string) => {
  try {
    const target = new URL('/waitlist', API_URL)
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      throw new Error('Failed to join waitlist')
    }

    alert('Successfully joined waitlist!')
    return
  } catch (error) {
    console.error('Waitlist error:', error)
    alert('Failed to join waitlist. Please try again later.')
  }
}

const handleMeteringPointsRequest = async () => {
  try {
    const target = new URL('/meteringPoints', API_URL)
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: include auth headers => get permitted metering points
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get metering points')
    }

    // Parse the JSON response
    const data = await response.json()
    console.log('Metering points loaded!')
    return data // Return the actual data from the response
  } catch (error) {
    console.error('Metering points error:', error)
    alert('Failed to load metering points. Please try again later.')
    throw error // Re-throw the error to be handled by the caller if needed
  }
};

// Wait for nav element to be available
const observer = new MutationObserver((_mutations, obs) => {
  const drawer = document.querySelector('nav');
  if (drawer) {
    drawer.addEventListener('click', async (_e) => {
      try {
        const meteringPoints = await handleMeteringPointsRequest();
        console.log('Metering points:', meteringPoints);
        drawer.innerHTML = meteringPoints.filter((mp: string | null) => mp !== null).map((meteringPointId: string) => `<a href="?meteringPoint=${meteringPointId}">${meteringPointId}</a>`)
      } catch (error) {
        console.error('Failed to handle metering points:', error);
      }
    });
    obs.disconnect();
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Update the event listener
cta.addEventListener('submit', (e) => {
  e.preventDefault()
  handleWaitlistSubmit(mail.value).then(() => mail.value = '')
})
