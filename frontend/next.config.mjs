// Normalize NODE_ENV for direct `next build` invocations in cached agent workspaces.
// Some environments export NODE_ENV=development globally, which triggers unstable
// prerender behavior in production builds (/_global-error useContext crash).
if (process.argv.includes("build")) {
  process.env.NODE_ENV = "production"
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
        os: false,
        path: false,
        zlib: false,
      };
    }
    return config;
  },
}

export default nextConfig
