"use client";

interface UserProfileProps {
  userName?: string;
  userRole?: string;
}

export default function UserProfile({
  userName = "Abhinav",
  userRole = "Pro Member",
}: UserProfileProps) {
  return (
    <div className="hidden lg:block fixed right-0 bottom-6 left-52 px-6">
      <div className="max-w-7xl ml-auto w-64">
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-full shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-black truncate">{userName}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
