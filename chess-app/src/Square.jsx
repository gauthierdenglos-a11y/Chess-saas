import React from 'react';

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

const Square = ({ color, piece, isSelected, isPossible, onSquareClick }) => {
  const pieceImage = piece ? pieceToImage[piece] : null;

  const classes = ['square', color === 'white' ? 'white-square' : 'black-square'];
  if (isSelected) classes.push('selected-square');
  if (isPossible) classes.push('possible-square');

  return (
    <button type="button" className={classes.join(' ')} onClick={onSquareClick}>
      {pieceImage ? (
        <img src={pieceImage} alt={piece} className="piece-image" />
      ) : (
        <span className="empty-slot" />
      )}
    </button>
  );
};

export default Square;