"use client";

import { useEffect } from "react";

/** Activates scroll-snap on the html element for the landing page only.
 *  Removed on unmount, so other pages are unaffected. */
export function ScrollSnapActivator() {
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollSnapType = "y mandatory";
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollSnapType = "";
      html.style.scrollBehavior = "";
    };
  }, []);
  return null;
}
