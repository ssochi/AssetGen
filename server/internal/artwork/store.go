package artwork

// Store provides persistence for artworks.
type Store interface {
	List() ([]Artwork, error)
	Get(id string) (Artwork, error)
	Save(Artwork) error
	IncrementLikes(id string) (Artwork, error)
}
