import * as React from "react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  TOKEN_2022_PROGRAM_ID,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  ExtensionType,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction
} from "@solana/spl-token";
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';

export function InputForm() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // State for form inputs
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState(9); // Default to 9
  const [supply, setSupply] = useState(0);
  const [imageUrl, setImageUrl] = useState(''); // State for image URL
  const [errorMessage, setErrorMessage] = useState('');

  // Token creation function
  async function createToken() {
    try {
      if (!wallet.connected) {
        setErrorMessage("Wallet not connected!");
        return;
      }

      // Generate a new keypair for the token mint
      const mintKeypair = Keypair.generate();
      const metadata = {
        mint: mintKeypair.publicKey,
        name: name.trim(),
        symbol: symbol.trim(),
        uri: imageUrl || 'https://cdn.100xdevs.com/metadata.json',
        additionalMetadata: [],
      };

      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const metadataLen = pack(metadata).length;
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

      // Create the mint account transaction
      const createMintTx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey!,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );

      createMintTx.feePayer = wallet.publicKey!;
      createMintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Sign with both the wallet and mint keypair
      createMintTx.sign(mintKeypair);
      await wallet.sendTransaction(createMintTx, connection, { signers: [mintKeypair] });
      console.log(`Token mint account created at ${mintKeypair.publicKey.toBase58()}`);

      // Initialize the mint and metadata pointer
      const initializeMintTx = new Transaction().add(
        createInitializeMetadataPointerInstruction(
          mintKeypair.publicKey,
          wallet.publicKey!,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          wallet.publicKey!,
          null,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          mint: mintKeypair.publicKey,
          metadata: mintKeypair.publicKey,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          mintAuthority: wallet.publicKey!,
          updateAuthority: wallet.publicKey!,
        })
      );

      initializeMintTx.feePayer = wallet.publicKey!;
      initializeMintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Sign with both the wallet and mint keypair
      initializeMintTx.sign(mintKeypair);
      await wallet.sendTransaction(initializeMintTx, connection, { signers: [mintKeypair] });
      console.log("Mint initialized");

      // Create the associated token account
      const associatedToken = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        wallet.publicKey!,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      const createTokenAccountTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey!,
          associatedToken,
          wallet.publicKey!,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );

      createTokenAccountTx.feePayer = wallet.publicKey!;
      createTokenAccountTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      await wallet.sendTransaction(createTokenAccountTx, connection);
      console.log(`Associated token account created at ${associatedToken.toBase58()}`);

      // Mint tokens
      const mintTokensTx = new Transaction().add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedToken,
          wallet.publicKey!,
          supply,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      mintTokensTx.feePayer = wallet.publicKey!;
      mintTokensTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      await wallet.sendTransaction(mintTokensTx, connection);
      console.log("Tokens minted!");

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error during token creation:", error.message);
        setErrorMessage(`Transaction failed: ${error.message}`);
      } else {
        console.error("Unknown error occurred:", error);
        setErrorMessage("An unknown error occurred.");
      }
    }
  }

  return (
    <Card className="min-w-6xl bg-transparent">
      <CardContent>
        <form>
          <div className="grid grid-cols-2 items-center gap-10">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Name :
              </Label>
              <Input
                className="h-12 text-white"
                placeholder="Put the name of your Token"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Symbol :
              </Label>
              <Input
                className="h-12 text-white"
                placeholder="Put the symbol of your Token"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Decimals :
              </Label>
              <Input
                type="number"
                className="h-12 text-white"
                placeholder="0"
                value={decimals}
                onChange={(e) => setDecimals(parseInt(e.target.value))}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Supply :
              </Label>
              <Input
                type="number"
                className="h-12 text-white"
                placeholder="0"
                value={supply}
                onChange={(e) => setSupply(parseInt(e.target.value))}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Image URL :
              </Label>
              <Input
                className="h-12 text-white"
                placeholder="Enter image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-white text-sm">
                <span className="text-red-600 font-extrabold">*</span> Enter a valid image URL
              </p>
            </div>
          </div>
          {errorMessage && (
            <p className="text-red-600 mt-2">{errorMessage}</p>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex items-center justify-center">
        <Button variant={"secondary"} className="w-[200px] text-xl" onClick={createToken}>
          Create Token
        </Button>
      </CardFooter>
    </Card>
  );
}