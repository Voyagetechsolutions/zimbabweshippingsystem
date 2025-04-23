
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Home as HomeComponent } from '@/components/Home';

const Home = () => {
  return (
    <>
      <Navbar />
      <HomeComponent />
      <Footer />
    </>
  );
};

export default Home;
