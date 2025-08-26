import React from 'react';
import { FaCopy, FaCheck, FaDownload, FaQrcode } from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function QrGeneratedCard({
  title,
  imgSrc,
  url,
  copied = false,
  onCopy = () => { },
  onDownload = () => { },

}) {




  return (
    <div className="border border-theme-border rounded-lg p-4 bg-theme-surface hover:shadow-lg transition-all duration-300">
      <div className="text-center mb-3">
        <h3 className="font-fredoka text-theme-text-primary text-lg">
          {title}
        </h3>
      </div>

      <div className="flex justify-center mb-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <img
            src={imgSrc}
            alt={title}
            className="w-32 h-32 md:w-48 md:h-48"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-theme-text-secondary font-raleway break-all bg-theme-bg-secondary p-2 rounded">
          {url}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors flex items-center justify-center space-x-1"
          >
            {copied ? <FaCheck /> : <FaCopy />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={onDownload}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors flex items-center justify-center space-x-1"
          >
            <FaDownload />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}

