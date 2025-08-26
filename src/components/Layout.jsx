import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }) => (
    <div className="bg-primary-bg">
        <Navbar />
        <main>{children}</main>
        <Footer />
    </div>
);

export default Layout;
