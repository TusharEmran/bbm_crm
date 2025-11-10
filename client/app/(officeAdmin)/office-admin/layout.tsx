import Navbar from "@/components/Navbar";
import OfficeMenu from "@/components/officeAdmin/OfficeMenu";
import OfficeNavbar from "@/components/officeAdmin/OfficeNavbar";
import { MenuProvider as OfficeMenuProvider } from "@/components/officeAdmin/OfficeMenuContext";
import { MenuProvider as AdminMenuProvider } from "@/components/MenuContext";
import PageTransition from "@/components/PageTransition";
import TokenRedirect from "@/components/TokenRedirect";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <AdminMenuProvider>
        <OfficeMenuProvider>
          <div className="min-h-screen bg-[#F7F7F7]">
            <div className="hidden md:flex h-screen">
              <div className="w-[8%] md:w-[16%] xl:w-[14%] md:px-7">
                <OfficeMenu />
              </div>
              <div className="w-[92%] lg:w-[84%] xl:w-[86%] bg-white overflow-scroll flex flex-col">
                <Navbar />
                <TokenRedirect />
                <PageTransition>
                  {children}
                </PageTransition>
              </div>
            </div>
            <div className="md:hidden relative">
              <OfficeMenu />
              <OfficeNavbar />
              <div className="bg-white">
                <TokenRedirect />
                <PageTransition>
                  {children}
                </PageTransition>
              </div>
            </div>
          </div>
        </OfficeMenuProvider>
      </AdminMenuProvider>
  );
}

