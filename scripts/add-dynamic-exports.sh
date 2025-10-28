#!/bin/bash

# Add "export const dynamic = 'force-dynamic'" to all API route files
# This fixes Next.js static rendering errors for routes using headers/searchParams

API_DIR="/Users/xoxo/Downloads/epsilonschedulingmain/app/api"

find "$API_DIR" -name "route.ts" | while read -r file; do
  # Check if file already has dynamic export
  if ! grep -q "export const dynamic" "$file"; then
    echo "Adding dynamic export to: $file"
    
    # Add after imports, before first export/function
    # Create temp file with dynamic export at top
    {
      echo "export const dynamic = 'force-dynamic'"
      echo ""
      cat "$file"
    } > "${file}.tmp"
    
    mv "${file}.tmp" "$file"
  else
    echo "Skipping (already has dynamic export): $file"
  fi
done

echo "✅ Done! All API routes marked as dynamic."
