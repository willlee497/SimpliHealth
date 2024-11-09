import React from "react";

export default function Loading() {
  return (
    <div className="z-50 absolute top-0 left-0 w-screen h-screen flex justify-center items-center">
      <span className="w-20 h-20 border-8 border-slate-900 border-b-transparent rounded-full inline-block box-border animate-spin"></span>
    </div>
  );
}