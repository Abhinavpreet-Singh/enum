"use client";

import Image from "next/image";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { useContext, useEffect, useState, type MouseEvent } from "react";
import { useTheme } from "@/providers/theme-provider";
import { Menu, Moon, Sun, X } from "lucide-react";
import { AuthContext } from "@/providers/AuthProvider";

function ThemeButton() {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-black dark:text-white dark:hover:border-gray-500 dark:hover:bg-gray-900 cursor-pointer"
    >
      <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
    </button>
  );
}

function ProfileTrigger({
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  profileAvatar,
  profileName,
}: {
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileAvatar: string | null;
  profileName: string | null;
}) {
  return (
    <button
      type="button"
      onClick={() => setIsProfileMenuOpen((open) => !open)}
      aria-label={
        isProfileMenuOpen ? "Close profile menu" : "Open profile menu"
      }
      aria-expanded={isProfileMenuOpen}
      title={profileName || "Profile"}
      className="group flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm active:scale-95 dark:border-gray-700 dark:bg-black dark:hover:border-gray-500"
    >
      {profileAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileAvatar}
          alt="Profile avatar"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-gray-800 to-black text-[10px] font-bold tracking-[0.16em] text-white dark:from-gray-700 dark:to-gray-950">
          {(profileName || "G")
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("")}
        </span>
      )}
    </button>
  );
}

export default function Header() {
  const isAuthenticated = useAuth();
  const authCtx = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("userAvatar") : null,
  );
  const [profileName, setProfileName] = useState<string | null>(() =>
    null,
  );

  const navLinks = [
    { href: "/#how-it-works", label: "HOW IT WORKS" },
    { href: "/#features", label: "FEATURES" },
    { href: "/#simulations", label: "SIMULATIONS" },
    { href: "/#benefits", label: "BENEFITS" },
  ];

  const handleHomeAnchorClick = (
    e: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (typeof window === "undefined") return;
    const isHome = window.location.pathname === "/";
    const hash = href.split("#")[1];
    if (!isHome || !hash) return;

    const section = document.getElementById(hash);
    if (!section) return;

    e.preventDefault();
    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.history.replaceState({}, "", href);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const closeProfileMenu = () => setIsProfileMenuOpen(false);

  useEffect(() => {
    const syncAvatar = () =>
      setProfileAvatar(localStorage.getItem("userAvatar"));

    window.addEventListener("storage", syncAvatar);
    window.addEventListener("userAvatarChanged", syncAvatar);

    // Fetch profile using the global axios instance (interceptor injects token from memory)
    axios
      .get(`${proxy}/api/v1/users/profile`, { withCredentials: true })
      .then((res) => {
        const data = res?.data?.data;
        if (!data) return;
        if (data.avatar) {
          localStorage.setItem("userAvatar", data.avatar);
          setProfileAvatar(data.avatar);
        }
        if (data.displayName) {
          setProfileName(data.displayName);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener("userAvatarChanged", syncAvatar);
    };
  }, []);

  useEffect(() => {
    const user = authCtx?.user;
    const name =
      (typeof user?.displayName === "string" && user.displayName) ||
      (typeof user?.username === "string" && user.username) ||
      (typeof user?.name === "string" && user.name) ||
      null;
    setProfileName(name);
  }, [authCtx?.user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await axios.post(
        `${proxy}/api/v1/auth/logout`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-gray-600 dark:bg-black/95 px-4 md:px-6">
      <div className="mx-auto max-w-7xl py-3 md:py-4">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-3">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 items-center gap-1 text-black transition-opacity hover:opacity-80 dark:text-white"
          >
            <Image
              src="/lgogo.png"
              alt="Enum logo"
              width={34}
              height={34}
              className="h-8 w-8 shrink-0 -translate-y-0.5 object-contain md:h-9 md:w-9"
              priority
            />
            <span
              className="flex items-center select-none text-[24px] font-bold leading-none md:text-[26px]"
              style={{ letterSpacing: "-0.085em", transform: "scaleX(0.9)" }}
            >
              <span>E</span>
              <span className="font-medium italic">N</span>
              <span>U</span>
              <span>M</span>
            </span>
          </Link>

          <nav className="hidden items-center justify-center space-x-10 md:flex lg:space-x-12">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={(e) => handleHomeAnchorClick(e, href)}
                className="font-mono text-xs font-medium tracking-[0.03em] text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2 md:gap-3">
            <ThemeButton />

            {!isAuthenticated ? (
              <div className="hidden items-center gap-3 md:flex md:gap-4">
                <Link
                  href="/login"
                  className="hidden rounded-full border border-black/90 bg-black px-5 py-2 font-mono text-xs tracking-[0.18em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:bg-gray-900 dark:border-white/90 dark:bg-white dark:text-black dark:hover:bg-gray-100 sm:inline cursor-pointer"
                >
                  LOGIN
                </Link>
              </div>
            ) : (
              <div className="relative hidden items-center gap-3 md:flex">
                <ProfileTrigger
                  isProfileMenuOpen={isProfileMenuOpen}
                  setIsProfileMenuOpen={setIsProfileMenuOpen}
                  profileAvatar={profileAvatar}
                  profileName={profileName}
                />
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-black/5 dark:border-gray-800 dark:bg-black dark:shadow-black/20">
                    <Link
                      href="/dashboard/profile"
                      onClick={closeProfileMenu}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
                    >
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-black">
                        {profileAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileAvatar}
                            alt="Profile avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-bold tracking-[0.16em] text-gray-800 dark:text-white">
                            {(profileName || "G")
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0]?.toUpperCase())
                              .join("")}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-900 dark:text-white">
                          {profileName || "Profile"}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          View account
                        </span>
                      </span>
                    </Link>
                    <button
                      onClick={async () => {
                        closeProfileMenu();
                        await handleLogout();
                      }}
                      disabled={isLoggingOut}
                      className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70 dark:text-gray-300 dark:hover:bg-gray-900"
                    >
                      <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:border-gray-500 dark:hover:bg-gray-900"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`md:hidden overflow-hidden border-t border-gray-200 bg-white/98 backdrop-blur-md transition-all duration-300 dark:border-gray-800 dark:bg-black/98 ${
            isMobileMenuOpen ? "max-h-128 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-7xl space-y-4 px-3 py-4">
            <nav className="grid gap-2">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={(e) => {
                    closeMobileMenu();
                    handleHomeAnchorClick(e, href);
                  }}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 font-mono text-xs tracking-[0.18em] text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                >
                  <span>{label}</span>
                  <span className="text-base leading-none">→</span>
                </Link>
              ))}
            </nav>

            <div className="grid gap-3">
              {isAuthenticated ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-black">
                  <Link
                    href="/dashboard/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
                  >
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-black">
                      {profileAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profileAvatar}
                          alt="Profile avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] font-bold tracking-[0.16em] text-gray-800 dark:text-white">
                          {(profileName || "G")
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0]?.toUpperCase())
                            .join("")}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900 dark:text-white">
                        {profileName || "Profile"}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        View account
                      </span>
                    </span>
                  </Link>
                  <button
                    onClick={async () => {
                      closeMobileMenu();
                      await handleLogout();
                    }}
                    disabled={isLoggingOut}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70 dark:text-gray-300 dark:hover:bg-gray-900"
                  >
                    <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="rounded-2xl border border-black/90 bg-black px-4 py-3 text-center font-mono text-xs tracking-[0.2em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-white/90 dark:bg-white dark:text-black cursor-pointer"
                >
                  LOGIN
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
