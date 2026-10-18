import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Confirmation from './pages/Confirmation.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Packs from './pages/Packs.jsx';
import Planner from './pages/Planner.jsx';
import PackDetail from './pages/PackDetail.jsx';
import Invoice from './pages/Invoice.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import { RequireAuth } from './components/AuthShell.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Listings from './pages/admin/Listings.jsx';
import Orders from './pages/admin/Orders.jsx';
import Availability from './pages/admin/Availability.jsx';
import { Button } from './components/ui.jsx';
import { Link } from 'react-router-dom';

function Page({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 28, rotateX: 7, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, rotateX: -4, scale: 0.99 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: '50% 0%' }}
      // Perspective only while animating; at rest the page has no transform, so fixed modals and sticky elements behave normally.
      transformTemplate={(_, generated) => (generated === 'none' || !generated ? 'none' : `perspective(1400px) ${generated}`)}
      className="min-h-[70dvh]"
    >
      {children}
    </motion.main>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold">This page moved out</h1>
      <p className="text-muted">The link may be old or mistyped.</p>
      <Button as={Link} to="/browse">Browse furniture</Button>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const section = location.pathname.startsWith('/admin') ? '/admin' : location.pathname;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ScrollProgress />
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={section}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/browse" element={<Page><Browse /></Page>} />
          <Route path="/item/:id" element={<Page><ItemDetail /></Page>} />
          <Route path="/cart" element={<Page><Cart /></Page>} />
          <Route path="/checkout" element={<Page><RequireAuth><Checkout /></RequireAuth></Page>} />
          <Route path="/order/:code" element={<Page><RequireAuth><Confirmation /></RequireAuth></Page>} />
          <Route path="/bookings" element={<Page><RequireAuth><MyBookings /></RequireAuth></Page>} />
          <Route path="/planner" element={<Page><Planner /></Page>} />
          <Route path="/packs" element={<Page><Packs /></Page>} />
          <Route path="/packs/:id" element={<Page><PackDetail /></Page>} />
          <Route path="/invoice/:code" element={<Page><Invoice /></Page>} />
          <Route path="/wishlist" element={<Page><RequireAuth><Wishlist /></RequireAuth></Page>} />
          <Route path="/login" element={<Page><Login /></Page>} />
          <Route path="/register" element={<Page><Register /></Page>} />
          <Route path="/admin" element={<Page><AdminLayout /></Page>}>
            <Route index element={<Dashboard />} />
            <Route path="listings" element={<Listings />} />
            <Route path="orders" element={<Orders />} />
            <Route path="availability" element={<Availability />} />
          </Route>
          <Route path="*" element={<Page><NotFound /></Page>} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
