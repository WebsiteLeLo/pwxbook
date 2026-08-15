import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageZoomProps {
  src: string;
  alt?: string;
}

export const ImageZoom: React.FC<ImageZoomProps> = ({ src, alt = "Content" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        style={{ position: 'relative', display: 'inline-block', cursor: 'zoom-in', maxWidth: '100%' }}
        onClick={() => setIsOpen(true)}
      >
        <img 
          src={src} 
          alt={alt} 
          style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px' }} 
        />
        <div style={{ 
          position: 'absolute', 
          bottom: '0.5rem', 
          right: '0.5rem', 
          background: 'rgba(0,0,0,0.6)', 
          color: 'white', 
          padding: '0.35rem', 
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <ZoomIn size={16} />
        </div>
      </div>

      {isOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: '#ffffff', 
            zIndex: 999999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem' 
          }}
          onClick={() => setIsOpen(false)}
        >
          <button 
            style={{ 
              position: 'absolute', 
              top: '1rem', 
              right: '1rem', 
              background: 'rgba(0,0,0,0.05)', 
              color: 'black',
              border: 'none', 
              borderRadius: '50%', 
              padding: '0.5rem', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
          >
            <X size={24} />
          </button>
          
          <img 
            src={src} 
            alt={alt} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain', 
              cursor: 'zoom-out'
            }} 
            onClick={(e) => {
              e.stopPropagation(); // allow clicking the image without closing if we wanted to add pan/zoom later, but for now clicking closes too
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </>
  );
};
