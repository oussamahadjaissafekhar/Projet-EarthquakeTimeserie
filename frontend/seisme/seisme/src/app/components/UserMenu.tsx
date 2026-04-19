import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";

export default function UserMenu({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <button
          className="flex items-center space-x-2 focus:outline-none"
          onClick={() => setOpen(!open)}
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white overflow-hidden">
            {user.profile_pic && !imageError ? (
              <img
                src={user.profile_pic}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <FontAwesomeIcon icon={faUser} />
            )}
          </div>
          <span className="hidden md:inline text-sm">
            {user.first_name + " " + user.last_name}
          </span>
        </button>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md z-50">
            <button
              onClick={() => router.push("/profile")}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}