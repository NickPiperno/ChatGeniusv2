import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <SignUp 
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