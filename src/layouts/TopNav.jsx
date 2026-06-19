import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import MunafaLogo from "../components/MunafaLogo";

const TopNav = ({ onLogout, menuItems }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();

  const handleMenuClick = (path) => {
    console.log("🔄 Navigating to:", path);
    setDropdownOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm p-4 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <Link to="/dashboard" style={{ textDecoration: "none" }}>
          <MunafaLogo size={34} showWordmark />
        </Link>

        <div className="flex gap-3 items-center">
          {/* DROPDOWN MENU */}
          <div className="relative">
            <button
              onClick={() => {
                console.log("☰ Menu clicked, dropdown open:", !dropdownOpen);
                setDropdownOpen(!dropdownOpen);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                dropdownOpen
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ☰ Menu
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {menuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => handleMenuClick(item.to)}
                    className={`block w-full text-left px-4 py-2 text-sm font-semibold transition ${
                      location.pathname === item.to
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-extrabold hover:bg-red-700 shadow-md shadow-red-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
