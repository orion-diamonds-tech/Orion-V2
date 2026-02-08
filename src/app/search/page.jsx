"use client";

import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
