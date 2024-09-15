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
  const [errorMessage, setErrorMessage] = useState('');

  // Token creation function
  async function createToken() {
    try {
      if (!wallet.connected) {
        setErrorMessage("Wallet not connected!");
        return;
      }

      // Default URL or you can handle image URL if needed
      const imageUrl = 'https://cdn.100xdevs.com/metadata.json'; // Default fallback URL

      const mintKeypair = Keypair.generate();
      const metadata = {
        mint: mintKeypair.publicKey,
        name: name.trim(),
        symbol: symbol.trim(),
        uri: imageUrl, // Uses default fallback URL
        additionalMetadata: [],
      };

      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const metadataLen = pack(metadata).length;

      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey!,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
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
          uri: metadata.uri,  // Uses default fallback URL
          mintAuthority: wallet.publicKey!,
          updateAuthority: wallet.publicKey!,
        })
      );

      transaction.feePayer = wallet.publicKey!;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.partialSign(mintKeypair);

      // Send first transaction (mint creation)
      await wallet.sendTransaction(transaction, connection);
      console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);

      const associatedToken = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        wallet.publicKey!,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

      console.log(associatedToken.toBase58());

      // Create associated token account
      const transaction2 = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey!,
          associatedToken,
          wallet.publicKey!,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
      );

      await wallet.sendTransaction(transaction2, connection);

      // Mint tokens
      const transaction3 = new Transaction().add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedToken,
          wallet.publicKey!,
          supply,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      await wallet.sendTransaction(transaction3, connection);

      console.log("Minted!");
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
            <div className="flex flex-col space-y-1.5 relative">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Images :
              </Label>
              <Input
                type="file"
                className="h-12 border-0 cursor-pointer text-white"
                placeholder="Image Upload"
              />
              <p className="text-white text-sm absolute bottom-[-25px]">
                <span className="text-red-600 font-extrabold">*</span> Most meme coins use a square 1000x1000 logo
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
