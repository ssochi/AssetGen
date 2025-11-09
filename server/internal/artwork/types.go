package artwork

import "time"

// ArtworkKind represents supported generative asset categories.
type ArtworkKind string

const (
	// KindPixelImage captures AI-generated pixel art sprites.
	KindPixelImage ArtworkKind = "pixel_image"
)

// SupportedKinds enumerates the categories the MVP can persist.
var SupportedKinds = []ArtworkKind{KindPixelImage}

func IsSupportedKind(kind ArtworkKind) bool {
	for _, k := range SupportedKinds {
		if k == kind {
			return true
		}
	}
	return false
}

// PixelColorGrid stores a flattened grid of colors in hex form to simplify rendering.
type PixelColorGrid struct {
	Size   int      `json:"size"`
	Colors []string `json:"colors"`
}

// Artwork captures the metadata needed to render and rank an asset.
type Artwork struct {
	ID           string         `json:"id"`
	Kind         ArtworkKind    `json:"kind"`
	Title        string         `json:"title"`
	Prompt       string         `json:"prompt"`
	Model        string         `json:"model"`
	Grid         PixelColorGrid `json:"grid"`
	PreviewSVG   string         `json:"previewSvg"`
	AuthorHandle string         `json:"authorHandle"`
	CreatedAt    time.Time      `json:"createdAt"`
	Likes        int            `json:"likes"`
}

// LeaderboardEntry represents aggregated scoring data for display.
type LeaderboardEntry struct {
	Artwork
	Rank int `json:"rank"`
}

// CreateArtworkInput defines the payload for new submissions.
type CreateArtworkInput struct {
	Kind         ArtworkKind    `json:"kind" binding:"required"`
	Title        string         `json:"title" binding:"required"`
	Prompt       string         `json:"prompt" binding:"required"`
	Model        string         `json:"model" binding:"required"`
	AuthorHandle string         `json:"authorHandle" binding:"required"`
	Grid         PixelColorGrid `json:"grid" binding:"required"`
	PreviewSVG   string         `json:"previewSvg"`
}

// Validate performs lightweight custom validation for CreateArtworkInput.
func (in CreateArtworkInput) Validate() error {
	if !IsSupportedKind(in.Kind) {
		return ErrInvalidKind
	}
	if in.Grid.Size <= 0 {
		return ErrInvalidGrid
	}
	expected := in.Grid.Size * in.Grid.Size
	if len(in.Grid.Colors) != expected {
		return ErrInvalidGrid
	}
	return nil
}
