import React from 'react';

const Square = ({ color, piece, isSelected, onSquareClick }) => {
  // Couleur de fond : si sélectionnée, utiliser une couleur différente
  const backgroundColor = isSelected ? 'yellow' : color;

  return (
    <div
      onClick={onSquareClick}
      style={{
        width: '50px',
        height: '50px',
        backgroundColor,
        border: '1px solid #000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '30px', // Taille du caractère Unicode
        cursor: 'pointer', // Curseur pointeur pour indiquer que c'est cliquable
      }}
    >
      {piece}
    </div>
  );
};

export default Square;