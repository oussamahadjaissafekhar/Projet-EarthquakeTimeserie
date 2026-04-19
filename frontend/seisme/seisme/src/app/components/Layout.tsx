'use client';

import { ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';

import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
config.autoAddCss = false;

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faHome,
  faBox,
  faUsers,
  faUser,
  faChartBar,
  faBarChart,
  faBrain,
  faPieChart,
  faLineChart,
  faClock,
  faSearch,
  faMapPin,
  faMicroscope,
  faShieldAlt,
  faFlask,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import UserMenu from './UserMenu';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const parsedUser = userStr ? JSON.parse(userStr) : null;
      setUser(parsedUser);
      
      // Auto-redirect to login if not authenticated
      if (!parsedUser && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, []);

  // Return a completely blank layout skeleton during the ultra-fast mounting phase to avoid the "Chargement..." flash
  if (!isMounted) {
    return <div className="flex h-screen bg-gray-50"></div>;
  }

  if (!user) {
    return null; // The useEffect redirection handles unauthorized users natively
  }
  return (
    <>
      <Head>
        <title>Dashboard</title>
        <meta name="description" content="Dashboard application" />
      </Head>
      <div className="flex h-screen bg-white">
        {/* Sidebar */}
        <div className="w-64 ps-2 pt-2 pb-2">
          <div className=" bg-gradient-to-r from-blue-500 to-blue-400 shadow-md rounded-2xl flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-center h-16 ">
                <h1 className="text-white text-xl font-bold mb-10 flex items-center justify-center gap-2 pt-12 px-5">
                  <svg className=" h-14 icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path fill="#fff" d="M926.784 480H701.312A192.512 192.512 0 00544 322.688V97.216A416.064 416.064 0 01926.784 480zm0 64A416.064 416.064 0 01544 926.784V701.312A192.512 192.512 0 00701.312 544h225.472zM97.28 544h225.472A192.512 192.512 0 00480 701.312v225.472A416.064 416.064 0 0197.216 544zm0-64A416.064 416.064 0 01480 97.216v225.472A192.512 192.512 0 00322.688 480H97.216z"></path>
                    </g>
                  </svg>
                  <span>Seisme Assist</span>
                </h1>
              </div>
              <nav className="p-4 text-white">
                <SidebarLink href="/" icon={faHome} text="Accueil" />

                <SidebarLink href="/seisms_map" icon={faMapPin} text="Carte des séismes" />

                <SidebarLink href="/stl" icon={faChartBar} text="Décomposition STL" />

                <SidebarLink href="/analysis" icon={faMicroscope} text="Analyse Sismologique" />

                <SidebarLink href="/civil-security" icon={faShieldAlt} text="Sécurité Civile" />

                <SidebarLink href="/ia-lab" icon={faFlask} text="Laboratoire IA" />

                <SidebarLink href="/predict" icon={faBrain} text="Prédiction IA" />
                {user?.is_admin ? (
                  <SidebarLink href="/users" icon={faUsers} text="Utilisateurs" />
                ) : null}
              </nav>
            </div>


            <div className="text-white text-xs text-center p-2 font-bold uppercase tracking-widest opacity-90">
              &copy; {new Date().getFullYear()} Chabane Kelfaoui
            </div>
          </div>
        </div>
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top header */}
          <header className="bg-white shadow-sm z-10">
            <div className="flex items-center justify-between h-16 px-4">
              {/* Search bar */}
              <div className="flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Recherche..."
                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black font-medium"
                  />
                  <div className="absolute left-3 top-2.5 text-black">
                    <FontAwesomeIcon icon={faSearch} />
                  </div>
                </div>
              </div>

              {/* User menu */}
             <UserMenu user={user} />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

type SidebarLinkProps = {
  href: string;
  icon: IconDefinition;
  text: string;
};


const SidebarLink = ({ href, icon, text }: SidebarLinkProps) => (
  <Link href={href} className="flex items-center space-x-2 py-2">
    <FontAwesomeIcon icon={icon} className="w-4 h-4" />
    <span>{text}</span>
  </Link>
);