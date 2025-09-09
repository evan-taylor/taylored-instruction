"use client";

import { useEffect } from "react";

export default function InstructorResourcesPage() {
  useEffect(() => {
    window.location.replace("https://docs.tayloredinstruction.com/");
  }, []);

  return (
    <div className="container mx-auto flex items-center justify-center px-4 py-8">
      <div className="text-center">
        <p className="text-lg">Redirecting to Instructor Resources…</p>
        <p className="mt-2 text-sm">
          If you are not redirected, visit{" "}
          <a
            className="text-blue-600 hover:underline"
            href="https://docs.tayloredinstruction.com/"
          >
            https://docs.tayloredinstruction.com/
          </a>
        </p>
      </div>
    </div>
  );
}
