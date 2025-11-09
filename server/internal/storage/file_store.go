package storage

import (
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/wanqilin/assetgen/server/internal/artwork"
)

// FileStore persists artworks to a json file for a simple durable MVP.
type FileStore struct {
	path string
	mu   sync.RWMutex
	data map[string]artwork.Artwork
}

func NewFileStore(path string) (*FileStore, error) {
	store := &FileStore{path: path, data: map[string]artwork.Artwork{}}
	if err := store.load(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *FileStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}

	file, err := os.OpenFile(s.path, os.O_RDONLY|os.O_CREATE, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	var items []artwork.Artwork
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&items); err != nil && !errors.Is(err, os.ErrNotExist) && !errors.Is(err, io.EOF) {
		return err
	}

	for _, it := range items {
		s.data[it.ID] = it
	}
	return nil
}

func (s *FileStore) persistLocked() error {
	items := make([]artwork.Artwork, 0, len(s.data))
	for _, art := range s.data {
		items = append(items, art)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.Before(items[j].CreatedAt)
	})

	tmpPath := s.path + ".tmp"
	buf, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(tmpPath, buf, 0o644); err != nil {
		return err
	}
	return os.Rename(tmpPath, s.path)
}

func (s *FileStore) List() ([]artwork.Artwork, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := make([]artwork.Artwork, 0, len(s.data))
	for _, art := range s.data {
		items = append(items, art)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	return items, nil
}

func (s *FileStore) Get(id string) (artwork.Artwork, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	art, ok := s.data[id]
	if !ok {
		return artwork.Artwork{}, artwork.ErrNotFound
	}
	return art, nil
}

func (s *FileStore) Save(art artwork.Artwork) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[art.ID] = art
	return s.persistLocked()
}

func (s *FileStore) IncrementLikes(id string) (artwork.Artwork, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	art, ok := s.data[id]
	if !ok {
		return artwork.Artwork{}, artwork.ErrNotFound
	}
	art.Likes++
	s.data[id] = art
	if err := s.persistLocked(); err != nil {
		return artwork.Artwork{}, err
	}
	return art, nil
}
