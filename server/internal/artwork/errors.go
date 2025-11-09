package artwork

import "errors"

var (
	ErrNotFound    = errors.New("artwork: not found")
	ErrInvalidKind = errors.New("artwork: invalid kind")
	ErrInvalidGrid = errors.New("artwork: invalid grid data")
)
