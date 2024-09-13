import Heading from "@/components/Heading";
import { InputForm } from "@/components/InputForm";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col gap-35   items-center justify-center">
      <main className=" border m-auto rounded-xl p-10">
      <Heading />
      <InputForm />
      </main>
    </div>
  );
}
