# TableServe

A modern QR-based restaurant ordering system built with React, Redux Toolkit, and Tailwind CSS.

## Features

- **Marketing Website**: Landing page with services, about, and contact sections
- **Admin Panel**: Platform management for administrators
- **Restaurant Owner Dashboard**: Menu management, order tracking, and analytics
- **QR-based Customer Ordering**: Customers scan QR codes to view menus and place orders
- **Real-time Order Tracking**: Live updates on order status
- **Responsive Design**: Works on all devices

## Tech Stack

- **Frontend**: React 19, Redux Toolkit, React Router DOM
- **Styling**: Tailwind CSS, Framer Motion
- **Icons**: React Icons
- **Build Tool**: Vite
- **State Management**: Redux Toolkit

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tableserve
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   ├── owner/          # Restaurant owner components
│   └── user/           # Customer-facing components
├── pages/              # Page components
│   ├── admin/          # Admin dashboard pages
│   ├── owner/          # Owner dashboard pages
│   └── user/           # Customer pages
├── routes/             # Route configurations
├── screens/            # Marketing website screens
├── services/           # API services
├── store/              # Redux store and slices
└── assets/             # Static assets
```

## User Roles

1. **Admin**: Platform management, restaurant oversight
2. **Restaurant Owner**: Menu management, order processing
3. **Customer**: QR-based ordering, order tracking

## Environment Variables

- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:3001/api)
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
