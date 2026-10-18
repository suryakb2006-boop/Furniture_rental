import { Link } from 'react-router-dom';
import { Couch } from '@phosphor-icons/react';

export default function Footer() {
  return (
    <footer className="site-footer mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink"><Couch size={18} weight="bold" /></span>
            RentRoom
          </Link>
          <p className="max-w-xs text-sm text-muted">Short-term furniture rental for homes, offices and events. Delivered, assembled and picked up.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Rent</span>
          <Link className="text-muted hover:text-ink" to="/browse?use=Home">For homes</Link>
          <Link className="text-muted hover:text-ink" to="/browse?use=Office">For offices</Link>
          <Link className="text-muted hover:text-ink" to="/browse?use=Event">For events</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Your account</span>
          <Link className="text-muted hover:text-ink" to="/cart">Cart</Link>
          <Link className="text-muted hover:text-ink" to="/bookings">My bookings</Link>
          <Link className="text-muted hover:text-ink" to="/admin">Admin console</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Contact</span>
          <span className="text-muted">+91 44 4862 1937</span>
          <span className="text-muted">hello@rentroom.in</span>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6">© {new Date().getFullYear()} RentRoom. Prototype built for a hackathon. Payments are simulated.</p>
      </div>
    </footer>
  );
}
