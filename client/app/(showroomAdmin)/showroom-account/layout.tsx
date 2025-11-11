import Navbar from "@/components/Navbar";
import ShowroomMenu from "@/components/showroomAdmin/ShowroomMenu";
import ShowroomNavbar from "@/components/showroomAdmin/ShowroomNavbar";
import { MenuProvider as ShowroomMenuProvider } from "@/components/showroomAdmin/ShowroomMenuContext";
import { MenuProvider as AdminMenuProvider } from "@/components/MenuContext";
import PageTransition from "@/components/PageTransition";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminMenuProvider>
      <ShowroomMenuProvider>
        <div className="min-h-screen bg-[#F7F7F7]">
          <div className="hidden md:flex h-screen">
            <div className="w-[8%] md:w-[16%] xl:w-[14%] md:px-7">
              <ShowroomMenu />
            </div>
            <div className="w-[92%] lg:w-[84%] xl:w-[86%] bg-white overflow-scroll flex flex-col">
              <Navbar />
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </div>
          <div className="md:hidden relative">
            <ShowroomMenu />
            <ShowroomNavbar />
            <div className="bg-white">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </div>
        </div>
      </ShowroomMenuProvider>
    </AdminMenuProvider>
  );
}
