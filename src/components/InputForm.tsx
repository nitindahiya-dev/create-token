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
                fromPubkey: wallet.publicKey!,  // Wallet signs here
                newAccountPubkey: mintKeypair.publicKey,  // MintKeypair is used for the new account
                space: mintLen,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            })
        );

        // Set feePayer and blockhash
        createMintTx.feePayer = wallet.publicKey!;
        createMintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // Sign only with mintKeypair
        createMintTx.partialSign(mintKeypair);

        // Wallet sends the transaction (it will sign during send)
        await wallet.sendTransaction(createMintTx, connection);
        console.log(`Token mint account created at ${mintKeypair.publicKey.toBase58()}`);

        // Initialize the mint and metadata pointer
        const initializeMintTx = new Transaction().add(
            createInitializeMetadataPointerInstruction(
                mintKeypair.publicKey,  // MintKeypair for mint account
                wallet.publicKey!,  // Wallet for authority
                mintKeypair.publicKey,
                TOKEN_2022_PROGRAM_ID
            ),
            createInitializeMintInstruction(
                mintKeypair.publicKey,  // MintKeypair for the mint
                decimals,
                wallet.publicKey!,  // Wallet signs for mint authority
                null,
                TOKEN_2022_PROGRAM_ID
            ),
            createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                mint: mintKeypair.publicKey,  // MintKeypair
                metadata: mintKeypair.publicKey,  // MintKeypair
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                mintAuthority: wallet.publicKey!,  // Wallet is mint authority
                updateAuthority: wallet.publicKey!,  // Wallet is update authority
            })
        );

        initializeMintTx.feePayer = wallet.publicKey!;
        initializeMintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // Sign only with mintKeypair
        initializeMintTx.partialSign(mintKeypair);

        // Wallet sends and signs the transaction
        await wallet.sendTransaction(initializeMintTx, connection);
        console.log("Mint initialized");

        // Create the associated token account
        const associatedToken = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,  // Token mint
            wallet.publicKey!,  // Wallet for the owner
            false,
            TOKEN_2022_PROGRAM_ID
        );
        const createTokenAccountTx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey!,  // Wallet signs for its account
                associatedToken,
                wallet.publicKey!,  // Wallet owns the token account
                mintKeypair.publicKey,  // Mint of the token
                TOKEN_2022_PROGRAM_ID
            )
        );

        createTokenAccountTx.feePayer = wallet.publicKey!;
        createTokenAccountTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // Wallet sends and signs the transaction
        await wallet.sendTransaction(createTokenAccountTx, connection);
        console.log(`Associated token account created at ${associatedToken.toBase58()}`);

        // Mint tokens to the associated token account
        const mintTokensTx = new Transaction().add(
            createMintToInstruction(
                mintKeypair.publicKey,  // Mint
                associatedToken,  // Associated token account
                wallet.publicKey!,  // Wallet signs to mint the tokens
                supply,
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );

        mintTokensTx.feePayer = wallet.publicKey!;
        mintTokensTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // Wallet sends and signs the transaction
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
        <Button
          className="h-12 px-12 text-white bg-gray-700 hover:bg-gray-800"
          onClick={createToken}
        >
          Create Token
        </Button>
      </CardFooter>
    </Card>
  );
}
