import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { ThemeSwitcher } from "./theme-switcher";
import { WalletConnectionButton } from "@/components/wallet/wallet-connection-button";
const menuItems = [
  { name: "Activities", to: "/activities" },
  { name: "Transfer Name", to: "/transfer-name" },
  { name: "Account Abstraction", to: "#link" },
];

export const Header = () => {
  const [menuState, setMenuState] = React.useState(false);

  return (
    <header className="">
      <nav className="fixed z-20 w-full">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0">
            <div className="flex w-full justify-between gap-6 lg:w-auto">
              <Link
                to="/"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                <span className="text-2xl font-bold md:text-3xl">ENS</span>
              </Link>

              <div className="flex items-center justify-center gap-6">
                <div className="lg:hidden">
                  <ThemeSwitcher />
                </div>
                <div className="lg:hidden">
                  <WalletConnectionButton />
                </div>

                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState ? "Close Menu" : "Open Menu"}
                  aria-expanded={menuState}
                  data-state={menuState ? "active" : "closed"}
                  className="relative z-20 block cursor-pointer p-2.5 lg:hidden"
                >
                  {menuState ? (
                    <X className="m-auto size-6 duration-200" />
                  ) : (
                    <Menu className="m-auto size-6 duration-200" />
                  )}
                </button>
              </div>

              <div className="m-auto hidden size-fit lg:block">
                <ul className="flex">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Button asChild variant="ghost" size="lg">
                        <Link to={item.to} className="text-base">
                          <span>{item.name}</span>
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              data-state={menuState ? "active" : "closed"}
              className={`${menuState ? "block" : "hidden"} bg-background mb-6 w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent z-30`}
            >
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        to={item.to}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 lg:gap-6 sm:space-y-0 md:w-fit">
                <div className="hidden lg:block">
                  <WalletConnectionButton />
                </div>
                <div className="hidden lg:block">
                  <ThemeSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
