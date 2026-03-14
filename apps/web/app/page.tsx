import { redirect } from 'next/navigation';

// Root route: always redirect to dashboard (AuthProvider handles unauthenticated redirect to /login)
export default function RootPage() {
  redirect('/dashboard');
}
