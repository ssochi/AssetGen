package artwork

import (
	"sort"
	"time"

	"github.com/google/uuid"
)

// Service coordinates artwork persistence and derived queries.
type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(input CreateArtworkInput) (Artwork, error) {
	if err := input.Validate(); err != nil {
		return Artwork{}, err
	}

	art := Artwork{
		ID:           uuid.NewString(),
		Kind:         input.Kind,
		Title:        input.Title,
		Prompt:       input.Prompt,
		Model:        input.Model,
		AuthorHandle: input.AuthorHandle,
		Grid:         input.Grid,
		PreviewSVG:   input.PreviewSVG,
		CreatedAt:    time.Now().UTC(),
		Likes:        0,
	}

	if err := s.store.Save(art); err != nil {
		return Artwork{}, err
	}

	return art, nil
}

func (s *Service) List() ([]Artwork, error) {
	return s.store.List()
}

func (s *Service) Get(id string) (Artwork, error) {
	return s.store.Get(id)
}

func (s *Service) Like(id string) (Artwork, error) {
	return s.store.IncrementLikes(id)
}

func (s *Service) Leaderboard(limit int) ([]LeaderboardEntry, error) {
	all, err := s.store.List()
	if err != nil {
		return nil, err
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].Likes == all[j].Likes {
			return all[i].CreatedAt.Before(all[j].CreatedAt)
		}
		return all[i].Likes > all[j].Likes
	})
	if limit > 0 && len(all) > limit {
		all = all[:limit]
	}
	leaderboard := make([]LeaderboardEntry, len(all))
	for idx, art := range all {
		leaderboard[idx] = LeaderboardEntry{Artwork: art, Rank: idx + 1}
	}
	return leaderboard, nil
}
