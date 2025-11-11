"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMenu } from "@/components/officeAdmin/OfficeMenuContext";
import { X } from "lucide-react";

const menuItems = [
    { icon: "/home.png", href: "/office-admin", label: "Home" },
    { icon: "/customers.png", href: "/office-admin/customers", label: "Customers" },
    { icon: "/reports.png", href: "/office-admin/reports", label: "Reports" },
    { icon: "/feedbacks.png", href: "/office-admin/feedbacks", label: "Feedbacks" },
];

const OfficeMenu = () => {
    const { isOpen, toggle, close } = useMenu();
    const pathname = usePathname();
    const router = useRouter();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    const baseRoot = menuItems[0].href;
    const isActive = (href: string) => {
        if (href === baseRoot) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    return (
        <>

            <div className="hidden md:flex flex-col justify-between items-center h-screen w-[90px] bg-[#F7F7F70] py-4">

                <div className="flex flex-col items-center gap-2">
                    <div />
                    <Image
                        src="/logo.jpeg"
                        alt="logo"
                        width={50}
                        height={50}
                        className="rounded-full object-cover"
                        priority
                    />
                </div>

                <div className="flex flex-col items-center bg-white rounded-full py-6 px-2 gap-5 shadow-sm">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className={`flex items-center justify-center p-2 rounded-lg transition ${isActive(item.href)
                                ? "bg-black text-white"
                                : "hover:bg-gray-100"
                                }`}
                        >
                            <Image src={item.icon} alt={item.label} width={30} height={30} />
                        </Link>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={async () => {
                            try {
                                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                await fetch(`${baseUrl}/api/user/logout`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                }).catch(() => { });
                            } finally {
                                if (typeof window !== 'undefined') localStorage.removeItem('token');
                                router.push('/login');
                            }
                        }}
                    >
                        <Image
                            src="/logout.png"
                            alt="logout"
                            width={28}
                            height={28}
                            className="opacity-70 hover:opacity-100"
                        />
                    </button>
                </div>
            </div>

            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-white/30 backdrop-blur-md z-40"
                    onClick={close}
                ></div>
            )}

            <div
                className={`md:hidden fixed left-0 top-0 h-screen w-64 bg-[#D3DDD7] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >

                <div className="p-6 flex items-center justify-between border-b border-gray-300">
                    <Image
                        src="/logo.jpeg"
                        alt="logo"
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                    />
                    <button
                        onClick={close}
                        className="text-2xl font-bold text-[#3E4C3A]"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col py-6 px-4 gap-2">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            onClick={close}
                            className={`flex items-center gap-4 p-3 rounded-lg transition ${isActive(item.href)
                                ? "bg-black text-white"
                                : "hover:bg-white hover:bg-opacity-30 text-[#3E4C3A]"
                                }`}
                        >
                            <Image src={item.icon} alt={item.label} width={24} height={24} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </div>

                <div className="mt-auto p-6 border-t border-gray-300 flex flex-col gap-4">
                    <button
                        onClick={async () => {
                            close();
                            try {
                                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                await fetch(`${baseUrl}/api/user/logout`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                }).catch(() => { });
                            } finally {
                                if (typeof window !== 'undefined') localStorage.removeItem('token');
                                router.push('/login');
                            }
                        }}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-white hover:bg-opacity-30 transition"
                    >
                        <Image src="/logout.png" alt="logout" width={28} height={28} />
                        <span className="text-[#3E4C3A] font-medium">Logout</span>
                    </button>
                    <div className="flex items-center gap-4 p-3">
                    </div>
                </div>
            </div>
        </>
    );
};

export default OfficeMenu;


