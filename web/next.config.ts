import path from 'node:path';
import type { NextConfig } from 'next';

// The app imports ../design and ../shared, so the repo root is the build root.
const repoRoot = path.join(__dirname, '..');

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
