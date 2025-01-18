import { SignIn } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Sign In - ChatGenius',
  description: 'Sign in to your ChatGenius account',
  robots: 'noindex, nofollow',
};

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-indigo-500 hover:bg-indigo-600',
            footerActionLink: 'text-indigo-500 hover:text-indigo-600'
          }
        }}
      />
    </div>
  );
} 