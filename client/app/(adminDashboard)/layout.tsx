import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import { MenuProvider } from "@/components/MenuContext";
import Image from "next/image";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MenuProvider>
      <div className="min-h-screen bg-[#F7F7F7]">
        <div className="hidden md:flex h-screen">
          <div className="w-[8%] md:w-[16%] xl:w-[14%] md:px-7">
            <Menu />
          </div>
          <div className="w-[92%] lg:w-[84%] xl:w-[86%] bg-white overflow-scroll flex flex-col">
            <Navbar />
            {children}
          </div>
        </div>
        <div className="md:hidden relative">
          <Menu />
          <Navbar />
          <div className="bg-white">{children}</div>
        </div>
      </div>
    </MenuProvider>
  );
}

