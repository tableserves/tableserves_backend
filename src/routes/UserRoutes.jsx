import React from 'react';
import { Outlet } from 'react-router-dom';
import UserLayout from '../components/user/UserLayout';

const UserRoutes = () => {
  return (
    <UserLayout>
      <Outlet />
    </UserLayout>
  );
};

export default UserRoutes;