import React from 'react';
import ReactDOM from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function PrintStickerSheet({ items = [], startOffset = 0, showUnidades = true, showUbicaciones = true }) {
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
 <div className="print-only" id="print-labels-portal">
 {pages.map((pageCells, pageIndex) => (
 <div
 key={pageIndex}
 style={{
 width: '21.6cm',
 height: '27.9cm',
 paddingTop: '1.5cm',
 paddingBottom: '1.5cm',
 paddingLeft: '2.5mm',
 paddingRight: '3.5mm',
 display: 'grid',
 gridTemplateColumns: 'repeat(3, 6.65cm)',
 gridTemplateRows: 'repeat(10, 2.5cm)',
 columnGap: '0.45cm',
 rowGap: '0cm',
 pageBreakAfter: 'always',
 boxSizing: 'border-box',
 backgroundColor: 'white' // Ensure white bg even if print settings vary
 }}
 >
 {pageCells.map((bien, cellIndex) => (
 <div
 key={cellIndex}
 style={{
 width: '6.65cm',
 height: '2.5cm',
 boxSizing: 'border-box',
 overflow: 'hidden',
 display: 'flex',
 alignItems: 'center',
 padding: '2.5mm 3.5mm', // Margen de seguridad respecto al corte de la etiqueta
 gap: '3mm',
 }}
 >
 {bien ? (() => {
                    const claveUnidad = String(
                      bien.claveUnidadRef ||
                      bien.clave_unidad_ref ||
                      bien.unidad?.clave ||
                      bien.originalNode?.clave_unidad_ref ||
                      bien.originalNode?.unidad?.clave ||
                      ''
                    ).trim();
                    const esDelegacion = claveUnidad === '199001';
                    const textoUnidad = bien.unidadFisica || bien.unidad?.desc_corta || bien.unidad?.descripcion || bien.originalNode?.unidad?.desc_corta || bien.originalNode?.unidad?.descripcion || '';
                    const mostrarUnidad = showUnidades && !esDelegacion && Boolean(textoUnidad && textoUnidad !== 'Sin Unidad');
                    const mostrarUbicacion = showUbicaciones;

                    const hasBoth = mostrarUnidad && mostrarUbicacion;
                    const hasOnlyOne = (mostrarUnidad && !mostrarUbicacion) || (!mostrarUnidad && mostrarUbicacion);
                    const hasNeither = !mostrarUnidad && !mostrarUbicacion;

                    const fontSizeSerieInv = hasBoth ? '7.5pt' : hasOnlyOne ? '8.5pt' : '9.5pt';

                    return (
                      <>
                        <QRCodeSVG 
                          value={bien.qrHash || bien.numSerie || String(bien.id_bien)} 
                          size={64} 
                          level="H" 
                          includeMargin={false} 
                        />
                        <div style={{ flex: 1, minWidth: 0, fontSize: '8pt', lineHeight: 1.25, fontFamily: 'sans-serif', color: 'black', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          {mostrarUnidad && (
                            <div style={{ 
                              fontWeight: 'bold', 
                              fontSize: '8.5pt', 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginBottom: mostrarUbicacion ? '1px' : '3px',
                              borderBottom: '1.5px solid #000',
                              paddingBottom: '1px'
                            }}>
                              {textoUnidad}
                            </div>
                          )}
                          {mostrarUbicacion && (
                            <div style={{ 
                              fontWeight: mostrarUnidad ? '600' : 'bold', 
                              fontSize: mostrarUnidad ? '8pt' : '9pt', 
                              display: '-webkit-box',
                              WebkitLineClamp: mostrarUnidad ? 1 : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              marginBottom: '2px'
                            }}>
                              {bien.ubicacion || 'Sin Ubicación'}
                            </div>
                          )}
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: fontSizeSerieInv, fontWeight: hasNeither ? '600' : 'normal', marginTop: hasNeither ? '1px' : '0' }}>
                            S/N: {bien.numSerie && bien.numSerie !== 'N/D' ? bien.numSerie : 'N/A'}
                          </div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: fontSizeSerieInv, fontWeight: hasNeither ? '600' : 'normal' }}>
                            Inv: {bien.numInv && bien.numInv !== 'N/D' ? bien.numInv : 'N/A'}
                          </div>
                        </div>
                      </>
                    );
                  })() : null}
 </div>
 ))}
 </div>
 ))}
 </div>,
 document.body
 );
}
