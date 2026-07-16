/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This dashboard is a fully client-rendered app behind auth (no SEO need),
  // so we keep data fetching in client components through the central axios
  // client — which is also what makes the mock/real switch invisible to UI.
};
export default nextConfig;
