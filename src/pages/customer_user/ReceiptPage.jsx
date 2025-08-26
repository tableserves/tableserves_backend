
import React from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPrint, FaArrowLeft } from 'react-icons/fa';
import Receipt from '../../components/common/Receipt';

const ReceiptPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  // Find the order from the Redux store
  const order = useSelector((state) => 
    state.order.orders.find((o) => o.id === orderId) || state.order.currentOrder
  );

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500">Order not found!</h1>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          <FaArrowLeft /> Go Back
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="flex justify-between items-center mb-4 print:hidden">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            <FaArrowLeft /> Go Back
          </button>
          <button 
            onClick={handlePrint} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <FaPrint /> Print / Save as PDF
          </button>
        </div>
        <div className="printable-receipt">
          <Receipt orderDetails={order} />
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-receipt, .printable-receipt * {
            visibility: visible;
          }
          .printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptPage;
