import React from 'react';

function Digit({ value }) {
 return (
 <span className="relative inline-flex justify-center overflow-hidden">
 {/* Contenedor invisible para dar el ancho y alto correctos */}
 <span className="invisible">{value}</span>
 {/* Columna con los números del 0 al 9 */}
 <span 
 className="absolute left-0 top-0 flex flex-col transition-transform duration-700 ease-in-out" 
 style={{ transform: `translateY(-${value}0%)` }}
 >
 {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
 <span key={i} className="flex items-center justify-center h-full">
 {i}
 </span>
 ))}
 </span>
 </span>
 );
}

export default function AnimatedCounter({ value }) {
 // Formatear el número con comas si es numérico
 const formattedStr = typeof value === 'number' ? value.toLocaleString('en-US') : String(value);
 
 return (
 <span className="inline-flex tabular-nums items-center">
 {formattedStr.split('').map((char, index) => {
 const placeIndex = formattedStr.length - 1 - index;
 if (isNaN(parseInt(char, 10))) {
 return (
 <span key={`char-${placeIndex}`} className="inline-flex items-center">
 {char}
 </span>
 );
 }
 return <Digit key={`digit-${placeIndex}`} value={parseInt(char, 10)} />;
 })}
 </span>
 );
}
