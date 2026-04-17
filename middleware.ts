import { auth } from "@/lib/auth"

export default auth

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contracts/:path*",
    "/upload/:path*",
    "/ai/:path*",
    "/settings/:path*",
    "/real-estate/:path*",
    "/inbox/:path*",
    "/tasks/:path*",
    "/billing/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
}
