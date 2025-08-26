import React from 'react';
import { Outlet } from 'react-router-dom';
import OwnerLayout from '../components/owner/OwnerLayout';

const OwnerRoutes = () => {
  return (
    <OwnerLayout>
      <Outlet />
    </OwnerLayout>
  );
};

export default OwnerRoutes;