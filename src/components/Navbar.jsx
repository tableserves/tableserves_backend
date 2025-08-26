import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const NavLink = ({ to, children, onClick }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`text-sm font-semibold md:text-base transition-colors duration-300 ${isActive ? 'text-accent' : 'text-grey-800 hover:text-accent'}
                }`}
        >
            {children}
        </Link>
    );
};

const MobileNavLink = ({ to, children, onClick }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`block py-2 px-4 text-xl rounded-md transition-colors duration-300 ${isActive ? 'bg-accent text-white' : 'text-gray-800 hover:text-accent'}
                }`}
        >
            {children}
        </Link>
    );
};


const Navbar = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <>
            {/* Navbar */}
            <nav className="bg-white py-4 px-6 flex justify-between items-center shadow-md sticky top-0 z-50">
                {/* Logo */}
                <div className="text-xl md:text-2xl text-accent font-cinzel font-semibold">
                    <Link to="/">TableServe</Link>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex space-x-8 font-raleway items-center">
                    <NavLink to="/tableserve">Home</NavLink>
                    <NavLink to="/tableserve/services">Services</NavLink>
                    <NavLink to="/tableserve/about">About</NavLink>
                    <NavLink to="/tableserve/pricing">Pricing</NavLink>
                    <NavLink to="/tableserve/contact">Contact Us</NavLink>
                </div>

                {/* Auth Buttons (visible on all sizes) */}
                <div className="hidden md:flex items-center space-x-3 font-raleway">
                    <Link
                        to="/tableserve/signup"
                        className="border border-accent text-accent px-5 py-2 rounded-full font-semibold hover:bg-accent/10 transition-all duration-300"
                    >
                        Sign up
                    </Link>
                    <Link
                        to="/tableserve/login"
                        className="bg-accent px-6 py-2 rounded-full text-white font-semibold hover:bg-accent/90 transition-all duration-300"
                    >
                        Login
                    </Link>
                </div>

                {/* Mobile Menu Icon (only shown on small screens) */}
                <button
                    onClick={() => setOpen(true)}
                    className="md:hidden text-accent text-2xl"
                >
                    <FaBars />
                </button>
            </nav>

            {/* Mobile Drawer */}
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <span className="text-lg font-fredoka text-accent">Menu</span>
                    <button onClick={() => setOpen(false)}>
                        <FaTimes className="text-gray-700" size={24} />
                    </button>
                </div>

                {/* Mobile Nav Links */}
                <nav className="flex flex-col px-4 py-6 space-y-2 text-xl font-raleway">
                    <MobileNavLink to="/tableserve" onClick={() => setOpen(false)}>Home</MobileNavLink>
                    <MobileNavLink to="/tableserve/services" onClick={() => setOpen(false)}>Services</MobileNavLink>
                    <MobileNavLink to="/tableserve/about" onClick={() => setOpen(false)}>About</MobileNavLink>
                    <MobileNavLink to="/tableserve/pricing" onClick={() => setOpen(false)}>Pricing</MobileNavLink>
                    <MobileNavLink to="/tableserve/contact" onClick={() => setOpen(false)}>Contact Us</MobileNavLink>
                    <div className="pt-6 border-t mt-4">
                        <div className="flex gap-2">
                            <Link
                                to="/tableserve/signup"
                                onClick={() => setOpen(false)}
                                className="flex-1 border border-accent text-accent p-3 rounded-full font-semibold hover:bg-accent/10 transition-all duration-300 text-center cursor-pointer"
                                style={{ pointerEvents: 'auto' }}
                            >
                                Sign up
                            </Link>
                            <Link
                                to="/tableserve/login"
                                onClick={() => setOpen(false)}
                                className="flex-1 bg-accent p-3 rounded-full text-white font-semibold hover:bg-accent/90 transition-all duration-300 text-center cursor-pointer"
                                style={{ pointerEvents: 'auto' }}
                            >
                                Login
                            </Link>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    );
};

export default Navbar;
