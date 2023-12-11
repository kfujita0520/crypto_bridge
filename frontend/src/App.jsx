
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import LoanApplicationPage from './components/LoanApplicationPage';
import LoanTermDetailPage from './components/LoanTermDetailPage';
import "@rainbow-me/rainbowkit/styles.css";
import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
} from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import NavBar from "../src/components/Navbar";


const { chains, publicClient } = configureChains(
  [mainnet, polygon, optimism, arbitrum, base, zora],
  [
    alchemyProvider({ apiKey: "EUzH12ECchHI0CKgwTdMZrvGZm4GKCLb" }),
    publicProvider()
  ]
);



const { connectors } = getDefaultWallets({
  appName: "RainbowKit App",
  projectId: "5374d190ba8c3c42c20fdc68c3314bae",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors, // Using the 'connectors' variable retrieved from getDefaultWallets
  publicClient,
});


const App = () => {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
      <Router>
        <NavBar />
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/loan-application" element={<LoanApplicationPage />} />
          <Route path="/loan-term-detail" element={<LoanTermDetailPage />} />
        </Routes>
      </Router>
      </RainbowKitProvider>
    </WagmiConfig>
      
  );
};

export default App;
