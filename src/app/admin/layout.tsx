import AppLayout from '@/components/AppLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        /* Force admin main content to full width with no side padding */
        .main-content {
          padding-left: 0 !important;
          padding-right: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          overflow-x: hidden !important;
        }
        #page-admin {
          width: 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
      `}</style>
      <AppLayout>{children}</AppLayout>
    </>
  );
}
