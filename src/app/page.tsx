"use client"
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import Heading from "@/components/Heading";
import { InputForm } from "@/components/InputForm";

export default function Home() {
  // Setting up the connection and wallets
  const network = clusterApiUrl('devnet'); // You can change 'devnet' to 'mainnet-beta' or 'testnet'

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="absolute top-5 right-5">
            <WalletMultiButton />
          </div>
          <div className="flex min-h-screen flex-col gap-35 items-center justify-center">
            <main className="border m-auto rounded-xl p-10">
              <Heading />
              <InputForm />
              <div className="mt-4">
              </div>
            </main>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
