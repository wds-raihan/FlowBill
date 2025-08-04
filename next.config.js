/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for server components
  serverExternalPackages: ["mongoose", "bcryptjs"],

  // Enable experimental features for better performance
  experimental: {
    // Optimize bundle size
    optimizeCss: true,
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile images
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub profile images
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com", // If using Cloudinary
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // If using Unsplash
      },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
      // Cache static assets
      {
        source: "/(.*)\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache API responses appropriately
      {
        source: "/api/analytics/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Redirect root to dashboard for authenticated users
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
        has: [
          {
            type: "cookie",
            key: "next-auth.session-token",
          },
        ],
      },
      // Redirect old paths if any
      {
        source: "/login",
        destination: "/auth/signin",
        permanent: true,
      },
      {
        source: "/register",
        destination: "/auth/signup",
        permanent: true,
      },
    ];
  },

  // Rewrites for cleaner URLs
  async rewrites() {
    return [
      {
        source: "/health",
        destination: "/api/health",
      },
    ];
  },

  // Webpack configuration for optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: "vendor",
            chunks: "all",
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }

    // Ignore certain modules to reduce bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      // Reduce lodash bundle size
      lodash: "lodash-es",
    };

    // Add bundle analyzer in development
    if (!dev && !isServer && process.env.ANALYZE === "true") {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          openAnalyzer: false,
          reportFilename: "bundle-analyzer-report.html",
        })
      );
    }

    return config;
  },

  // Environment variables to expose to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Output configuration for deployment
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  // Enable source maps in production for better debugging
  productionBrowserSourceMaps: false,

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable compression
  compress: true,

  // Typescript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
