"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  const routes = [
    { path: "/", label: "Home" },
    { path: "/template-provider", label: "Template Provider" },
    { path: "/template-editor", label: "Template Editor" },
    { path: "/brand-provider", label: "Brand Provider" },
    { path: "/brand-editor", label: "Brand Editor" },
  ];

  return (
    <nav className="mb-6">
      <ul className="flex flex-wrap gap-4 justify-center p-4 bg-gray-100 rounded-md">
        {routes.map((route) => (
          <li key={route.path}>
            <Link
              href={route.path}
              className={`px-4 py-2 rounded-md ${
                pathname === route.path
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-200"
              }`}
            >
              {route.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
