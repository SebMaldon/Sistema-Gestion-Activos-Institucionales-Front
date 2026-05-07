import React from 'react';
import ReactDOM from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function PrintStickerSheet({ items = [], startOffset = 0 }) {
  // Combine offsets and items into a single array of cells
  const cells = [
    ...Array(startOffset).fill(null),
    ...items
  ];

  // Group cells into pages of 30
  const pages = [];
  for (let i = 0; i < cells.length; i += 30) {
    pages.push(cells.slice(i, i + 30));
  }

  if (pages.length === 0) return null;

  return ReactDOM.createPortal(
    <div className="print-only">
      {pages.map((pageCells, pageIndex) => (
        <div
          key={pageIndex}
          style={{
            width: '8.5in',
            height: '11in',
            paddingTop: '0.5in',
            paddingBottom: '0.5in',
            paddingLeft: '0.1875in',
            paddingRight: '0.1875in',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 2.625in)',
            gridTemplateRows: 'repeat(10, 1in)',
            columnGap: '0.125in',
            rowGap: '0in',
            pageBreakAfter: 'always',
            boxSizing: 'border-box',
            backgroundColor: 'white' // Ensure white bg even if print settings vary
          }}
        >
          {pageCells.map((bien, cellIndex) => (
            <div
              key={cellIndex}
              style={{
                width: '2.625in',
                height: '1in',
                boxSizing: 'border-box',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                padding: '0.05in 0.1in', // Slight padding inside the label
                gap: '0.1in',
              }}
            >
              {bien ? (
                <>
                  <QRCodeSVG 
                    value={bien.qrHash || bien.numSerie || String(bien.id_bien)} 
                    size={72} 
                    level="H" 
                    includeMargin={false} 
                  />
                  <div style={{ flex: 1, minWidth: 0, fontSize: '8pt', lineHeight: 1.2, fontFamily: 'sans-serif', color: 'black' }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '9pt', 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      marginBottom: '2px'
                    }}>
                      {bien.ubicacion || 'Sin Ubicación'}
                    </div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      S/N: {bien.numSerie && bien.numSerie !== 'N/D' ? bien.numSerie : 'N/A'}
                    </div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Inv: {bien.numInv && bien.numInv !== 'N/D' ? bien.numInv : 'N/A'}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}
