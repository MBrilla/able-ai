import FcmProvider from "@/lib/firebase/fcm/FcmProvider";
import { ProtectedRoute } from "@/utils/ProtectedRoute";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <ProtectedRoute>
         <FcmProvider>
            {children}
         </FcmProvider>
      </ProtectedRoute>
    </div>
  );
}
