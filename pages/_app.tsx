import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import './globals.css'

export default function App({ Component, pageProps }: AppProps) {
  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="description" content="Delivery platform with live GPS tracking for riders and customers" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MoveIt" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/manifest-icon-192.maskable.png" />
        <link rel="icon" type="image/png" href="/icons/manifest-icon-192.maskable.png" />
        <title>MoveIt - Delivery Platform</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
