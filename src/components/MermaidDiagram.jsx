import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Check, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

const MermaidDiagram = ({ chart, id = 'mermaid-chart' }) => {
  const [svg, setSvg] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const containerRef = useRef(null);
  const { showToast } = useApp();

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvg(svg);
        }
      } catch (error) {
        console.error('Mermaid render error', error);
      }
    };

    if (chart) {
      renderChart();
    }

    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  const handleCopyAsImage = async () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) {
      showToast('No se encontró el diagrama para copiar', 'error');
      return;
    }

    setIsCopying(true);
    try {
      // Calculate original dimensions
      let width = svgElement.getAttribute('width');
      let height = svgElement.getAttribute('height');
      const viewBox = svgElement.getAttribute('viewBox');
      
      if (!width || width.includes('%')) {
        width = viewBox ? viewBox.split(' ')[2] : 800;
      }
      if (!height || height.includes('%')) {
        height = viewBox ? viewBox.split(' ')[3] : 600;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Scale up for better resolution (2x)
      const scale = 2;
      canvas.width = parseInt(width) * scale;
      canvas.height = parseInt(height) * scale;
      
      // Draw white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Ensure SVG has a white background (sometimes needed for mermaid)
      const svgClone = svgElement.cloneNode(true);
      svgClone.style.backgroundColor = 'white';
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgClone);
      
      // Encode properly for data URI
      const encodedData = encodeURIComponent(svgData)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
      const dataUri = `data:image/svg+xml;charset=utf-8,${encodedData}`;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              showToast('Imagen copiada al portapapeles', 'success');
              
              // Return UI to normal after 2s
              setTimeout(() => setIsCopying(false), 2000);
            } else {
              throw new Error('Fallo al crear Blob');
            }
          }, 'image/png');
        } catch (clipboardError) {
          console.error('Clipboard error:', clipboardError);
          showToast('Tu navegador no permite copiar imágenes directamente', 'error');
          setIsCopying(false);
        }
      };
      
      img.onerror = (e) => {
        console.error('Image rendering error:', e);
        showToast('Error al procesar el diagrama como imagen', 'error');
        setIsCopying(false);
      };
      
      img.src = dataUri;
    } catch (error) {
      console.error('General copy error:', error);
      showToast('Error al intentar copiar la imagen', 'error');
      setIsCopying(false);
    }
  };

  return (
    <div className="relative group w-full">
      {svg && (
        <button
          onClick={handleCopyAsImage}
          disabled={isCopying}
          className="absolute right-2 top-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all text-xs font-semibold focus:opacity-100 disabled:opacity-100"
          title="Copiar diagrama como imagen PNG"
        >
          {isCopying ? <Check size={14} className="text-green-600" /> : <ImageIcon size={14} />}
          {isCopying ? 'Copiado!' : 'Copiar Imagen'}
        </button>
      )}
      <div 
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }} 
        className="flex justify-center w-full [&>svg]:max-w-full [&>svg]:h-auto" 
      />
    </div>
  );
};

export default MermaidDiagram;
