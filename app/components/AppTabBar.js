"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Shift" },
  { href: "/context", label: "ภูติ" },
  { href: "/preview", label: "Preview" },
  { href: "/plans", label: "Plans" },
  { href: "/progress", label: "Progress" }
];

function getTabClassName({ active, disabled }) {
  return [
    "app-tabbar__item",
    active ? "app-tabbar__item--active" : "",
    disabled ? "app-tabbar__item--disabled" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export default function AppTabBar({ beforeNavigate }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="app-tabbar">
      <div className="app-tabbar__row">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={getTabClassName({ active, disabled: false })}
              onClick={(event) => {
                if (beforeNavigate && beforeNavigate(tab.href) === false) {
                  event.preventDefault();
                }
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
