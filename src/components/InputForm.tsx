import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InputForm() {
  return (
    <Card className="min-w-6xl bg-transparent">
      <CardContent>
        <form>
          <div className="grid grid-cols-2 items-center gap-10">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm"> <span className="text-red-600 mr-1">*</span>Name :</Label>
              <Input className="h-12 text-white" placeholder="Put the name of your Token" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm"> <span className="text-red-600 mr-1">*</span>Symbol :</Label>
              <Input className="h-12 text-white" placeholder="Put the symbol of your Token" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm"> <span className="text-red-600 mr-1">*</span>Decimals :</Label>
              <Input type="number" className="h-12 text-white" placeholder="0" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm"> <span className="text-red-600 mr-1">*</span>Supply :</Label>
              <Input className="h-12 text-white" placeholder="0" />
            </div>
            <div className="flex flex-col space-y-1.5 relative">
              <Label className="text-white font-bold text-sm"> <span className="text-red-600 mr-1">*</span>Images :</Label>
              <Input type="file" className="h-12 text-white" placeholder="Image Upload" />
              <p className="text-white text-sm absolute bottom-[-25px]">Most meme coins use a sqared 1000x1000 logo</p>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-white font-bold text-sm"> <span className="text-red-600 mr-1">*</span>Descripion :</Label>
              <Input className="h-12 text-white" placeholder="Put the Description of your Description" />
            </div>
            
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex items-center justify-center">
        <Button variant={"secondary"} className="w-[200px] text-xl">Create Token</Button>
      </CardFooter>
    </Card>
  )
}
