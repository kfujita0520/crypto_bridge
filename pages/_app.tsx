import '@/styles/globals.css'
import Home from './../components/Home/Home'
import type { AppProps } from 'next/app'

const MyApp = ({ Component, pageProps }: AppProps) => {

  <div>
    <Home/>
    <Component {...pageProps} />
  </div>
  
}

export default MyApp