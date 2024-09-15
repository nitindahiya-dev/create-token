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
import { Web3Storage } from 'web3.storage';

export function InputForm() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Web3.Storage API setup
  const token = 'YOUR_WEB3_STORAGE_TOKEN'; // Add your Web3 Storage API token
  const client = new Web3Storage({ token });

  // State for form inputs
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState(9); // Default to 9
  const [supply, setSupply] = useState(0);
  const [image, setImage] = useState<File | null>(null); // State for image
  const [errorMessage, setErrorMessage] = useState('');

  // Function to handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  // Function to upload image to Web3.Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const imageCid = await client.put([file]); // Uploads the file to IPFS
      const imageUrl = `https://${imageCid}.ipfs.dweb.link/${file.name}`; // Construct the IPFS URL
      return imageUrl; // Returns the IPFS URL of the image
    } catch (error) {
      console.error("Image upload failed:", error);
      return null;
    }
  };

  // Token creation function
  async function createToken() {
    try {
      if (!wallet.connected) {
        setErrorMessage("Wallet not connected!");
        return;
      }

      // Upload the image (if available) and get the URL
      let imageUrl: string = 'https://cdn.100xdevs.com/metadata.json'; // Default fallback URL
      if (image) {
        const uploadedImageUrl = await uploadImage(image);
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        } else {
          setErrorMessage("Image upload failed. Cannot proceed.");
          return;
        }
      }

      const mintKeypair = Keypair.generate();
      const metadata = {
        mint: mintKeypair.publicKey,
        name: name.trim(),
        symbol: symbol.trim(),
        uri: imageUrl, // Uses uploaded image URL or fallback
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
          uri: metadata.uri,  // Uses uploaded image URL
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
                onChange={handleImageUpload}
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
