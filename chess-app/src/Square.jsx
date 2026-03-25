import React, { useState } from 'react';

const pieceToImage = {
  '♙': '/Chess_plt45.svg',
  '♟': '/Chess_pdt45.svg',
  '♖': '/Chess_rlt45.svg',
  '♜': '/Chess_rdt45.svg',
  '♘': '/Chess_nlt45.svg',
  '♞': '/Chess_ndt45.svg',
  '♗': '/Chess_blt45.svg',
  '♝': '/Chess_bdt45.svg',
  '♕': '/Chess_qlt45.svg',
  '♛': '/Chess_qdt45.svg',
  '♔': '/Chess_klt45.svg',
  '♚': '/Chess_kdt45.svg',
};

const Square = ({ color, piece, isSelected, isPossible, isLastMove, onSquareClick }) => {
  const [imageError, setImageError] = useState(false);
  const pieceImage = piece ? pieceToImage[piece] : null;

  const classes = ['square', color === 'white' ? 'white-square' : 'black-square'];
  if (isSelected) classes.push('selected-square');
  if (isPossible) classes.push('possible-square');
  if (isLastMove) classes.push('last-move-square');

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <button type="button" className={classes.join(' ')} onClick={onSquareClick}>
      {pieceImage && !imageError ? (
        <img
          src={pieceImage}
          alt={piece}
          className="piece-image"
          onError={handleImageError}
        />
      ) : piece ? (
        <span className="piece-text">{piece}</span>
      ) : (
        <span className="empty-slot" />
      )}
    </button>
  );
};

export default Square;