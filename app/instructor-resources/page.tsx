"use client";

import { useEffect } from "react";

export default function InstructorResourcesPage() {
  useEffect(() => {
    window.location.replace("https://docs.tayloredinstruction.com/");
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg">Redirecting to Instructor Resources…</p>
        <p className="text-sm mt-2">
          If you are not redirected, visit
          {" "}
          <a
            href="https://docs.tayloredinstruction.com/"
            className="text-blue-600 hover:underline"
          >
            https://docs.tayloredinstruction.com/
          </a>
        </p>
      </div>
    </div>
  );
}
