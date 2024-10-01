"use client"
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
  createInitializeMint2Instruction,
} from "@solana/spl-token";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function InputForm() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // State for form inputs
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState<number | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState(""); // State for image URL
  const [errorMessage, setErrorMessage] = useState("");

  // Notification functions
  const notifySuccess = (message: string) => toast.success(message);
  const notifyError = (message: string) => toast.error(message);
  // const notifyInfo = (message: string) => toast.info(message);

  // Token creation function
  async function createToken() {
    try {
      if (!wallet.connected) {
        setErrorMessage("Wallet not connected!");
        return;
      }

      const mintKeypair = Keypair.generate();

      // Calculate minimum balance for mint account rent exemption
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      // Create the transaction to create the mint account
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey!,
          newAccountPubkey: mintKeypair.publicKey,
          space: 82, // Mint account size (82 bytes)
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(
          mintKeypair.publicKey,
          9, // Decimals
          wallet.publicKey!,
          wallet.publicKey!,
          TOKEN_PROGRAM_ID
        )
      );

      transaction.feePayer = wallet.publicKey!;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Partially sign the transaction with the mint keypair
      transaction.partialSign(mintKeypair);

      // Send the transaction
      await wallet.sendTransaction(transaction, connection);

      console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);
      notifySuccess("Token created successfully!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error during token creation:", error.message);
        setErrorMessage(`Transaction failed: ${error.message}`);
      } else {
        console.error("Unknown error occurred:", error);
        setErrorMessage("An unknown error occurred.");
      }
      notifyError(`Error creating token: ${(error as Error).message}`);
    }
  }

  return (
    <Card className="min-w-6xl bg-transparent">
      <CardContent>
        <form>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-5 md:gap-5">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Name:
              </Label>
              <Input
                className="h-12 text-white"
                placeholder="Enter the token name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Symbol:
              </Label>
              <Input
                className="h-12 text-white"
                placeholder="Enter the token symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Supply:
              </Label>
              <Input
                type="number"
                className="h-12 text-white"
                placeholder="Enter the token supply"
                value={supply || ""}
                onChange={(e) => setSupply(parseInt(e.target.value))}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm">
                <span className="text-red-600 mr-1">*</span>Image URL:
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
          {errorMessage && <p className="text-red-600 mt-2">{errorMessage}</p>}
        </form>
      </CardContent>
      <CardFooter className="flex items-center justify-center">
        <Button className="h-12 px-12 text-white bg-gray-700 hover:bg-gray-800" onClick={createToken}>
          Create Token
        </Button>
      </CardFooter>
      <ToastContainer />
    </Card>
  );
}
